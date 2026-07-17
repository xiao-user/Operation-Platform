import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { authProvider } from "@/config/runtime-providers";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
const isSupabaseConfigured = Boolean(supabaseUrl && publishableKey);

export const isSupabaseAuthEnabled = Boolean(
  authProvider === "supabase" && isSupabaseConfigured,
);

let client: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (!isSupabaseConfigured || !supabaseUrl || !publishableKey) {
    throw new Error("Supabase 浏览器环境变量未配置");
  }
  client ??= createClient(supabaseUrl, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}
