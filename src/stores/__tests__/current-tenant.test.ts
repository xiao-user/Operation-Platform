import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { activeTenantSessionKey } from "@/features/session/active-tenant-session";
import { operationPlatformPersistence } from "@/features/persistence/runtime-operation-platform-persistence";
import { useUserStore } from "@/stores/user";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

describe("current tenant", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it("restores the last accessible tenant after the store is recreated", async () => {
    const firstStore = useUserStore();

    await firstStore.switchTenant("school-002");

    expect(sessionStorage.getItem(activeTenantSessionKey(firstStore.userInfo.id))).toBe("school-002");
    setActivePinia(createPinia());
    const reloadedStore = useUserStore();
    expect(reloadedStore.currentTenant.id).toBe("school-002");
  });

  it("keeps the current tenant when persistence is force-refreshed for the same user", async () => {
    const store = useUserStore();
    await store.switchTenant("school-002");

    await store.initializePersistence(null, true);

    expect(store.currentTenant.id).toBe("school-002");
  });

  it("deduplicates concurrent persistence initialization for the same user", async () => {
    const store = useUserStore();
    const state = operationPlatformPersistence.initialState();
    const pending = deferred<typeof state>();
    const initialize = vi
      .spyOn(operationPlatformPersistence, "initialize")
      .mockReturnValueOnce(pending.promise);

    const first = store.initializePersistence({ id: "user-demo" }, true);
    const second = store.initializePersistence({ id: "user-demo" }, true);

    expect(initialize).toHaveBeenCalledTimes(1);
    expect(store.persistenceLoading).toBe(true);
    pending.resolve(state);
    await Promise.all([first, second]);
    expect(store.persistenceLoading).toBe(false);
    expect(store.persistenceError).toBe("");
  });

  it("falls back without applying an inaccessible persisted tenant", () => {
    sessionStorage.setItem(activeTenantSessionKey("user-demo"), "school-inaccessible");

    const store = useUserStore();

    expect(store.currentTenant.id).toBe("school-001");
  });

  it("does not remember a temporary standalone-page tenant context", async () => {
    const store = useUserStore();
    await store.switchTenant("school-002");

    await store.switchTenant("bureau-001", { remember: false });

    expect(store.currentTenant.id).toBe("bureau-001");
    expect(sessionStorage.getItem(activeTenantSessionKey(store.userInfo.id))).toBe("school-002");
  });

  it("clears the active tenant when the login session is reset", async () => {
    const store = useUserStore();
    await store.switchTenant("school-002");

    store.resetPersistence();

    expect(sessionStorage.getItem(activeTenantSessionKey(store.userInfo.id))).toBeNull();
    expect(store.currentTenant.id).toBe("school-001");
  });
});
