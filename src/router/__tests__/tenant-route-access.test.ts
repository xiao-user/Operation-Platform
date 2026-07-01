import { describe, expect, it } from "vitest";
import { cloneTenantTemplate } from "@/config/menu-templates";
import { defaultTenantShellConfig } from "@/features/shell-config/local-storage-shell-config-repository";
import { resolveTenantRouteAccess } from "@/router/tenant-route-access";
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

describe("tenant route access", () => {
  it("allows a visible page owned by the tenant menu", () => {
    const records = cloneTenantTemplate(school);

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

    expect(
      resolveTenantRouteAccess(
        { path: "/security/new-gate/person-group", meta: { pageKey: "person-group", menuOwnerKey: "device-list" } },
        "admin",
        records,
      ),
    ).toEqual({ kind: "allow" });
  });

  it("redirects a hidden page to the first visible internal page", () => {
    const records = cloneTenantTemplate(school);
    const deviceMenu = records.find((record) => record.pageKey === "device-list")!;
    deviceMenu.visible = false;

    const result = resolveTenantRouteAccess(
      { path: "/security/new-gate/device-list", meta: { pageKey: "device-list", menuOwnerKey: "device-list" } },
      "admin",
      records,
    );

    expect(result.kind).toBe("redirect");
    expect(result).toHaveProperty("path", "/family-interaction/notice");
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

    expect(
      resolveTenantRouteAccess(
        { path: "/workbench", meta: { fixedWorkbench: true } },
        "admin",
        cloneTenantTemplate(school),
        shellConfig,
      ),
    ).toEqual({ kind: "redirect", path: "/family-interaction/notice" });
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
    expect(
      resolveTenantRouteAccess(
        { path: "/system/menu-config", meta: { pageKey: "system-menu-config", requiresAdmin: true } },
        "admin",
        cloneTenantTemplate(school),
      ),
    ).toEqual({ kind: "redirect", path: "/family-interaction/notice" });
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
