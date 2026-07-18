import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { aiAssistantRepository } from "@/features/ai-assistant/runtime-ai-assistant-repository";
import type {
  AiAssistantMessage,
  AiAssistantSession,
  SendAiAssistantMessageResult,
} from "@/features/ai-assistant/types";
import { useAiAssistantStore } from "@/stores/ai-assistant";

describe("AI assistant store", () => {
  beforeEach(() => setActivePinia(createPinia()));
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("keeps the current page context in the assistant reply", async () => {
    const store = useAiAssistantStore();
    await store.initialize({ tenantId: "school-context", userId: "user-context" });
    store.setPageContext({
      schemaVersion: 1,
      collectedAt: new Date().toISOString(),
      route: { path: "/workbench", name: "workbench" },
      tenant: { id: "school-001", name: "测试学校", type: "school" },
      navigation: { module: "工作台", trail: [] },
      page: {
        title: "运营工作台",
        headings: ["运营工作台"],
        text: "今日共有 12 项待办",
        structuredData: null,
        source: "page",
      },
    });

    await store.sendMessage("总结当前页面");

    expect(store.messages).toHaveLength(2);
    expect(store.messages[0]?.content).toBe("总结当前页面");
    expect(store.messages[1]?.content).toContain("运营工作台");
  });

  it("does not send page context for a generic conversation turn", async () => {
    const sendMessage = vi.spyOn(aiAssistantRepository, "sendMessage");
    const store = useAiAssistantStore();
    await store.initialize({ tenantId: "school-no-context", userId: "user-no-context" });
    store.setPageContext({
      schemaVersion: 1,
      collectedAt: new Date().toISOString(),
      route: { path: "/workbench", name: "workbench" },
      tenant: { id: "school-no-context", name: "测试学校", type: "school" },
      navigation: { module: "工作台", trail: [] },
      page: {
        title: "运营工作台",
        headings: ["运营工作台"],
        text: "今日共有 12 项待办",
        structuredData: null,
        source: "page",
      },
    });

    await store.sendMessage("如何设计招生审核流程");

    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ pageContext: null }),
      expect.any(Object),
    );
  });

  it("closes expanded mode together with the sidebar", () => {
    const store = useAiAssistantStore();
    store.open();
    store.toggleExpanded();
    store.close();

    expect(store.isOpen).toBe(false);
    expect(store.isExpanded).toBe(false);
  });

  it("keeps independent conversations in the history list", async () => {
    const store = useAiAssistantStore();
    await store.initialize({ tenantId: "school-history", userId: "user-history" });
    await store.sendMessage("总结当前页面");
    const firstSessionId = store.activeSessionId;
    expect(firstSessionId).not.toBeNull();

    store.newConversation();
    await store.sendMessage("生成运营建议");

    expect(store.sessions).toHaveLength(2);
    expect(store.activeSession?.title).toBe("生成运营建议");
    await store.switchSession(firstSessionId!);
    expect(store.messages[0]?.content).toBe("总结当前页面");
  });

  it("isolates conversations by user and tenant", async () => {
    const store = useAiAssistantStore();
    await store.initialize({ tenantId: "school-a", userId: "user-a" });
    await store.sendMessage("用户 A 的会话");

    await store.initialize({ tenantId: "school-a", userId: "user-b" });
    expect(store.sessions).toHaveLength(0);

    await store.initialize({ tenantId: "school-b", userId: "user-a" });
    expect(store.sessions).toHaveLength(0);

    await store.initialize({ tenantId: "school-a", userId: "user-a" });
    expect(store.sessions[0]?.title).toBe("用户 A 的会话");
  });

  it("retries initialization for the same identity after a failed history request", async () => {
    const listSessions = vi.spyOn(aiAssistantRepository, "listSessions")
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce([]);
    const store = useAiAssistantStore();
    const identity = { tenantId: "tenant-retry", userId: "user-retry" };

    await store.initialize(identity);
    expect(store.errorMessage).toBe("temporary failure");

    await store.initialize(identity);
    expect(listSessions).toHaveBeenCalledTimes(2);
    expect(store.errorMessage).toBe("");
  });

  it("retries initialization when the active conversation messages fail to load", async () => {
    const result = assistantResult("tenant-message-retry", "user-message-retry", "历史提问");
    vi.spyOn(aiAssistantRepository, "listSessions").mockResolvedValue([result.conversation]);
    const loadMessages = vi.spyOn(aiAssistantRepository, "loadMessages")
      .mockRejectedValueOnce(new Error("message failure"))
      .mockResolvedValueOnce(result.messages);
    const store = useAiAssistantStore();
    const identity = { tenantId: "tenant-message-retry", userId: "user-message-retry" };

    await store.initialize(identity);
    expect(store.errorMessage).toBe("message failure");

    await store.initialize(identity);
    expect(loadMessages).toHaveBeenCalledTimes(2);
    expect(store.messages).toEqual(result.messages);
    expect(store.errorMessage).toBe("");
  });

  it("ignores a completed stream after the active identity changes", async () => {
    const pending = deferred<void>();
    vi.spyOn(aiAssistantRepository, "sendMessage").mockImplementation(async (input, callbacks) => {
      const result = assistantResult(input.tenantId, input.userId, input.content);
      callbacks?.onStart({
        conversation: result.conversation,
        messages: [result.messages[0]!, { ...result.messages[1]!, status: "pending", content: "" }],
      });
      await pending.promise;
      callbacks?.onDelta("不应进入新租户");
      return result;
    });
    const store = useAiAssistantStore();
    await store.initialize({ tenantId: "tenant-a", userId: "user-a" });
    const sending = store.sendMessage("租户 A 的问题");

    await store.initialize({ tenantId: "tenant-b", userId: "user-b" });
    pending.resolve();
    await sending;

    expect(store.sessions).toEqual([]);
    expect(store.activeSessionId).toBeNull();
  });

  it("batches rapid stream deltas before updating the rendered message", async () => {
    vi.useFakeTimers();
    const pending = deferred<void>();
    vi.spyOn(aiAssistantRepository, "sendMessage").mockImplementation(async (input, callbacks) => {
      const result = assistantResult(input.tenantId, input.userId, input.content, "第一段第二段第三段");
      callbacks?.onStart({
        conversation: result.conversation,
        messages: [result.messages[0]!, { ...result.messages[1]!, status: "pending", content: "" }],
      });
      callbacks?.onDelta("第一段");
      callbacks?.onDelta("第二段");
      callbacks?.onDelta("第三段");
      await pending.promise;
      return result;
    });
    const store = useAiAssistantStore();
    await store.initialize({ tenantId: "tenant-stream", userId: "user-stream" });
    const sending = store.sendMessage("流式问题");
    await Promise.resolve();

    expect(store.messages[1]?.content).toBe("");
    await vi.advanceTimersByTimeAsync(32);
    expect(store.messages[1]?.content).toBe("第一段第二段第三段");
    pending.resolve();
    await sending;
    expect(store.messages[1]?.status).toBe("completed");
  });

  it("writes each streamed reply to the assistant message created for that turn", async () => {
    vi.useFakeTimers();
    const pendingReplies = [deferred<void>(), deferred<void>()];
    let turn = 0;
    vi.spyOn(aiAssistantRepository, "sendMessage").mockImplementation(async (input, callbacks) => {
      const currentTurn = turn++;
      const answer = currentTurn === 0 ? "12345678" : "ABCDEFG";
      const result = assistantResult(
        input.tenantId,
        input.userId,
        input.content,
        answer,
        String(currentTurn),
      );
      callbacks?.onStart({
        conversation: result.conversation,
        messages: [result.messages[0]!, { ...result.messages[1]!, status: "pending", content: "" }],
      });
      callbacks?.onDelta(answer);
      await pendingReplies[currentTurn]!.promise;
      return result;
    });
    const store = useAiAssistantStore();
    await store.initialize({ tenantId: "tenant-turns", userId: "user-turns" });

    const firstSend = store.sendMessage("第一次提问");
    await vi.advanceTimersByTimeAsync(32);
    expect(store.messages[1]?.content).toBe("12345678");
    pendingReplies[0]!.resolve();
    await firstSend;

    const secondSend = store.sendMessage("第二次提问");
    await vi.advanceTimersByTimeAsync(32);
    expect(store.messages.map((message) => message.content)).toEqual([
      "第一次提问",
      "12345678",
      "第二次提问",
      "ABCDEFG",
    ]);
    pendingReplies[1]!.resolve();
    await secondSend;

    expect(store.messages.map((message) => message.content)).toEqual([
      "第一次提问",
      "12345678",
      "第二次提问",
      "ABCDEFG",
    ]);
  });

  it("does not delete the conversation that owns an active stream", async () => {
    const pending = deferred<void>();
    vi.spyOn(aiAssistantRepository, "sendMessage").mockImplementation(async (input, callbacks) => {
      const result = assistantResult(input.tenantId, input.userId, input.content);
      callbacks?.onStart({
        conversation: result.conversation,
        messages: [result.messages[0]!, { ...result.messages[1]!, status: "pending", content: "" }],
      });
      await pending.promise;
      return result;
    });
    const deleteSession = vi.spyOn(aiAssistantRepository, "deleteSession");
    const store = useAiAssistantStore();
    await store.initialize({ tenantId: "tenant-delete", userId: "user-delete" });

    const sending = store.sendMessage("正在生成的提问");
    await Promise.resolve();
    await store.deleteSession(store.activeSessionId!);

    expect(deleteSession).not.toHaveBeenCalled();
    expect(store.errorMessage).toBe("当前会话正在生成回复，暂时不能删除");
    pending.resolve();
    await sending;
  });
});

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

function assistantResult(
  tenantId: string,
  userId: string,
  question: string,
  answer = "回复",
  idSuffix = "0",
): SendAiAssistantMessageResult {
  const now = new Date().toISOString();
  const conversation: AiAssistantSession = {
    id: `conversation-${tenantId}`,
    tenantId,
    userId,
    title: question,
    model: "test-model",
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    messages: [],
  };
  const messages: AiAssistantMessage[] = [
    {
      id: `user-${tenantId}-${idSuffix}`,
      conversationId: conversation.id,
      role: "user",
      status: "completed",
      content: question,
      model: null,
      inputTokens: null,
      outputTokens: null,
      createdAt: now,
    },
    {
      id: `assistant-${tenantId}-${idSuffix}`,
      conversationId: conversation.id,
      role: "assistant",
      status: "completed",
      content: answer,
      model: "test-model",
      inputTokens: null,
      outputTokens: null,
      createdAt: now,
    },
  ];
  return { conversation, messages };
}
