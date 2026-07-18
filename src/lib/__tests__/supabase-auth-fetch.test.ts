import { describe, expect, it, vi } from "vitest";
import { createSupabaseAuthRetryFetch } from "@/lib/supabase-auth-fetch";

function futureJwtResponse() {
  return new Response(JSON.stringify({ message: "JWT issued at future" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

describe("Supabase authentication fetch", () => {
  it("waits and retries a temporarily future-issued JWT without invalidating the session", async () => {
    const success = new Response(JSON.stringify({ id: "profile-id" }), { status: 200 });
    const fetchImplementation = vi.fn()
      .mockResolvedValueOnce(futureJwtResponse())
      .mockResolvedValueOnce(success);
    const wait = vi.fn().mockResolvedValue(undefined);
    const authFetch = createSupabaseAuthRetryFetch(fetchImplementation, {
      retryDelaysMs: [250],
      wait,
    });

    const result = await authFetch("https://project.supabase.co/rest/v1/profiles");

    expect(result).toBe(success);
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(250, expect.any(AbortSignal));
  });

  it("returns the final response when the bounded retry window is exhausted", async () => {
    const firstFailure = futureJwtResponse();
    const finalFailure = futureJwtResponse();
    const fetchImplementation = vi.fn()
      .mockResolvedValueOnce(firstFailure)
      .mockResolvedValueOnce(finalFailure);
    const authFetch = createSupabaseAuthRetryFetch(fetchImplementation, {
      retryDelaysMs: [250],
      wait: vi.fn().mockResolvedValue(undefined),
    });

    const result = await authFetch("https://project.supabase.co/rest/v1/profiles");

    expect(result).toBe(finalFailure);
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
  });

  it("does not retry unrelated authentication or authorization failures", async () => {
    const response = new Response(JSON.stringify({ message: "permission denied" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
    const fetchImplementation = vi.fn().mockResolvedValue(response);
    const wait = vi.fn().mockResolvedValue(undefined);
    const authFetch = createSupabaseAuthRetryFetch(fetchImplementation, { wait });

    const result = await authFetch("https://project.supabase.co/rest/v1/profiles");

    expect(result).toBe(response);
    expect(fetchImplementation).toHaveBeenCalledOnce();
    expect(wait).not.toHaveBeenCalled();
  });

  it("replays the same request body after the transient rejection", async () => {
    const fetchImplementation = vi.fn()
      .mockResolvedValueOnce(futureJwtResponse())
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const authFetch = createSupabaseAuthRetryFetch(fetchImplementation, {
      retryDelaysMs: [0],
      wait: vi.fn().mockResolvedValue(undefined),
    });

    await authFetch("https://project.supabase.co/rest/v1/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    });

    const firstRequest = fetchImplementation.mock.calls[0]?.[0] as Request;
    const secondRequest = fetchImplementation.mock.calls[1]?.[0] as Request;
    expect(await firstRequest.text()).toBe('{"enabled":true}');
    expect(await secondRequest.text()).toBe('{"enabled":true}');
  });
});
