export type SupabaseAuthFailure = "session-expired";

type SupabaseAuthFailureHandler = (failure: SupabaseAuthFailure) => void;

let authFailureHandler: SupabaseAuthFailureHandler | null = null;

async function responseErrorMessage(response: Response) {
  try {
    const body = await response.clone().json() as { message?: unknown; msg?: unknown; error?: unknown };
    const message = body.message ?? body.msg ?? body.error;
    return typeof message === "string" ? message : "";
  } catch {
    try {
      return await response.clone().text();
    } catch {
      return "";
    }
  }
}

async function inspectAuthenticationFailure(response: Response) {
  if (response.ok) return;
  const message = await responseErrorMessage(response);
  if (/jwt.*issued.*future|issued.*future/i.test(message)) {
    reportSupabaseAuthFailure("session-expired");
  }
}

export function setSupabaseAuthFailureHandler(handler: SupabaseAuthFailureHandler) {
  authFailureHandler = handler;
}

export function reportSupabaseAuthFailure(failure: SupabaseAuthFailure) {
  authFailureHandler?.(failure);
}

export function createSupabaseAuthFailureFetch(fetchImplementation: typeof fetch = fetch) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await fetchImplementation(input, init);
    await inspectAuthenticationFailure(response);
    return response;
  };
}
