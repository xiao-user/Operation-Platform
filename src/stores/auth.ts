import { computed, ref } from "vue";
import { defineStore } from "pinia";
import type { Session, Subscription } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseAuthEnabled } from "@/lib/supabase";
import { setSupabaseAuthFailureHandler } from "@/lib/supabase-auth-failure";

const SESSION_EXPIRED_MESSAGE = "登录状态已超时，请重新登录";

export const useAuthStore = defineStore("auth", () => {
  const session = ref<Session | null>(null);
  const initialized = ref(!isSupabaseAuthEnabled);
  const loading = ref(false);
  const changingPassword = ref(false);
  const authStateVersion = ref(0);
  const errorMessage = ref("");
  const isAuthenticated = computed(() => !isSupabaseAuthEnabled || Boolean(session.value));
  const canChangePassword = computed(() =>
    isSupabaseAuthEnabled && Boolean(session.value?.user.email),
  );
  let authSubscription: Subscription | null = null;
  let initializePromise: Promise<void> | null = null;
  let expiringSession = false;

  async function expireSession() {
    if (!isSupabaseAuthEnabled || expiringSession) return;
    expiringSession = true;
    const previousUserId = session.value?.user.id ?? null;
    session.value = null;
    errorMessage.value = SESSION_EXPIRED_MESSAGE;
    if (previousUserId) authStateVersion.value += 1;
    try {
      await getSupabaseClient().auth.signOut({ scope: "local" });
    } catch {
      // The local auth state is already invalidated; remote revocation is unnecessary here.
    } finally {
      expiringSession = false;
    }
  }

  setSupabaseAuthFailureHandler(() => {
    void expireSession();
  });

  function subscribeToAuthChanges() {
    if (!isSupabaseAuthEnabled || authSubscription) return;
    const { data } = getSupabaseClient().auth.onAuthStateChange((_event, nextSession) => {
      const previousUserId = session.value?.user.id ?? null;
      const nextUserId = nextSession?.user.id ?? null;
      session.value = nextSession;
      if (previousUserId !== nextUserId) authStateVersion.value += 1;
    });
    authSubscription = data.subscription;
  }

  async function initialize() {
    if (!isSupabaseAuthEnabled || initialized.value) return;
    if (initializePromise) return initializePromise;
    initializePromise = (async () => {
      loading.value = true;
      try {
        const { data, error } = await getSupabaseClient().auth.getSession();
        if (error) throw error;
        session.value = data.session;
        subscribeToAuthChanges();
        errorMessage.value = "";
      } catch (error) {
        errorMessage.value = error instanceof Error ? error.message : "登录状态读取失败";
      } finally {
        initialized.value = true;
        loading.value = false;
        initializePromise = null;
      }
    })();
    return initializePromise;
  }

  async function signIn(email: string, password: string) {
    loading.value = true;
    try {
      const { data, error } = await getSupabaseClient().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      session.value = data.session;
      errorMessage.value = "";
      return data.session;
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : "登录失败";
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function signOut() {
    if (isSupabaseAuthEnabled) {
      const { error } = await getSupabaseClient().auth.signOut();
      if (error) throw error;
    }
    session.value = null;
    errorMessage.value = "";
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    const email = session.value?.user.email;
    if (!isSupabaseAuthEnabled || !email) {
      throw new Error("当前账号不支持修改密码");
    }
    if (!currentPassword || !newPassword) throw new Error("请输入当前密码和新密码");
    if (newPassword.length < 6) throw new Error("新密码至少需要 6 位");
    if (newPassword === currentPassword) throw new Error("新密码不能与当前密码相同");

    changingPassword.value = true;
    try {
      const client = getSupabaseClient();
      const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (signInError) {
        if (signInError.code === "invalid_credentials") throw new Error("当前密码错误");
        throw signInError;
      }
      session.value = signInData.session;

      const { error: updateError } = await client.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
    } finally {
      changingPassword.value = false;
    }
  }

  return {
    session,
    initialized,
    loading,
    changingPassword,
    authStateVersion,
    errorMessage,
    isAuthenticated,
    canChangePassword,
    initialize,
    signIn,
    signOut,
    changePassword,
  };
});
