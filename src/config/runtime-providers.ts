export type DataBackend = "local" | "supabase";
export type AuthProvider = "local" | "supabase";

const hasSupabaseEnvironment = Boolean(
  import.meta.env.VITE_SUPABASE_URL?.trim() &&
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim(),
);

function resolveProvider<T extends string>(
  value: string | undefined,
  fallback: T | undefined,
  allowed: readonly T[],
  environmentName: string,
) {
  const normalized = value?.trim() || fallback;
  if (!normalized) {
    throw new Error(
      `${environmentName} 未配置；生产/Supabase 环境请配置 supabase，本地演示请显式配置 local`,
    );
  }
  if (!allowed.includes(normalized as T)) {
    throw new Error(`${environmentName} 不支持值「${normalized}」`);
  }
  return normalized as T;
}

export const dataBackend: DataBackend = import.meta.env.MODE === "test"
  ? "local"
  : resolveProvider(
      import.meta.env.VITE_DATA_BACKEND,
      hasSupabaseEnvironment ? "supabase" : undefined,
      ["local", "supabase"],
      "VITE_DATA_BACKEND",
    );

export const authProvider: AuthProvider = import.meta.env.MODE === "test"
  ? "local"
  : resolveProvider(
      import.meta.env.VITE_AUTH_PROVIDER,
      hasSupabaseEnvironment ? "supabase" : undefined,
      ["local", "supabase"],
      "VITE_AUTH_PROVIDER",
    );

if (dataBackend !== authProvider) {
  throw new Error("VITE_DATA_BACKEND 与 VITE_AUTH_PROVIDER 必须使用相同运行模式");
}

if (dataBackend === "supabase" && !hasSupabaseEnvironment) {
  throw new Error("Supabase 模式缺少 VITE_SUPABASE_URL 或 VITE_SUPABASE_PUBLISHABLE_KEY");
}
