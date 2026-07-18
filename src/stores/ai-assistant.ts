import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { aiAssistantRepository } from "@/features/ai-assistant/runtime-ai-assistant-repository";
import {
  shouldIncludeAssistantPageContext,
  type AssistantPageContext,
} from "@/features/ai-assistant/page-context";
import type {
  AiAssistantIdentity,
  AiAssistantMessage,
  AiAssistantSession,
  SendAiAssistantMessageResult,
} from "@/features/ai-assistant/types";

let optimisticSequence = 0;

export const useAiAssistantStore = defineStore("ai-assistant", () => {
  const isOpen = ref(false);
  const isExpanded = ref(false);
  const isHistoryRailVisible = ref(true);
  const contextLoading = ref(false);
  const historyLoading = ref(false);
  const messageLoading = ref(false);
  const sending = ref(false);
  const errorMessage = ref("");
  const pageContext = ref<AssistantPageContext | null>(null);
  const sessions = ref<AiAssistantSession[]>([]);
  const activeSessionId = ref<string | null>(null);
  const identity = ref<AiAssistantIdentity | null>(null);
  let loadRequestId = 0;
  let messageRequestId = 0;
  let sendRequestId = 0;
  let initializedIdentityKey: string | null = null;
  let pendingInitializationKey: string | null = null;
  let sendingSessionId: string | null = null;

  const activeSession = computed(() =>
    sessions.value.find((session) => session.id === activeSessionId.value) ?? null,
  );
  const messages = computed(() => activeSession.value?.messages ?? []);
  const hasConversation = computed(() => messages.value.length > 0);

  function open() {
    isOpen.value = true;
  }

  function close() {
    isOpen.value = false;
    isExpanded.value = false;
  }

  function toggle() {
    if (isOpen.value) close();
    else open();
  }

  function toggleExpanded() {
    isExpanded.value = !isExpanded.value;
  }

  function toggleHistoryRail() {
    isHistoryRailVisible.value = !isHistoryRailVisible.value;
  }

  async function initialize(nextIdentity: AiAssistantIdentity, force = false) {
    const nextIdentityKey = identityKey(nextIdentity);
    const sameIdentity = identity.value?.tenantId === nextIdentity.tenantId
      && identity.value?.userId === nextIdentity.userId;
    if (
      sameIdentity
      && !force
      && (initializedIdentityKey === nextIdentityKey || pendingInitializationKey === nextIdentityKey)
    ) return;
    if (!sameIdentity) {
      sendRequestId += 1;
      sending.value = false;
      sendingSessionId = null;
      initializedIdentityKey = null;
      pageContext.value = null;
    }
    const requestId = ++loadRequestId;
    pendingInitializationKey = nextIdentityKey;
    identity.value = { ...nextIdentity };
    historyLoading.value = true;
    errorMessage.value = "";
    try {
      const loadedSessions = await aiAssistantRepository.listSessions(nextIdentity);
      if (requestId !== loadRequestId) return;
      sessions.value = loadedSessions;
      const nextActiveId = sameIdentity && loadedSessions.some((item) => item.id === activeSessionId.value)
        ? activeSessionId.value
        : loadedSessions[0]?.id ?? null;
      activeSessionId.value = nextActiveId;
      const messagesLoaded = nextActiveId ? await loadMessages(nextActiveId, requestId) : true;
      if (requestId === loadRequestId && messagesLoaded) initializedIdentityKey = nextIdentityKey;
    } catch (error) {
      if (requestId === loadRequestId) {
        initializedIdentityKey = null;
        sessions.value = [];
        activeSessionId.value = null;
        errorMessage.value = errorText(error, "AI 会话读取失败");
      }
    } finally {
      if (requestId === loadRequestId) {
        pendingInitializationKey = null;
        historyLoading.value = false;
      }
    }
  }

  function newConversation() {
    activeSessionId.value = null;
    errorMessage.value = "";
  }

  async function switchSession(sessionId: string) {
    if (!identity.value || !sessions.value.some((session) => session.id === sessionId)) return;
    if (activeSessionId.value === sessionId) return;
    activeSessionId.value = sessionId;
    errorMessage.value = "";
    if (sendingSessionId === sessionId) return;
    await loadMessages(sessionId, loadRequestId);
  }

  async function renameSession(sessionId: string, title: string) {
    const nextTitle = title.trim();
    const currentIdentity = identity.value;
    const session = sessions.value.find((item) => item.id === sessionId);
    if (!currentIdentity || !session || !nextTitle) return;
    const previousTitle = session.title;
    session.title = nextTitle;
    try {
      await aiAssistantRepository.renameSession(currentIdentity, sessionId, nextTitle);
    } catch (error) {
      session.title = previousTitle;
      errorMessage.value = errorText(error, "会话重命名失败");
    }
  }

  async function deleteSession(sessionId: string) {
    const currentIdentity = identity.value;
    if (!currentIdentity) return;
    if (sendingSessionId === sessionId) {
      errorMessage.value = "当前会话正在生成回复，暂时不能删除";
      return;
    }
    try {
      await aiAssistantRepository.deleteSession(currentIdentity, sessionId);
      sessions.value = sessions.value.filter((session) => session.id !== sessionId);
      if (activeSessionId.value === sessionId) {
        activeSessionId.value = sessions.value[0]?.id ?? null;
        if (activeSessionId.value) await loadMessages(activeSessionId.value, loadRequestId);
      }
    } catch (error) {
      errorMessage.value = errorText(error, "会话删除失败");
    }
  }

  function setPageContext(context: AssistantPageContext | null) {
    pageContext.value = context;
  }

  async function sendMessage(content: string, capability: string | null = null) {
    const text = content.trim();
    const currentIdentity = identity.value;
    if (!text || !currentIdentity || sending.value) return false;
    errorMessage.value = "";
    sending.value = true;
    const requestId = ++sendRequestId;
    const persistedSession = activeSession.value;
    const optimisticSession = persistedSession
      ? null
      : createOptimisticSession(currentIdentity, text);
    if (optimisticSession) sessions.value.unshift(optimisticSession);
    const draft = persistedSession ?? sessions.value[0]!;
    if (optimisticSession) activeSessionId.value = draft.id;
    sendingSessionId = draft.id;
    const messageOffset = draft.messages.length;
    const optimisticMessages = createOptimisticMessages(draft.id, text);
    draft.messages.push(...optimisticMessages);
    let streamedAssistantId = optimisticMessages[1]?.id ?? null;
    let pendingDelta = "";
    let cancelScheduledRender: (() => void) | null = null;
    const isCurrentRequest = () => requestId === sendRequestId
      && sameIdentity(identity.value, currentIdentity);
    const commitPendingDelta = () => {
      if (!pendingDelta) return;
      if (!isCurrentRequest() || !streamedAssistantId) {
        pendingDelta = "";
        return;
      }
      const streamedAssistant = draft.messages.find((message) => message.id === streamedAssistantId);
      if (streamedAssistant) streamedAssistant.content += pendingDelta;
      pendingDelta = "";
    };
    const flushPendingRender = () => {
      cancelScheduledRender?.();
      cancelScheduledRender = null;
      commitPendingDelta();
    };
    const discardPendingRender = () => {
      cancelScheduledRender?.();
      cancelScheduledRender = null;
      pendingDelta = "";
    };
    const scheduleDelta = (delta: string) => {
      pendingDelta += delta;
      if (cancelScheduledRender) return;
      cancelScheduledRender = scheduleRenderFrame(() => {
        cancelScheduledRender = null;
        commitPendingDelta();
      });
    };

    try {
      const result = await aiAssistantRepository.sendMessage({
        ...currentIdentity,
        conversationId: persistedSession?.id ?? null,
        content: text,
        capability,
        pageContext: shouldIncludeAssistantPageContext(
          text,
          capability,
          pageContext.value?.page.title,
        )
          ? pageContext.value
          : null,
      }, {
        onStart(started) {
          if (!isCurrentRequest()) return;
          const wasActive = activeSessionId.value === draft.id;
          const startedAssistant = started.messages.find((message) => message.role === "assistant");
          if (!startedAssistant) throw new Error("AI 助手返回格式无效");
          const saved = applySavedResult(draft, messageOffset, started);
          streamedAssistantId = startedAssistant.id;
          sendingSessionId = saved.id;
          if (wasActive) activeSessionId.value = saved.id;
        },
        onDelta(delta) {
          if (isCurrentRequest()) scheduleDelta(delta);
        },
      });
      flushPendingRender();
      if (!isCurrentRequest()) return true;
      const sessionIndex = sessions.value.findIndex((session) =>
        session === draft || session.id === draft.id || session.id === result.conversation.id,
      );
      const wasActive = activeSessionId.value === draft.id;
      const savedSession = applySavedResult(draft, messageOffset, result);
      if (sessionIndex >= 0) sessions.value.splice(sessionIndex, 1, savedSession);
      else sessions.value.unshift(savedSession);
      if (wasActive) activeSessionId.value = savedSession.id;
      sessions.value.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
      return true;
    } catch (error) {
      discardPendingRender();
      if (!isCurrentRequest()) return false;
      errorMessage.value = errorText(error, "AI 助手请求失败");
      await initialize(currentIdentity, true);
      return false;
    } finally {
      if (requestId === sendRequestId) {
        sending.value = false;
        sendingSessionId = null;
      }
    }
  }

  async function loadMessages(sessionId: string, requestId: number) {
    const currentIdentity = identity.value;
    const session = sessions.value.find((item) => item.id === sessionId);
    if (!currentIdentity || !session) return false;
    const currentMessageRequestId = ++messageRequestId;
    messageLoading.value = true;
    let applied = false;
    try {
      const loadedMessages = await aiAssistantRepository.loadMessages(currentIdentity, sessionId);
      if (
        requestId === loadRequestId
        && currentMessageRequestId === messageRequestId
        && activeSessionId.value === sessionId
      ) {
        session.messages = loadedMessages;
        applied = true;
      }
    } catch (error) {
      if (requestId === loadRequestId && currentMessageRequestId === messageRequestId) {
        errorMessage.value = errorText(error, "AI 消息读取失败");
      }
    } finally {
      if (requestId === loadRequestId && currentMessageRequestId === messageRequestId) {
        messageLoading.value = false;
      }
    }
    return applied;
  }

  return {
    isOpen,
    isExpanded,
    isHistoryRailVisible,
    contextLoading,
    historyLoading,
    messageLoading,
    sending,
    errorMessage,
    pageContext,
    sessions,
    activeSessionId,
    activeSession,
    messages,
    hasConversation,
    open,
    close,
    toggle,
    toggleExpanded,
    toggleHistoryRail,
    initialize,
    newConversation,
    switchSession,
    renameSession,
    deleteSession,
    setPageContext,
    sendMessage,
  };
});

function applySavedResult(
  draft: AiAssistantSession,
  messageOffset: number,
  result: SendAiAssistantMessageResult,
) {
  const previousMessages = draft.messages.slice(0, messageOffset);
  Object.assign(draft, result.conversation, {
    messages: [...previousMessages, ...result.messages],
  });
  return draft;
}

function createOptimisticSession(identity: AiAssistantIdentity, title: string): AiAssistantSession {
  const now = new Date().toISOString();
  return {
    id: nextOptimisticId("conversation"),
    tenantId: identity.tenantId,
    userId: identity.userId,
    title: title.slice(0, 28),
    model: "deepseek-v4-flash",
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    messages: [],
  };
}

function createOptimisticMessages(conversationId: string, content: string): AiAssistantMessage[] {
  const now = new Date().toISOString();
  return [
    {
      id: nextOptimisticId("user"),
      conversationId,
      role: "user",
      status: "completed",
      content,
      model: null,
      inputTokens: null,
      outputTokens: null,
      createdAt: now,
    },
    {
      id: nextOptimisticId("assistant"),
      conversationId,
      role: "assistant",
      status: "pending",
      content: "",
      model: "deepseek-v4-flash",
      inputTokens: null,
      outputTokens: null,
      createdAt: now,
    },
  ];
}

function nextOptimisticId(kind: string) {
  optimisticSequence += 1;
  return `optimistic-${kind}-${optimisticSequence}`;
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function sameIdentity(
  first: AiAssistantIdentity | null,
  second: AiAssistantIdentity | null,
) {
  return Boolean(
    first
    && second
    && first.tenantId === second.tenantId
    && first.userId === second.userId,
  );
}

function identityKey(identity: AiAssistantIdentity) {
  return `${identity.userId}:${identity.tenantId}`;
}

function scheduleRenderFrame(callback: () => void) {
  if (typeof requestAnimationFrame === "function") {
    const frameId = requestAnimationFrame(callback);
    return () => cancelAnimationFrame(frameId);
  }
  const timerId = setTimeout(callback, 16);
  return () => clearTimeout(timerId);
}
