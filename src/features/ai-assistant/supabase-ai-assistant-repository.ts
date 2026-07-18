import { getSupabaseClient, getSupabaseFunctionRequest } from "@/lib/supabase";
import type { AiAssistantRepository } from "@/features/ai-assistant/ai-assistant-repository";
import type {
  AiAssistantIdentity,
  AiAssistantMessage,
  AiAssistantMessageRole,
  AiAssistantMessageStatus,
  AiAssistantSession,
  AiAssistantStreamCallbacks,
  SendAiAssistantMessageInput,
  SendAiAssistantMessageResult,
} from "@/features/ai-assistant/types";

interface ConversationRow {
  id: string;
  tenant_id: string;
  auth_user_id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  role: AiAssistantMessageRole;
  status: AiAssistantMessageStatus;
  content: string;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
  sequence_number: number;
}

interface AssistantFunctionResponse {
  conversation: ConversationRow;
  messages: MessageRow[];
}

type AssistantStreamEvent =
  | ({ type: "start" } & AssistantFunctionResponse)
  | { type: "delta"; delta: string }
  | ({ type: "done" } & AssistantFunctionResponse)
  | { type: "error"; error: string };

const STALE_PENDING_MESSAGE_MS = 15 * 60_000;
const MAX_SESSION_COUNT = 50;
const MAX_MESSAGE_COUNT = 200;

const conversationColumns = [
  "id",
  "tenant_id",
  "auth_user_id",
  "title",
  "model",
  "created_at",
  "updated_at",
  "last_message_at",
].join(",");
const messageColumns = [
  "id",
  "conversation_id",
  "role",
  "status",
  "content",
  "model",
  "input_tokens",
  "output_tokens",
  "created_at",
  "sequence_number",
].join(",");

export class SupabaseAiAssistantRepository implements AiAssistantRepository {
  async listSessions(identity: AiAssistantIdentity) {
    const { data, error } = await getSupabaseClient()
      .from("ai_conversations")
      .select(conversationColumns)
      .eq("tenant_id", identity.tenantId)
      .eq("auth_user_id", identity.userId)
      .order("last_message_at", { ascending: false })
      .limit(MAX_SESSION_COUNT);
    if (error) throw new Error(error.message || "AI 会话读取失败");
    return (data as unknown as ConversationRow[]).map(toSession);
  }

  async loadMessages(identity: AiAssistantIdentity, conversationId: string) {
    const { data, error } = await getSupabaseClient()
      .from("ai_messages")
      .select(messageColumns)
      .eq("conversation_id", conversationId)
      .eq("tenant_id", identity.tenantId)
      .eq("auth_user_id", identity.userId)
      .order("sequence_number", { ascending: false })
      .limit(MAX_MESSAGE_COUNT);
    if (error) throw new Error(error.message || "AI 消息读取失败");
    return (data as unknown as MessageRow[]).reverse().map(toMessage);
  }

  async sendMessage(input: SendAiAssistantMessageInput, callbacks?: AiAssistantStreamCallbacks) {
    const client = getSupabaseClient();
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError || !sessionData.session) throw new Error("登录状态已失效，请重新登录");
    const request = getSupabaseFunctionRequest("ai-assistant");
    const response = await request.fetch(request.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
        apikey: request.publishableKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        content: input.content,
        capability: input.capability,
        pageContext: input.pageContext,
      }),
    });
    if (!response.ok) throw new Error(await responseError(response));
    if (!response.body) throw new Error("当前浏览器不支持流式响应");

    let completed: SendAiAssistantMessageResult | null = null;
    await readNdjsonStream(response.body, (event) => {
      if (event.type === "error") throw new Error(event.error || "AI 助手请求失败");
      if (event.type === "delta") {
        if (event.delta) callbacks?.onDelta(event.delta);
        return;
      }
      const result = toResult(event);
      if (event.type === "start") callbacks?.onStart(result);
      else completed = result;
    });
    if (!completed) throw new Error("AI 助手流式响应未正常结束");
    return completed;
  }

  async renameSession(identity: AiAssistantIdentity, conversationId: string, title: string) {
    const { error } = await getSupabaseClient()
      .from("ai_conversations")
      .update({ title })
      .eq("id", conversationId)
      .eq("tenant_id", identity.tenantId)
      .eq("auth_user_id", identity.userId);
    if (error) throw new Error(error.message || "会话重命名失败");
  }

  async deleteSession(identity: AiAssistantIdentity, conversationId: string) {
    const { error } = await getSupabaseClient()
      .from("ai_conversations")
      .delete()
      .eq("id", conversationId)
      .eq("tenant_id", identity.tenantId)
      .eq("auth_user_id", identity.userId);
    if (error) throw new Error(error.message || "会话删除失败");
  }
}

async function readNdjsonStream(
  stream: ReadableStream<Uint8Array>,
  consume: (event: AssistantStreamEvent) => void,
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.trim()) consume(JSON.parse(line) as AssistantStreamEvent);
      }
      if (done) break;
    }
    if (buffer.trim()) consume(JSON.parse(buffer) as AssistantStreamEvent);
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
}

function toResult(response: AssistantFunctionResponse): SendAiAssistantMessageResult {
  if (!response.conversation || !Array.isArray(response.messages)) {
    throw new Error("AI 助手返回格式无效");
  }
  return {
    conversation: toSession(response.conversation),
    messages: response.messages.map(toMessage),
  };
}

async function responseError(response: Response) {
  try {
    const payload = await response.json() as { error?: unknown; message?: unknown };
    const message = payload.error ?? payload.message;
    return typeof message === "string" && message ? message : `AI 助手请求失败（${response.status}）`;
  } catch {
    return `AI 助手请求失败（${response.status}）`;
  }
}

function toSession(row: ConversationRow): AiAssistantSession {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.auth_user_id,
    title: row.title,
    model: row.model,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at,
    messages: [],
  };
}

function toMessage(row: MessageRow): AiAssistantMessage {
  const isStalePending = row.status === "pending"
    && Date.now() - Date.parse(row.created_at) >= STALE_PENDING_MESSAGE_MS;
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    status: isStalePending ? "failed" : row.status,
    content: isStalePending && !row.content ? "生成已中断，请重新提问。" : row.content,
    model: row.model,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    createdAt: row.created_at,
  };
}
