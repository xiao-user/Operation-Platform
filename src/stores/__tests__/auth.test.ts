import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import type { Session } from "@supabase/supabase-js";

const authApi = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  updateUser: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  isSupabaseAuthEnabled: true,
  getSupabaseClient: () => ({ auth: authApi }),
}));

import { useAuthStore } from "@/stores/auth";

function session(email = "member@example.com") {
  return {
    access_token: "access-token",
    refresh_token: "refresh-token",
    expires_in: 3600,
    token_type: "bearer",
    user: { id: "auth-user", email },
  } as Session;
}

describe("auth store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    authApi.getSession.mockResolvedValue({ data: { session: session() }, error: null });
    authApi.signInWithPassword.mockResolvedValue({
      data: { session: session() },
      error: null,
    });
    authApi.updateUser.mockResolvedValue({ data: { user: session().user }, error: null });
    authApi.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it("verifies the current password before updating the new password", async () => {
    const store = useAuthStore();
    await store.initialize();

    await store.changePassword("current-password", "new-password");

    expect(authApi.signInWithPassword).toHaveBeenCalledWith({
      email: "member@example.com",
      password: "current-password",
    });
    expect(authApi.updateUser).toHaveBeenCalledWith({ password: "new-password" });
    expect(store.changingPassword).toBe(false);
  });

  it("does not update the password when the current password is invalid", async () => {
    const store = useAuthStore();
    await store.initialize();
    authApi.signInWithPassword.mockResolvedValueOnce({
      data: { session: null },
      error: { code: "invalid_credentials", message: "Invalid login credentials" },
    });

    await expect(store.changePassword("wrong-password", "new-password")).rejects.toThrow(
      "当前密码错误",
    );
    expect(authApi.updateUser).not.toHaveBeenCalled();
    expect(store.changingPassword).toBe(false);
  });

  it("tracks Supabase auth changes from another browser tab", async () => {
    const store = useAuthStore();
    await store.initialize();
    const callback = authApi.onAuthStateChange.mock.calls[0]?.[0];

    callback("SIGNED_OUT", null);

    expect(store.session).toBeNull();
    expect(store.authStateVersion).toBe(1);
  });
});
