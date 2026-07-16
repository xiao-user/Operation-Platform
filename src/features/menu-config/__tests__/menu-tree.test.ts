import { describe, expect, it } from "vitest";
import {
  buildMenuTree,
  collectDescendantIds,
  resolveFirstTarget,
} from "@/features/menu-config/menu-tree";
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

describe("menu tree", () => {
  it("builds a fresh tree and sorts every level", () => {
    const records = [
      menu({ id: "module-a", type: "module", name: "A", sort: 20 }),
      menu({ id: "module-b", type: "module", name: "B", sort: 10 }),
      menu({ id: "page-1", type: "page", name: "页面一", parentId: "module-b", sort: 20, pageKey: "page-1" }),
      menu({ id: "page-2", type: "page", name: "页面二", parentId: "module-b", sort: 10, pageKey: "page-2" }),
    ];

    const tree = buildMenuTree(records);

    expect(tree.map((node) => node.id)).toEqual(["module-b", "module-a"]);
    expect(tree[0]?.children.map((node) => node.id)).toEqual(["page-2", "page-1"]);
    expect(tree[0]).not.toBe(records[1]);
  });

  it("does not expose orphan records in the runtime tree", () => {
    const tree = buildMenuTree([
      menu({ id: "module-a", type: "module", name: "A" }),
      menu({ id: "orphan", type: "page", name: "孤儿", parentId: "missing", pageKey: "orphan" }),
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0]?.children).toEqual([]);
  });

  it("collects every descendant id", () => {
    const records = [
      menu({ id: "module-a", type: "module", name: "A" }),
      menu({ id: "directory-a", type: "directory", name: "目录", parentId: "module-a" }),
      menu({ id: "page-1", type: "page", name: "页面", parentId: "directory-a", pageKey: "page-1" }),
    ];

    expect(collectDescendantIds(records, "module-a")).toEqual(new Set(["directory-a", "page-1"]));
  });

  it("resolves the first visible internal target", () => {
    const [moduleNode] = buildMenuTree([
      menu({ id: "module-a", type: "module", name: "A" }),
      menu({ id: "hidden", type: "page", name: "隐藏", parentId: "module-a", pageKey: "hidden", visible: false, sort: 1 }),
      menu({ id: "academic", type: "page", name: "课程列表", parentId: "module-a", pageKey: "course-list", sort: 2 }),
    ]);
    const pages = new Map([["course-list", { path: "/academic/course-list" }]]);

    expect(resolveFirstTarget(moduleNode!, pages)).toEqual({
      kind: "internal",
      path: "/academic/course-list",
      pageKey: "course-list",
      openMode: "current",
    });
  });

  it("keeps the registered open mode for internal pages", () => {
    const [pageNode] = buildMenuTree([
      menu({ id: "overview", type: "page", name: "区域教育总览", pageKey: "overview" }),
    ]);
    const pages = new Map([
      ["overview", { path: "/bureau/visualization/regional-education-overview", openMode: "new-tab" as const }],
    ]);

    expect(resolveFirstTarget(pageNode!, pages)).toMatchObject({
      kind: "internal",
      pageKey: "overview",
      openMode: "new-tab",
    });
  });

  it("resolves external targets with their configured open mode", () => {
    const [moduleNode] = buildMenuTree([
      menu({ id: "module-a", type: "module", name: "A" }),
      menu({
        id: "external",
        type: "external",
        name: "外部帮助",
        parentId: "module-a",
        externalUrl: "https://example.com/help",
        externalOpenMode: "new-tab",
      }),
    ]);

    expect(resolveFirstTarget(moduleNode!, new Map())).toEqual({
      kind: "external",
      url: "https://example.com/help",
      openMode: "new-tab",
    });
  });
});
