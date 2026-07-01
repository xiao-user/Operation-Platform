import { describe, expect, it } from "vitest";
import { DEVELOPING_PAGE_KEY } from "@/config/page-registry";
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
  [
    DEVELOPING_PAGE_KEY,
    {
      key: DEVELOPING_PAGE_KEY,
      path: "/developing/:menuId",
      tenantTypes: ["school"] as const,
      allowDuplicateMenuBinding: true,
    },
  ],
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

  it("allows directories nested below directories until the third level", () => {
    const records = [
      menu({ id: "module", type: "module", name: "校园安全" }),
      menu({ id: "directory", type: "directory", name: "门禁", parentId: "module" }),
    ];
    const candidate = menu({ id: "nested", type: "directory", name: "设备", parentId: "directory" });

    expect(validateMenuRecord(candidate, records, context)).toEqual([]);
  });

  it("rejects directories at the fourth level", () => {
    const records = [
      menu({ id: "module", type: "module", name: "校园安全" }),
      menu({ id: "level-2", type: "directory", name: "二级", parentId: "module" }),
      menu({ id: "level-3", type: "directory", name: "三级", parentId: "level-2" }),
    ];
    const candidate = menu({ id: "level-4-dir", type: "directory", name: "四级目录", parentId: "level-3" });

    expect(validateMenuRecord(candidate, records, context)).toContain("directory-depth-exceeded");
  });

  it("allows page menus at the fourth level", () => {
    const records = [
      menu({ id: "module", type: "module", name: "校园安全" }),
      menu({ id: "level-2", type: "directory", name: "二级", parentId: "module" }),
      menu({ id: "level-3", type: "directory", name: "三级", parentId: "level-2" }),
    ];
    const candidate = menu({
      id: "level-4-page",
      type: "page",
      name: "四级页面",
      parentId: "level-3",
      pageKey: DEVELOPING_PAGE_KEY,
    });

    expect(validateMenuRecord(candidate, records, context)).toEqual([]);
  });

  it("rejects moves that would push descendants deeper than the fourth level", () => {
    const records = [
      menu({ id: "module", type: "module", name: "校园安全" }),
      menu({ id: "source-2", type: "directory", name: "来源二级", parentId: "module" }),
      menu({ id: "source-3", type: "directory", name: "来源三级", parentId: "source-2" }),
      menu({
        id: "source-4-page",
        type: "page",
        name: "来源四级页面",
        parentId: "source-3",
        pageKey: DEVELOPING_PAGE_KEY,
      }),
      menu({ id: "target-2", type: "directory", name: "目标二级", parentId: "module" }),
      menu({ id: "target-3", type: "directory", name: "目标三级", parentId: "target-2" }),
    ];
    const candidate = menu({ id: "source-3", type: "directory", name: "来源三级", parentId: "target-3" });

    expect(validateMenuRecord(candidate, records, context)).toContain("menu-depth-exceeded");
  });

  it("rejects a page key already used by the tenant", () => {
    const records = [
      menu({ id: "module", type: "module", name: "校园安全" }),
      menu({ id: "existing", type: "page", name: "设备列表", parentId: "module", pageKey: "device-list" }),
    ];
    const candidate = menu({ id: "new", type: "page", name: "另一入口", parentId: "module", pageKey: "device-list" });

    expect(validateMenuRecord(candidate, records, context)).toContain("duplicate-page-key");
  });

  it("allows the developing placeholder page to be reused by multiple menus", () => {
    const records = [
      menu({ id: "module", type: "module", name: "校园安全" }),
      menu({
        id: "existing",
        type: "page",
        name: "占位页面一",
        parentId: "module",
        pageKey: DEVELOPING_PAGE_KEY,
      }),
    ];
    const candidate = menu({
      id: "new",
      type: "page",
      name: "占位页面二",
      parentId: "module",
      pageKey: DEVELOPING_PAGE_KEY,
    });

    expect(validateMenuRecord(candidate, records, context)).not.toContain("duplicate-page-key");
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
