import { describe, expect, it } from "vitest";
import {
  DEVELOPING_PAGE_KEY,
  listSelectablePageResources,
  pageRegistry,
  pageRegistryByKey,
  pageResourceOptionLabel,
  resolvePagePathForMenu,
} from "@/config/page-registry";
import type { MenuConfigRecord } from "@/features/menu-config/types";

describe("page registry", () => {
  it("uses unique stable keys and paths", () => {
    expect(new Set(pageRegistry.map((page) => page.key)).size).toBe(pageRegistry.length);
    expect(new Set(pageRegistry.map((page) => page.path)).size).toBe(pageRegistry.length);
  });

  it("registers the existing device and organization review pages", () => {
    expect(pageRegistryByKey.get("device-list")?.path).toBe("/security/new-gate/device-list");
    expect(pageRegistryByKey.get("bureau-org-review")?.path).toBe("/bureau/custody/org/review");
    expect(pageRegistryByKey.get("bureau-org-review-detail")?.path).toBe(
      "/bureau/custody/org/review/:id",
    );
    expect(pageRegistryByKey.get("device-list")?.status).toBe("available");
    expect(pageRegistryByKey.get("family-notice")?.status).toBe("developing-placeholder");
  });

  it("declares at least one tenant type for every page", () => {
    expect(pageRegistry.every((page) => page.tenantTypes.length > 0)).toBe(true);
  });

  it("registers menu configuration as an operation platform admin page", () => {
    expect(pageRegistryByKey.get("system-organization-management")).toMatchObject({
      path: "/system/organization",
      tenantTypes: ["platform"],
      requiresAdmin: true,
    });
    expect(pageRegistryByKey.get("system-role-management")).toMatchObject({
      path: "/system/roles",
      tenantTypes: ["platform"],
      requiresAdmin: true,
    });
    expect(pageRegistryByKey.get("system-menu-config")).toMatchObject({
      path: "/system/menu-config",
      tenantTypes: ["platform"],
      requiresAdmin: true,
    });
    expect(pageRegistryByKey.has("system-permission-management")).toBe(false);
  });

  it("registers the regional overview as a standalone new-tab page", () => {
    expect(pageRegistryByKey.get("bureau-regional-education-overview")).toMatchObject({
      title: "区域教育总览",
      path: "/bureau/visualization/regional-education-overview",
      tenantTypes: ["bureau"],
      status: "available",
      surface: "standalone",
      openMode: "new-tab",
    });
  });

  it("registers the smart sports cockpit as a standalone new-tab page", () => {
    expect(pageRegistryByKey.get("bureau-smart-sports-cockpit")).toMatchObject({
      title: "智慧体育数据驾驶舱",
      path: "/bureau/ai-precision-teaching/smart-sports/cockpit",
      tenantTypes: ["bureau"],
      status: "available",
      surface: "standalone",
      openMode: "new-tab",
    });
  });

  it("registers the bureau student growth portrait as an available shell page", () => {
    expect(pageRegistryByKey.get("bureau-student-growth-portrait")).toMatchObject({
      title: "学生成长画像",
      path: "/bureau/education-governance/student-growth-portrait",
      tenantTypes: ["bureau"],
      status: "available",
      surface: "shell",
      openMode: "current",
    });
  });

  it("registers a reusable menu-scoped developing placeholder page", () => {
    const page = pageRegistryByKey.get(DEVELOPING_PAGE_KEY);

    expect(page).toMatchObject({
      title: "功能开发中缺省页",
      path: "/developing/:menuId",
      status: "developing-placeholder",
      selectable: true,
      allowDuplicateMenuBinding: true,
      menuRouteParam: "menuId",
    });
    expect(page?.tenantTypes).toEqual(["school", "bureau", "org", "platform"]);
    expect(page ? resolvePagePathForMenu(page, "menu-123") : "").toBe("/developing/menu-123");
  });

  it("lists selectable page resources by tenant and occupied menu binding", () => {
    const records: MenuConfigRecord[] = [{
      id: "menu-device-list",
      tenantId: "school-a",
      parentId: "module-a",
      type: "page",
      name: "设备列表",
      icon: null,
      pageKey: "device-list",
      externalUrl: null,
      externalOpenMode: null,
      sort: 10,
      visible: true,
    }];

    expect(
      listSelectablePageResources({ tenantType: "school", records })
        .some((page) => page.key === "device-list"),
    ).toBe(false);
    expect(
      listSelectablePageResources({
        tenantType: "school",
        records,
        editingRecordId: "menu-device-list",
      }).some((page) => page.key === "device-list"),
    ).toBe(true);
    expect(
      listSelectablePageResources({ tenantType: "school", records })
        .filter((page) => page.key === DEVELOPING_PAGE_KEY),
    ).toHaveLength(1);
  });

  it("uses page resource labels that expose both page name and route", () => {
    const page = pageRegistryByKey.get("device-list")!;

    expect(pageResourceOptionLabel(page)).toBe("[已开发] 设备列表 · /security/new-gate/device-list");
  });
});
