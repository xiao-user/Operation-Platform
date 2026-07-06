import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import {
  tenantStorageKey,
} from "@/features/tenant/local-storage-tenant-repository";
import { tenantConfigurationRepository } from "@/features/tenant-config/local-storage-tenant-configuration-repository";
import { tenantConfigurationStorageKey } from "@/features/tenant-config/local-storage-tenant-configuration-repository";
import { useTenantAdminStore } from "@/stores/tenant-admin";

describe("tenant admin store", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it("restores the organization list when tenant configuration cleanup fails", () => {
    const store = useTenantAdminStore();
    const target = store.tenants.find((tenant) => tenant.type !== "platform")!;
    vi.spyOn(tenantConfigurationRepository, "remove").mockImplementation(() => {
      throw new Error("cleanup failed");
    });

    expect(() => store.remove(target.id)).toThrow("cleanup failed");
    expect(store.tenants.some((tenant) => tenant.id === target.id)).toBe(true);

    const persisted = JSON.parse(localStorage.getItem(tenantStorageKey)!) as Array<{ id: string }>;
    expect(persisted.some((tenant) => tenant.id === target.id)).toBe(true);
  });

  it("deletes the organization and its complete configuration together", () => {
    const store = useTenantAdminStore();
    const target = store.tenants.find((tenant) => tenant.type === "org")!;
    tenantConfigurationRepository.list(target);

    store.remove(target.id);

    expect(store.tenants.some((tenant) => tenant.id === target.id)).toBe(false);
    expect(localStorage.getItem(tenantConfigurationStorageKey(target.id))).toBeNull();
  });
});
