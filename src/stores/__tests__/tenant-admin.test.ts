import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import {
  tenantStorageKey,
} from "@/features/tenant/local-storage-tenant-repository";
import { tenantConfigurationRepository } from "@/features/tenant-config/local-storage-tenant-configuration-repository";
import { tenantConfigurationStorageKey } from "@/features/tenant-config/local-storage-tenant-configuration-repository";
import {
  tenantMemberRepository,
  tenantMemberStorageKey,
} from "@/features/tenant-members/local-storage-tenant-member-repository";
import { useTenantAdminStore } from "@/stores/tenant-admin";
import { tenantRepository } from "@/features/tenant/local-storage-tenant-repository";
import { useUserStore } from "@/stores/user";
import { MOCK_TENANTS } from "@/config/mock";
import { ADMIN_ROLE_ID } from "@/features/access-control/types";

describe("tenant admin store", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it("restores the organization list when tenant configuration cleanup fails", async () => {
    const store = useTenantAdminStore();
    const target = store.tenants.find((tenant) => tenant.type !== "platform")!;
    vi.spyOn(tenantConfigurationRepository, "remove").mockImplementation(() => {
      throw new Error("cleanup failed");
    });

    await expect(store.remove(target.id)).rejects.toThrow("cleanup failed");
    expect(store.tenants.some((tenant) => tenant.id === target.id)).toBe(true);

    const persisted = JSON.parse(localStorage.getItem(tenantStorageKey)!) as Array<{ id: string }>;
    expect(persisted.some((tenant) => tenant.id === target.id)).toBe(true);
  });

  it("deletes the organization and its complete configuration together", async () => {
    const store = useTenantAdminStore();
    const target = store.tenants.find((tenant) => tenant.type === "org")!;
    tenantConfigurationRepository.list(target);
    tenantMemberRepository.list(target);

    await store.remove(target.id);

    expect(store.tenants.some((tenant) => tenant.id === target.id)).toBe(false);
    expect(localStorage.getItem(tenantConfigurationStorageKey(target.id))).toBeNull();
    expect(localStorage.getItem(tenantMemberStorageKey(target.id))).toBeNull();
  });

  it("creates the current user as the first enabled admin member for a new organization", async () => {
    const store = useTenantAdminStore();
    const tenant = await store.create({
      id: "school-member-create",
      name: "成员初始化学校",
      shortName: "成员学校",
      type: "school",
      enabled: true,
    });

    const members = tenantMemberRepository.list(tenant).members;
    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({
      tenantId: tenant.id,
      userId: "user-demo",
      enabled: true,
      roleIds: [ADMIN_ROLE_ID],
    });
  });

  it("starts in an assigned tenant when an unassigned organization sorts first", () => {
    tenantRepository.replace([
      ...MOCK_TENANTS,
      {
        id: "school-unassigned",
        name: "端到端测试学校",
        shortName: "测试学校",
        type: "school",
        enabled: true,
      },
    ]);

    const userStore = useUserStore();

    expect(userStore.currentTenant.id).toBe("school-001");
    expect(userStore.role).toBe("admin");
  });

  it("does not expose or switch to an enabled tenant without current user membership", async () => {
    tenantRepository.replace([
      ...MOCK_TENANTS,
      {
        id: "school-unassigned",
        name: "未授权学校",
        shortName: "未授权",
        type: "school",
        enabled: true,
      },
    ]);

    const userStore = useUserStore();

    expect(userStore.availableTenants.map((tenant) => tenant.id)).not.toContain("school-unassigned");
    await userStore.switchTenant("school-unassigned");
    expect(userStore.currentTenant.id).toBe("school-001");
  });
});
