import type {
  AiAssistantIdentity,
  AiAssistantMessage,
  AiAssistantSession,
  AiAssistantStreamCallbacks,
  SendAiAssistantMessageInput,
  SendAiAssistantMessageResult,
} from "@/features/ai-assistant/types";

export interface AiAssistantRepository {
  listSessions(identity: AiAssistantIdentity): Promise<AiAssistantSession[]>;
  loadMessages(identity: AiAssistantIdentity, conversationId: string): Promise<AiAssistantMessage[]>;
  sendMessage(
    input: SendAiAssistantMessageInput,
    callbacks?: AiAssistantStreamCallbacks,
  ): Promise<SendAiAssistantMessageResult>;
  renameSession(identity: AiAssistantIdentity, conversationId: string, title: string): Promise<void>;
  deleteSession(identity: AiAssistantIdentity, conversationId: string): Promise<void>;
}
