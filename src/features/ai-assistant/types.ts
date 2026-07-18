import type { AssistantPageContext } from "@/features/ai-assistant/page-context";

export type AiAssistantMessageRole = "user" | "assistant";
export type AiAssistantMessageStatus = "pending" | "completed" | "failed";

export interface AiAssistantMessage {
  id: string;
  conversationId: string;
  role: AiAssistantMessageRole;
  status: AiAssistantMessageStatus;
  content: string;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  createdAt: string;
}

export interface AiAssistantSession {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  messages: AiAssistantMessage[];
}

export interface AiAssistantIdentity {
  tenantId: string;
  userId: string;
}

export interface SendAiAssistantMessageInput extends AiAssistantIdentity {
  conversationId: string | null;
  content: string;
  capability: string | null;
  pageContext: AssistantPageContext | null;
}

export interface SendAiAssistantMessageResult {
  conversation: AiAssistantSession;
  messages: AiAssistantMessage[];
}

export interface AiAssistantStreamCallbacks {
  onStart(result: SendAiAssistantMessageResult): void;
  onDelta(delta: string): void;
}
