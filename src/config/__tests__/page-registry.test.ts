import { describe, expect, it } from "vitest";
import {
  DEVELOPING_PAGE_KEY,
  pageRegistry,
  pageRegistryByKey,
  resolvePagePathForMenu,
} from "@/config/page-registry";

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
  });

  it("declares at least one tenant type for every page", () => {
    expect(pageRegistry.every((page) => page.tenantTypes.length > 0)).toBe(true);
  });

  it("registers menu configuration as an operation platform admin page", () => {
    expect(pageRegistryByKey.get("system-menu-config")).toMatchObject({
      path: "/system/menu-config",
      tenantTypes: ["platform"],
      requiresAdmin: true,
    });
  });

  it("registers a reusable menu-scoped developing placeholder page", () => {
    const page = pageRegistryByKey.get(DEVELOPING_PAGE_KEY);

    expect(page).toMatchObject({
      path: "/developing/:menuId",
      selectable: true,
      allowDuplicateMenuBinding: true,
      menuRouteParam: "menuId",
    });
    expect(page?.tenantTypes).toEqual(["school", "bureau", "org", "platform"]);
    expect(page ? resolvePagePathForMenu(page, "menu-123") : "").toBe("/developing/menu-123");
  });
});
