import { computed, ref } from "vue";
import { defineStore } from "pinia";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseAuthEnabled } from "@/lib/supabase";

export const useAuthStore = defineStore("auth", () => {
  const session = ref<Session | null>(null);
  const initialized = ref(!isSupabaseAuthEnabled);
  const loading = ref(false);
  const changingPassword = ref(false);
  const errorMessage = ref("");
  const isAuthenticated = computed(() => !isSupabaseAuthEnabled || Boolean(session.value));
  const canChangePassword = computed(() =>
    isSupabaseAuthEnabled && Boolean(session.value?.user.email),
  );

  async function initialize() {
    if (!isSupabaseAuthEnabled || initialized.value) return;
    loading.value = true;
    try {
      const { data, error } = await getSupabaseClient().auth.getSession();
      if (error) throw error;
      session.value = data.session;
      errorMessage.value = "";
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : "登录状态读取失败";
    } finally {
      initialized.value = true;
      loading.value = false;
    }
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
    errorMessage,
    isAuthenticated,
    canChangePassword,
    initialize,
    signIn,
    signOut,
    changePassword,
  };
});
