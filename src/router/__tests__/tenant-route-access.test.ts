import { describe, expect, it } from "vitest";
import { cloneTenantTemplate } from "@/config/menu-templates";
import { resolveTenantRouteAccess } from "@/router/tenant-route-access";
import type { TenantInfo } from "@/types/user";

const school: TenantInfo = {
  id: "school-a",
  name: "学校 A",
  shortName: "学校 A",
  type: "school",
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

  it("allows admins to access the fixed configuration route", () => {
    expect(
      resolveTenantRouteAccess(
        { path: "/system/menu-config", meta: { fixedSystem: true } },
        "admin",
        cloneTenantTemplate(school),
      ),
    ).toEqual({ kind: "allow" });
  });

  it("redirects teachers away from the fixed configuration route", () => {
    expect(
      resolveTenantRouteAccess(
        { path: "/system/menu-config", meta: { fixedSystem: true } },
        "teacher",
        cloneTenantTemplate(school),
      ),
    ).toEqual({ kind: "redirect", path: "/family-interaction/notice" });
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
