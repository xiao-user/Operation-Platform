const FUTURE_ISSUED_JWT_PATTERN = /jwt.*issued.*future|issued.*future/i;
const DEFAULT_RETRY_DELAYS_MS = [250, 500, 1_000, 1_500, 2_000] as const;

type RetryWait = (delayMs: number, signal: AbortSignal) => Promise<void>;

interface SupabaseAuthRetryOptions {
  retryDelaysMs?: readonly number[];
  wait?: RetryWait;
}

async function responseErrorMessage(response: Response) {
  try {
    const body = await response.clone().json() as {
      message?: unknown;
      msg?: unknown;
      error?: unknown;
    };
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

async function isFutureIssuedJwtResponse(response: Response) {
  if (response.status !== 401) return false;
  return FUTURE_ISSUED_JWT_PATTERN.test(await responseErrorMessage(response));
}

function waitForRetry(delayMs: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }

    const timeout = window.setTimeout(() => {
      signal.removeEventListener("abort", handleAbort);
      resolve();
    }, delayMs);
    function handleAbort() {
      window.clearTimeout(timeout);
      reject(signal.reason);
    }
    signal.addEventListener("abort", handleAbort, { once: true });
  });
}

export function createSupabaseAuthRetryFetch(
  fetchImplementation: typeof fetch = fetch,
  options: SupabaseAuthRetryOptions = {},
) {
  const retryDelaysMs = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  const wait = options.wait ?? waitForRetry;

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);

    for (let attempt = 0; ; attempt += 1) {
      const response = await fetchImplementation(request.clone());
      const retryDelay = retryDelaysMs[attempt];
      if (retryDelay === undefined || !await isFutureIssuedJwtResponse(response)) {
        return response;
      }
      await wait(retryDelay, request.signal);
    }
  };
}
