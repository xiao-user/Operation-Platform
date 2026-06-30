import { describe, expect, it } from "vitest";
import { validateMenuRecord } from "@/features/menu-config/menu-validation";
import type { MenuConfigRecord } from "@/features/menu-config/types";

function menu(overrides: Partial<MenuConfigRecord> & Pick<MenuConfigRecord, "id" | "type" | "name">): MenuConfigRecord {
  return {
    tenantId: "school-001",
    parentId: null,
    icon: null,
    pageKey: null,
    externalUrl: null,
    externalOpenMode: null,
    sort: 0,
    visible: true,
    ...overrides,
  };
}

const pages = new Map([
  ["device-list", { key: "device-list", path: "/security/new-gate/device-list", tenantTypes: ["school"] as const }],
  ["bureau-list", { key: "bureau-list", path: "/bureau/list", tenantTypes: ["bureau"] as const }],
]);

const context = { tenantType: "school" as const, pages };

describe("menu validation", () => {
  it("rejects duplicate sibling names", () => {
    const records = [
      menu({ id: "module", type: "module", name: "校园安全" }),
      menu({ id: "existing", type: "page", name: "设备列表", parentId: "module", pageKey: "device-list" }),
    ];
    const candidate = menu({ id: "new", type: "external", name: "设备列表", parentId: "module", externalUrl: "https://example.com", externalOpenMode: "new-tab" });

    expect(validateMenuRecord(candidate, records, context)).toContain("duplicate-sibling-name");
  });

  it("rejects directories nested below directories", () => {
    const records = [
      menu({ id: "module", type: "module", name: "校园安全" }),
      menu({ id: "directory", type: "directory", name: "门禁", parentId: "module" }),
    ];
    const candidate = menu({ id: "nested", type: "directory", name: "设备", parentId: "directory" });

    expect(validateMenuRecord(candidate, records, context)).toContain("directory-depth-exceeded");
  });

  it("rejects a page key already used by the tenant", () => {
    const records = [
      menu({ id: "module", type: "module", name: "校园安全" }),
      menu({ id: "existing", type: "page", name: "设备列表", parentId: "module", pageKey: "device-list" }),
    ];
    const candidate = menu({ id: "new", type: "page", name: "另一入口", parentId: "module", pageKey: "device-list" });

    expect(validateMenuRecord(candidate, records, context)).toContain("duplicate-page-key");
  });

  it("rejects pages unavailable to the tenant type", () => {
    const records = [menu({ id: "module", type: "module", name: "校园安全" })];
    const candidate = menu({ id: "new", type: "page", name: "教育局列表", parentId: "module", pageKey: "bureau-list" });

    expect(validateMenuRecord(candidate, records, context)).toContain("page-not-available");
  });

  it("rejects external protocols other than http and https", () => {
    const records = [menu({ id: "module", type: "module", name: "校园安全" })];
    const candidate = menu({ id: "external", type: "external", name: "危险链接", parentId: "module", externalUrl: "javascript:alert(1)", externalOpenMode: "current" });

    expect(validateMenuRecord(candidate, records, context)).toContain("invalid-external-url");
  });

  it("rejects cyclic parent relationships", () => {
    const records = [
      menu({ id: "module", type: "module", name: "校园安全" }),
      menu({ id: "directory", type: "directory", name: "门禁", parentId: "module" }),
      menu({ id: "page", type: "page", name: "设备", parentId: "directory", pageKey: "device-list" }),
    ];
    const candidate = menu({ id: "module", type: "module", name: "校园安全", parentId: "page" });

    expect(validateMenuRecord(candidate, records, context)).toContain("cyclic-parent");
  });
});
