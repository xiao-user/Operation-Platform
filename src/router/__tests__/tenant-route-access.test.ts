import { describe, expect, it } from "vitest";
import { DEVELOPING_PAGE_KEY } from "@/config/page-registry";
import { cloneTenantTemplate } from "@/config/menu-templates";
import { defaultTenantShellConfig } from "@/features/shell-config/local-storage-shell-config-repository";
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

describe("tenant route access", () => {
  it("allows a visible page owned by the tenant menu", () => {
    const records = cloneTenantTemplate(school);
    addDeviceMenu(records);

    expect(
      resolveTenantRouteAccess(
        { path: "/security/new-gate/device-list", meta: { pageKey: "device-list", menuOwnerKey: "device-list" } },
        "admin",
        records,
      ),
    ).toEqual({ kind: "allow" });
  });

  it("allows a static subpage when its owner menu is visible", () => {
    const records = cloneTenantTemplate(school);
    addDeviceMenu(records);

    expect(
      resolveTenantRouteAccess(
        { path: "/security/new-gate/person-group", meta: { pageKey: "person-group", menuOwnerKey: "device-list" } },
        "admin",
        records,
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

    expect(
      resolveTenantRouteAccess(
        {
          path: "/developing/custom-placeholder",
          meta: { pageKey: DEVELOPING_PAGE_KEY },
          params: { menuId: "custom-placeholder" },
        },
        "admin",
        records,
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

    expect(resolveFirstTenantInternalPath(records, "admin")).toBe("/developing/placeholder-page");
  });

  it("redirects a hidden page to the first visible internal page", () => {
    const records = cloneTenantTemplate(school);
    const deviceMenu = addDeviceMenu(records);
    deviceMenu.visible = false;
    const fallbackPath = resolveFirstTenantInternalPath(records, "admin");

    const result = resolveTenantRouteAccess(
      { path: "/security/new-gate/device-list", meta: { pageKey: "device-list", menuOwnerKey: "device-list" } },
      "admin",
      records,
    );

    expect(result.kind).toBe("redirect");
    expect(result).toHaveProperty("path", fallbackPath);
  });

  it("allows admins to access the platform-owned configuration route", () => {
    expect(
      resolveTenantRouteAccess(
        { path: "/system/menu-config", meta: { pageKey: "system-menu-config", requiresAdmin: true } },
        "admin",
        cloneTenantTemplate(platform),
      ),
    ).toEqual({ kind: "allow" });
  });

  it("allows workbench when the tenant shell config enables it", () => {
    expect(
      resolveTenantRouteAccess(
        { path: "/workbench", meta: { fixedWorkbench: true } },
        "admin",
        cloneTenantTemplate(school),
        defaultTenantShellConfig(),
      ),
    ).toEqual({ kind: "allow" });
  });

  it("redirects hidden workbench to the first visible internal page", () => {
    const shellConfig = defaultTenantShellConfig();
    shellConfig.workbench.enabled = false;
    const records = cloneTenantTemplate(school);
    const fallbackPath = resolveFirstTenantInternalPath(records, "admin");

    expect(
      resolveTenantRouteAccess(
        { path: "/workbench", meta: { fixedWorkbench: true } },
        "admin",
        records,
        shellConfig,
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
      ),
    ).toEqual({ kind: "empty" });
  });

  it("redirects school tenants away from the platform-owned configuration route", () => {
    const records = cloneTenantTemplate(school);
    const fallbackPath = resolveFirstTenantInternalPath(records, "admin");
    expect(
      resolveTenantRouteAccess(
        { path: "/system/menu-config", meta: { pageKey: "system-menu-config", requiresAdmin: true } },
        "admin",
        records,
      ),
    ).toEqual({ kind: "redirect", path: fallbackPath });
  });

  it("blocks teachers from the platform-owned configuration route", () => {
    expect(
      resolveTenantRouteAccess(
        { path: "/system/menu-config", meta: { pageKey: "system-menu-config", requiresAdmin: true } },
        "teacher",
        cloneTenantTemplate(platform),
      ),
    ).toEqual({ kind: "empty" });
  });

  it("returns an empty result when the tenant has no internal page", () => {
    expect(
      resolveTenantRouteAccess(
        { path: "/security/new-gate/device-list", meta: { pageKey: "device-list" } },
        "admin",
        [],
      ),
    ).toEqual({ kind: "empty" });
  });
});
