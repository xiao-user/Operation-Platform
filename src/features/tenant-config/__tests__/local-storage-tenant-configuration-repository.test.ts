import { beforeEach, describe, expect, it } from "vitest";
import { tenantRoleStorageKey } from "@/features/access-control/local-storage-role-repository";
import { tenantMenuStorageKey } from "@/features/menu-config/local-storage-menu-repository";
import { tenantShellConfigStorageKey } from "@/features/shell-config/local-storage-shell-config-repository";
import {
  LocalStorageTenantConfigurationRepository,
  TenantConfigurationPersistenceError,
  tenantConfigurationStorageKey,
} from "@/features/tenant-config/local-storage-tenant-configuration-repository";
import type { TenantInfo } from "@/types/user";
import {
  getWorkbenchTemplate,
} from "@/features/workbench/workbench-templates";
import {
  createDefaultWorkbenchLayout,
} from "@/features/workbench/workbench-layout";
import {
  workbenchLayoutStorageKey,
} from "@/features/workbench/local-storage-workbench-layout-repository";
import {
  tenantMemberStorageKey,
} from "@/features/tenant-members/local-storage-tenant-member-repository";
import {
  activeRoleStorageKey,
} from "@/features/access-control/local-storage-active-role-repository";

const school: TenantInfo = {
  id: "school-aggregate",
  name: "聚合配置学校",
  shortName: "聚合学校",
  type: "school",
  enabled: true,
};

describe("tenant configuration repository", () => {
  beforeEach(() => localStorage.clear());

  it("migrates legacy keys into one tenant configuration aggregate", () => {
    const repository = new LocalStorageTenantConfigurationRepository(localStorage);
    const result = repository.list(school);

    expect(result.configuration.menuRecords.length).toBeGreaterThan(0);
    expect(result.configuration.roles.map((role) => role.id)).toContain("admin");
    expect(result.configuration.shellConfig.workbench.label).toBe("工作台");
    expect(localStorage.getItem(tenantConfigurationStorageKey(school.id))).not.toBeNull();
  });

  it("rejects semantic menu corruption and restores the full aggregate", () => {
    const repository = new LocalStorageTenantConfigurationRepository(localStorage, () => 1000);
    const configuration = repository.list(school).configuration;
    const first = configuration.menuRecords[0]!;
    const second = configuration.menuRecords[1]!;
    first.parentId = second.id;
    second.parentId = first.id;
    localStorage.setItem(
      tenantConfigurationStorageKey(school.id),
      JSON.stringify(configuration),
    );

    const recovered = repository.list(school);

    expect(recovered.recoveryNotice).toContain("已恢复默认");
    expect(recovered.configuration.menuRecords.some((record) => record.parentId === null)).toBe(true);
    expect(
      localStorage.getItem(
        `operation-platform:tenant-configuration:invalid:${school.id}:1000`,
      ),
    ).not.toBeNull();
  });

  it("persists menu, shell and roles with one aggregate write", () => {
    const repository = new LocalStorageTenantConfigurationRepository(localStorage);
    const configuration = repository.list(school).configuration;
    configuration.shellConfig.workbench.label = "统一入口";
    configuration.roles[1]!.description = "更新后的角色";

    repository.replace(school, configuration);
    const stored = JSON.parse(
      localStorage.getItem(tenantConfigurationStorageKey(school.id))!,
    );

    expect(stored.shellConfig.workbench.label).toBe("统一入口");
    expect(stored.roles[1].description).toBe("更新后的角色");
    expect(stored.menuRecords).toHaveLength(configuration.menuRecords.length);
  });

  it("removes aggregate and legacy data when a tenant is deleted", () => {
    const repository = new LocalStorageTenantConfigurationRepository(localStorage);
    repository.list(school);
    localStorage.setItem(tenantMenuStorageKey(school.id), "legacy-menu");
    localStorage.setItem(tenantShellConfigStorageKey(school.id), "legacy-shell");
    localStorage.setItem(tenantRoleStorageKey(school.id), "legacy-roles");
    localStorage.setItem(tenantMemberStorageKey(school.id), "tenant-members");
    localStorage.setItem(
      activeRoleStorageKey({ tenantId: school.id, userId: "user-a" }),
      "admin",
    );
    const workbenchContext = { tenant: school, userId: "user-a", profile: "admin" } as const;
    const workbenchKey = workbenchLayoutStorageKey(workbenchContext);
    localStorage.setItem(
      workbenchKey,
      JSON.stringify(
        createDefaultWorkbenchLayout(
          workbenchContext,
          getWorkbenchTemplate(school.type, "admin"),
        ),
      ),
    );

    repository.remove(school.id);

    expect(localStorage.getItem(tenantConfigurationStorageKey(school.id))).toBeNull();
    expect(localStorage.getItem(tenantMenuStorageKey(school.id))).toBeNull();
    expect(localStorage.getItem(tenantShellConfigStorageKey(school.id))).toBeNull();
    expect(localStorage.getItem(tenantRoleStorageKey(school.id))).toBeNull();
    expect(localStorage.getItem(tenantMemberStorageKey(school.id))).toBeNull();
    expect(
      localStorage.getItem(activeRoleStorageKey({ tenantId: school.id, userId: "user-a" })),
    ).toBeNull();
    expect(localStorage.getItem(workbenchKey)).toBeNull();
  });

  it("rolls back every configuration key when tenant cleanup fails", () => {
    const setupRepository = new LocalStorageTenantConfigurationRepository(localStorage);
    setupRepository.list(school);
    localStorage.setItem(tenantMenuStorageKey(school.id), "legacy-menu");
    localStorage.setItem(tenantShellConfigStorageKey(school.id), "legacy-shell");
    localStorage.setItem(tenantRoleStorageKey(school.id), "legacy-roles");
    localStorage.setItem(tenantMemberStorageKey(school.id), "tenant-members");
    localStorage.setItem(
      activeRoleStorageKey({ tenantId: school.id, userId: "user-a" }),
      "admin",
    );
    const workbenchContext = { tenant: school, userId: "user-a", profile: "admin" } as const;
    const workbenchKey = workbenchLayoutStorageKey(workbenchContext);
    localStorage.setItem(
      workbenchKey,
      JSON.stringify(
        createDefaultWorkbenchLayout(
          workbenchContext,
          getWorkbenchTemplate(school.type, "admin"),
        ),
      ),
    );
    const keys = [
      tenantConfigurationStorageKey(school.id),
      tenantMenuStorageKey(school.id),
      tenantShellConfigStorageKey(school.id),
      tenantRoleStorageKey(school.id),
      tenantMemberStorageKey(school.id),
      activeRoleStorageKey({ tenantId: school.id, userId: "user-a" }),
      workbenchKey,
    ];
    const previous = new Map(keys.map((key) => [key, localStorage.getItem(key)]));
    let failed = false;
    const storage = new Proxy(localStorage, {
      get(target, property) {
        if (property === "removeItem") {
          return (key: string) => {
            if (!failed && key === tenantShellConfigStorageKey(school.id)) {
              failed = true;
              throw new DOMException("remove failed");
            }
            target.removeItem(key);
          };
        }
        const value = Reflect.get(target, property);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const repository = new LocalStorageTenantConfigurationRepository(storage);

    expect(() => repository.remove(school.id)).toThrow(TenantConfigurationPersistenceError);
    for (const [key, value] of previous) {
      expect(localStorage.getItem(key)).toBe(value);
    }
  });
});
