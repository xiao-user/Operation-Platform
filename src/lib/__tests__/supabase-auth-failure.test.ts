import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSupabaseAuthFailureFetch,
  setSupabaseAuthFailureHandler,
} from "@/lib/supabase-auth-failure";

describe("Supabase authentication failure handling", () => {
  const handler = vi.fn();

  beforeEach(() => {
    handler.mockClear();
    setSupabaseAuthFailureHandler(handler);
  });

  it("reports a future-issued JWT as an expired session", async () => {
    const response = new Response(JSON.stringify({ message: "JWT issued at future" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
    const authFetch = createSupabaseAuthFailureFetch(vi.fn().mockResolvedValue(response));

    const result = await authFetch("https://project.supabase.co/rest/v1/profiles");

    expect(result).toBe(response);
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith("session-expired");
  });

  it("does not change authentication for unrelated failures", async () => {
    const response = new Response(JSON.stringify({ message: "permission denied" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
    const authFetch = createSupabaseAuthFailureFetch(vi.fn().mockResolvedValue(response));

    await authFetch("https://project.supabase.co/rest/v1/profiles");

    expect(handler).not.toHaveBeenCalled();
  });
});
