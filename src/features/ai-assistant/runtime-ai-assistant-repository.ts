import { dataBackend } from "@/config/runtime-providers";
import { LocalAiAssistantRepository } from "@/features/ai-assistant/local-ai-assistant-repository";
import { SupabaseAiAssistantRepository } from "@/features/ai-assistant/supabase-ai-assistant-repository";

export const aiAssistantRepository = dataBackend === "supabase"
  ? new SupabaseAiAssistantRepository()
  : new LocalAiAssistantRepository();
