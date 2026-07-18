import type { AiAssistantRepository } from "@/features/ai-assistant/ai-assistant-repository";
import type {
  AiAssistantIdentity,
  AiAssistantMessage,
  AiAssistantSession,
  AiAssistantStreamCallbacks,
  SendAiAssistantMessageInput,
} from "@/features/ai-assistant/types";

let sequence = 0;

export class LocalAiAssistantRepository implements AiAssistantRepository {
  private readonly sessionsByIdentity = new Map<string, AiAssistantSession[]>();

  async listSessions(identity: AiAssistantIdentity) {
    return this.sessions(identity).map(cloneSession);
  }

  async loadMessages(identity: AiAssistantIdentity, conversationId: string) {
    const session = this.ownedSession(identity, conversationId);
    return session.messages.map(cloneMessage);
  }

  async sendMessage(input: SendAiAssistantMessageInput, callbacks?: AiAssistantStreamCallbacks) {
    const sessions = this.sessions(input);
    let session = input.conversationId
      ? this.ownedSession(input, input.conversationId)
      : null;
    const now = new Date().toISOString();
    if (!session) {
      session = {
        id: nextId("conversation"),
        tenantId: input.tenantId,
        userId: input.userId,
        title: input.content.slice(0, 28),
        model: "local-demo",
        createdAt: now,
        updatedAt: now,
        lastMessageAt: now,
        messages: [],
      };
      sessions.unshift(session);
    }
    const userMessage = createMessage(session.id, "user", input.content, now);
    const contextSummary = input.pageContext
      ? `本地演示模式已读取“${input.pageContext.page.title}”的页面上下文。`
      : "本问题未使用页面上下文。";
    const assistantContent = [
      `## 页面上下文\n\n${contextSummary}`,
      "\n\n- 会话已建立\n- Supabase 模式将由 DeepSeek 生成真实回复",
      "\n\n公式示例：$a^2+b^2=c^2$",
    ].join("");
    const assistantMessage = createMessage(
      session.id,
      "assistant",
      "",
      new Date().toISOString(),
    );
    assistantMessage.status = "pending";
    session.messages.push(userMessage, assistantMessage);
    callbacks?.onStart({
      conversation: cloneSession(session),
      messages: [cloneMessage(userMessage), cloneMessage(assistantMessage)],
    });
    for (const chunk of chunkText(assistantContent, 12)) {
      assistantMessage.content += chunk;
      callbacks?.onDelta(chunk);
      await delay(12);
    }
    assistantMessage.status = "completed";
    session.lastMessageAt = assistantMessage.createdAt;
    session.updatedAt = assistantMessage.createdAt;
    return {
      conversation: cloneSession(session),
      messages: [cloneMessage(userMessage), cloneMessage(assistantMessage)],
    };
  }

  async renameSession(identity: AiAssistantIdentity, conversationId: string, title: string) {
    const session = this.ownedSession(identity, conversationId);
    session.title = title;
    session.updatedAt = new Date().toISOString();
  }

  async deleteSession(identity: AiAssistantIdentity, conversationId: string) {
    const sessions = this.sessions(identity);
    const index = sessions.findIndex((session) => session.id === conversationId);
    if (index < 0) throw new Error("会话不存在");
    sessions.splice(index, 1);
  }

  private sessions(identity: AiAssistantIdentity) {
    const key = `${identity.userId}:${identity.tenantId}`;
    const sessions = this.sessionsByIdentity.get(key) ?? [];
    this.sessionsByIdentity.set(key, sessions);
    return sessions;
  }

  private ownedSession(identity: AiAssistantIdentity, conversationId: string) {
    const session = this.sessions(identity).find((item) => item.id === conversationId);
    if (!session) throw new Error("会话不存在或无权访问");
    return session;
  }
}

function chunkText(content: string, size: number) {
  const chunks: string[] = [];
  for (let index = 0; index < content.length; index += size) {
    chunks.push(content.slice(index, index + size));
  }
  return chunks;
}

function createMessage(
  conversationId: string,
  role: AiAssistantMessage["role"],
  content: string,
  createdAt: string,
): AiAssistantMessage {
  return {
    id: nextId("message"),
    conversationId,
    role,
    status: "completed",
    content,
    model: role === "assistant" ? "local-demo" : null,
    inputTokens: null,
    outputTokens: null,
    createdAt,
  };
}

function nextId(prefix: string) {
  sequence += 1;
  return `local-ai-${prefix}-${sequence}`;
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function cloneMessage(message: AiAssistantMessage): AiAssistantMessage {
  return { ...message };
}

function cloneSession(session: AiAssistantSession): AiAssistantSession {
  return { ...session, messages: session.messages.map(cloneMessage) };
}
