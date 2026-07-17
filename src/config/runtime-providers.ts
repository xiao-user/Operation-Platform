export type DataBackend = "local" | "supabase";
export type AuthProvider = "local" | "supabase";

const hasSupabaseEnvironment = Boolean(
  import.meta.env.VITE_SUPABASE_URL?.trim() &&
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim(),
);

function resolveProvider<T extends string>(
  value: string | undefined,
  fallback: T,
  allowed: readonly T[],
  environmentName: string,
) {
  const normalized = value?.trim() || fallback;
  if (!allowed.includes(normalized as T)) {
    throw new Error(`${environmentName} 不支持值「${normalized}」`);
  }
  return normalized as T;
}

export const dataBackend: DataBackend = import.meta.env.MODE === "test"
  ? "local"
  : resolveProvider(
      import.meta.env.VITE_DATA_BACKEND,
      hasSupabaseEnvironment ? "supabase" : "local",
      ["local", "supabase"],
      "VITE_DATA_BACKEND",
    );

export const authProvider: AuthProvider = import.meta.env.MODE === "test"
  ? "local"
  : resolveProvider(
      import.meta.env.VITE_AUTH_PROVIDER,
      hasSupabaseEnvironment ? "supabase" : "local",
      ["local", "supabase"],
      "VITE_AUTH_PROVIDER",
    );
