import { describe, expect, it } from "vitest";
import {
  filterMenuTreeByRole,
  isRecordPermittedWithAncestors,
  resolveAccessRole,
  resolveFirstPermittedInternalPath,
} from "@/features/access-control/menu-permissions";
import { ADMIN_ROLE_ID, STAFF_ROLE_ID, type RoleRecord } from "@/features/access-control/types";
import { buildMenuTree } from "@/features/menu-config/menu-tree";
import type { MenuConfigRecord } from "@/features/menu-config/types";

const records: MenuConfigRecord[] = [
  {
    id: "module-a",
    tenantId: "tenant-a",
    parentId: null,
    type: "module",
    name: "一级模块",
    icon: null,
    pageKey: null,
    externalUrl: null,
    externalOpenMode: null,
    sort: 10,
    visible: true,
  },
  {
    id: "dir-b",
    tenantId: "tenant-a",
    parentId: "module-a",
    type: "directory",
    name: "二级目录",
    icon: null,
    pageKey: null,
    externalUrl: null,
    externalOpenMode: null,
    sort: 10,
    visible: true,
  },
  {
    id: "dir-c",
    tenantId: "tenant-a",
    parentId: "dir-b",
    type: "directory",
    name: "三级目录",
    icon: null,
    pageKey: null,
    externalUrl: null,
    externalOpenMode: null,
    sort: 10,
    visible: true,
  },
  {
    id: "page-d",
    tenantId: "tenant-a",
    parentId: "dir-c",
    type: "page",
    name: "四级页面",
    icon: null,
    pageKey: "developing-placeholder",
    externalUrl: null,
    externalOpenMode: null,
    sort: 10,
    visible: true,
  },
  {
    id: "page-hidden",
    tenantId: "tenant-a",
    parentId: "dir-b",
    type: "page",
    name: "隐藏页面",
    icon: null,
    pageKey: "developing-placeholder",
    externalUrl: null,
    externalOpenMode: null,
    sort: 20,
    visible: false,
  },
];

function role(menuIds: string[]): RoleRecord {
  return {
    id: STAFF_ROLE_ID,
    tenantId: "tenant-a",
    name: "老师",
    description: "",
    builtIn: true,
    enabled: true,
    sort: 20,
    menuIds,
  };
}

describe("menu permissions", () => {
  it("keeps parent navigation nodes when a role only has a leaf page grant", () => {
    const filtered = filterMenuTreeByRole(buildMenuTree(records), role(["page-d"]));

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.name).toBe("一级模块");
    expect(filtered[0]?.children[0]?.name).toBe("二级目录");
    expect(filtered[0]?.children[0]?.children[0]?.name).toBe("三级目录");
    expect(filtered[0]?.children[0]?.children[0]?.children[0]?.name).toBe("四级页面");
  });

  it("blocks hidden menus even when the role still carries the grant", () => {
    expect(isRecordPermittedWithAncestors(records.find((record) => record.id === "page-hidden"), records, role(["page-hidden"]))).toBe(false);
  });

  it("resolves the first accessible route from role-filtered menus", () => {
    expect(resolveFirstPermittedInternalPath(records, role(["page-d"]))).toBe("/developing/page-d");
  });

  it("merges menu permissions from multiple roles", () => {
    const extraPage: MenuConfigRecord = {
      ...records[3]!,
      id: "page-extra",
      name: "额外页面",
      sort: 20,
    };
    const filtered = filterMenuTreeByRole(buildMenuTree([...records, extraPage]), [
      role(["page-d"]),
      { ...role(["page-extra"]), id: "role-extra", name: "额外角色" },
    ]);

    const leafNames = filtered[0]!.children[0]!.children[0]!.children.map((node) => node.name);
    expect(leafNames).toEqual(["四级页面", "额外页面"]);
  });

  it("keeps admin pages admin-only regardless of custom role menu ids", () => {
    const systemPage: MenuConfigRecord = {
      ...records[3]!,
      id: "system-menu-config",
      pageKey: "system-menu-config",
      visible: true,
    };

    expect(
      isRecordPermittedWithAncestors(systemPage, [records[0]!, records[1]!, records[2]!, systemPage], role(["system-menu-config"])),
    ).toBe(false);
    expect(
      isRecordPermittedWithAncestors(
        systemPage,
        [records[0]!, records[1]!, records[2]!, systemPage],
        [{ ...role([]), id: ADMIN_ROLE_ID, name: "管理员", menuIds: [] }],
      ),
    ).toBe(true);
  });

  it("does not synthesize permissions for a missing or disabled role", () => {
    const disabled = { ...role(["page-d"]), enabled: false };

    expect(resolveAccessRole("unknown", [disabled], records)).toBeNull();
    expect(resolveAccessRole(STAFF_ROLE_ID, [disabled], records)).toBeNull();
    expect(filterMenuTreeByRole(buildMenuTree(records), null)).toEqual([]);
  });
});
