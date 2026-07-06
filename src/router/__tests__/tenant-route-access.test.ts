import { describe, expect, it } from "vitest";
import { DEVELOPING_PAGE_KEY } from "@/config/page-registry";
import { cloneTenantTemplate } from "@/config/menu-templates";
import { defaultTenantShellConfig } from "@/features/shell-config/local-storage-shell-config-repository";
import { ADMIN_ROLE_ID, STAFF_ROLE_ID, type RoleRecord } from "@/features/access-control/types";
import {
  resolveFirstTenantInternalPath,
  resolveTenantRouteAccess,
} from "@/router/tenant-route-access";
import type { TenantInfo } from "@/types/user";

const school: TenantInfo = {
  id: "school-a",
  name: "学校 A",
  shortName: "学校 A",
  type: "school",
};
const platform: TenantInfo = {
  id: "platform-a",
  name: "运营平台",
  shortName: "运营平台",
  type: "platform",
};

function addDeviceMenu(records: ReturnType<typeof cloneTenantTemplate>) {
  const moduleRecord = records.find((record) => record.type === "module")!;
  const deviceMenu = {
    id: "custom-device-list",
    tenantId: school.id,
    parentId: moduleRecord.id,
    type: "page" as const,
    name: "设备列表",
    icon: null,
    pageKey: "device-list",
    externalUrl: null,
    externalOpenMode: null,
    sort: 999,
    visible: true,
  };
  records.push(deviceMenu);
  return deviceMenu;
}

function accessRoles(
  tenant: TenantInfo,
  records: readonly ReturnType<typeof cloneTenantTemplate>[number][],
  teacherMenuIds: string[] = [],
): RoleRecord[] {
  const leafIds = records
    .filter((record) => record.type === "page" || record.type === "external")
    .map((record) => record.id);
  return [
    {
      id: ADMIN_ROLE_ID,
      tenantId: tenant.id,
      name: "管理员",
      description: "",
      builtIn: true,
      enabled: true,
      sort: 10,
      menuIds: leafIds,
    },
    {
      id: STAFF_ROLE_ID,
      tenantId: tenant.id,
      name: tenant.type === "school" ? "老师" : "职员",
      description: "",
      builtIn: true,
      enabled: true,
      sort: 20,
      menuIds: teacherMenuIds,
    },
  ];
}

describe("tenant route access", () => {
  it("allows a visible page owned by the tenant menu", () => {
    const records = cloneTenantTemplate(school);
    addDeviceMenu(records);
    const roles = accessRoles(school, records);

    expect(
      resolveTenantRouteAccess(
        { path: "/security/new-gate/device-list", meta: { pageKey: "device-list", menuOwnerKey: "device-list" } },
        "admin",
        records,
        defaultTenantShellConfig(),
        roles,
      ),
    ).toEqual({ kind: "allow" });
  });

  it("allows a static subpage when its owner menu is visible", () => {
    const records = cloneTenantTemplate(school);
    addDeviceMenu(records);
    const roles = accessRoles(school, records);

    expect(
      resolveTenantRouteAccess(
        { path: "/security/new-gate/person-group", meta: { pageKey: "person-group", menuOwnerKey: "device-list" } },
        "admin",
        records,
        defaultTenantShellConfig(),
        roles,
      ),
    ).toEqual({ kind: "allow" });
  });

  it("allows a menu-scoped developing placeholder route when the menu is visible", () => {
    const records = cloneTenantTemplate(school);
    const moduleRecord = records.find((record) => record.type === "module")!;
    records.push({
      id: "custom-placeholder",
      tenantId: school.id,
      parentId: moduleRecord.id,
      type: "page",
      name: "自定义页面",
      icon: null,
      pageKey: DEVELOPING_PAGE_KEY,
      externalUrl: null,
      externalOpenMode: null,
      sort: 999,
      visible: true,
    });
    const roles = accessRoles(school, records);

    expect(
      resolveTenantRouteAccess(
        {
          path: "/developing/custom-placeholder",
          meta: { pageKey: DEVELOPING_PAGE_KEY },
          params: { menuId: "custom-placeholder" },
        },
        "admin",
        records,
        defaultTenantShellConfig(),
        roles,
      ),
    ).toEqual({ kind: "allow" });
  });

  it("uses the menu id when resolving the first developing placeholder path", () => {
    const records = [
      {
        id: "module",
        tenantId: school.id,
        parentId: null,
        type: "module",
        name: "自定义模块",
        icon: null,
        pageKey: null,
        externalUrl: null,
        externalOpenMode: null,
        sort: 10,
        visible: true,
      },
      {
        id: "placeholder-page",
        tenantId: school.id,
        parentId: "module",
        type: "page",
        name: "自定义页面",
        icon: null,
        pageKey: DEVELOPING_PAGE_KEY,
        externalUrl: null,
        externalOpenMode: null,
        sort: 10,
        visible: true,
      },
    ] as const;

    expect(resolveFirstTenantInternalPath(records, "admin", accessRoles(school, records))).toBe(
      "/developing/placeholder-page",
    );
  });

  it("redirects a hidden page to the first visible internal page", () => {
    const records = cloneTenantTemplate(school);
    const deviceMenu = addDeviceMenu(records);
    deviceMenu.visible = false;
    const roles = accessRoles(school, records);
    const fallbackPath = resolveFirstTenantInternalPath(records, "admin", roles);

    const result = resolveTenantRouteAccess(
      { path: "/security/new-gate/device-list", meta: { pageKey: "device-list", menuOwnerKey: "device-list" } },
      "admin",
      records,
      defaultTenantShellConfig(),
      roles,
    );

    expect(result.kind).toBe("redirect");
    expect(result).toHaveProperty("path", fallbackPath);
  });

  it("allows admins to access the platform-owned configuration route", () => {
    const records = cloneTenantTemplate(platform);
    expect(
      resolveTenantRouteAccess(
        { path: "/system/menu-config", meta: { pageKey: "system-menu-config", requiresAdmin: true } },
        "admin",
        records,
        defaultTenantShellConfig(),
        accessRoles(platform, records),
      ),
    ).toEqual({ kind: "allow" });
  });

  it("allows workbench when the tenant shell config enables it", () => {
    const records = cloneTenantTemplate(school);
    expect(
      resolveTenantRouteAccess(
        { path: "/workbench", meta: { fixedWorkbench: true } },
        "admin",
        records,
        defaultTenantShellConfig(),
        accessRoles(school, records),
      ),
    ).toEqual({ kind: "allow" });
  });

  it("redirects hidden workbench to the first visible internal page", () => {
    const shellConfig = defaultTenantShellConfig();
    shellConfig.workbench.enabled = false;
    const records = cloneTenantTemplate(school);
    const roles = accessRoles(school, records);
    const fallbackPath = resolveFirstTenantInternalPath(records, "admin", roles);

    expect(
      resolveTenantRouteAccess(
        { path: "/workbench", meta: { fixedWorkbench: true } },
        "admin",
        records,
        shellConfig,
        roles,
      ),
    ).toEqual({ kind: "redirect", path: fallbackPath });
  });

  it("returns empty when hidden workbench has no business fallback", () => {
    const shellConfig = defaultTenantShellConfig();
    shellConfig.workbench.enabled = false;

    expect(
      resolveTenantRouteAccess(
        { path: "/workbench", meta: { fixedWorkbench: true } },
        "admin",
        [],
        shellConfig,
        accessRoles(school, []),
      ),
    ).toEqual({ kind: "empty" });
  });

  it("redirects school tenants away from the platform-owned configuration route", () => {
    const records = cloneTenantTemplate(school);
    const roles = accessRoles(school, records);
    const fallbackPath = resolveFirstTenantInternalPath(records, "admin", roles);
    expect(
      resolveTenantRouteAccess(
        { path: "/system/menu-config", meta: { pageKey: "system-menu-config", requiresAdmin: true } },
        "admin",
        records,
        defaultTenantShellConfig(),
        roles,
      ),
    ).toEqual({ kind: "redirect", path: fallbackPath });
  });

  it("blocks teachers from the platform-owned configuration route", () => {
    const records = cloneTenantTemplate(platform);
    expect(
      resolveTenantRouteAccess(
        { path: "/system/menu-config", meta: { pageKey: "system-menu-config", requiresAdmin: true } },
        "teacher",
        records,
        defaultTenantShellConfig(),
        accessRoles(platform, records),
      ),
    ).toEqual({ kind: "empty" });
  });

  it("returns an empty result when the tenant has no internal page", () => {
    expect(
      resolveTenantRouteAccess(
        { path: "/security/new-gate/device-list", meta: { pageKey: "device-list" } },
        "admin",
        [],
        defaultTenantShellConfig(),
        accessRoles(school, []),
      ),
    ).toEqual({ kind: "empty" });
  });

  it("redirects a role away from a menu page that has not been granted", () => {
    const records = cloneTenantTemplate(school);
    const deviceMenu = addDeviceMenu(records);
    const fallbackMenu = records.find(
      (record) => record.type === "page" && record.id !== deviceMenu.id,
    )!;
    const roles = accessRoles(school, records, [fallbackMenu.id]);
    const fallbackPath = resolveFirstTenantInternalPath(records, STAFF_ROLE_ID, roles);

    expect(
      resolveTenantRouteAccess(
        { path: "/security/new-gate/device-list", meta: { pageKey: "device-list", menuOwnerKey: "device-list" } },
        STAFF_ROLE_ID,
        records,
        defaultTenantShellConfig(),
        roles,
      ),
    ).toEqual({ kind: "redirect", path: fallbackPath });
  });

  it("blocks hidden menus even when a role still has the menu id", () => {
    const records = cloneTenantTemplate(school);
    const deviceMenu = addDeviceMenu(records);
    deviceMenu.visible = false;
    const roles = accessRoles(school, records, [deviceMenu.id]);

    expect(
      resolveTenantRouteAccess(
        { path: "/security/new-gate/device-list", meta: { pageKey: "device-list", menuOwnerKey: "device-list" } },
        STAFF_ROLE_ID,
        records,
        defaultTenantShellConfig(),
        roles,
      ),
    ).toEqual({ kind: "empty" });
  });

  it("fails closed when the authenticated role is missing or disabled", () => {
    const records = cloneTenantTemplate(school);
    const roles = accessRoles(school, records).map((role) =>
      role.id === STAFF_ROLE_ID ? { ...role, enabled: false } : role,
    );

    expect(
      resolveTenantRouteAccess(
        { path: "/workbench", meta: { fixedWorkbench: true } },
        STAFF_ROLE_ID,
        records,
        defaultTenantShellConfig(),
        roles,
      ),
    ).toEqual({ kind: "empty" });
    expect(
      resolveTenantRouteAccess(
        { path: "/workbench", meta: { fixedWorkbench: true } },
        "unknown-role",
        records,
        defaultTenantShellConfig(),
        roles,
      ),
    ).toEqual({ kind: "empty" });
  });
});
