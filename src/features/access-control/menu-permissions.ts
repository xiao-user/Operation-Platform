import { pageRegistryByKey, resolvePagePathForMenu } from "@/config/page-registry";
import { ADMIN_ROLE_ID, type RoleRecord } from "@/features/access-control/types";
import { buildMenuTree } from "@/features/menu-config/menu-tree";
import type { MenuConfigRecord, MenuTreeNode } from "@/features/menu-config/types";

export function isAdminRole(roleId: string) {
  return roleId === ADMIN_ROLE_ID;
}

export function resolveAccessRole(
  roleId: string | null,
  roles: readonly RoleRecord[],
  _records: readonly MenuConfigRecord[],
): RoleRecord | null {
  if (!roleId) return null;
  const found = roles.find((role) => role.id === roleId && role.enabled);
  return found ?? null;
}

export function roleCanAccessPage(pageKey: string, role: RoleRecord | null) {
  if (!role) return false;
  const page = pageRegistryByKey.get(pageKey);
  return Boolean(page && (!page.requiresAdmin || role.id === ADMIN_ROLE_ID));
}

export function roleCanAccessRecord(record: MenuConfigRecord, role: RoleRecord | null) {
  if (!role) return false;
  if (!record.visible) return false;
  if (record.type !== "page" && record.type !== "external") return true;
  if (record.type === "page") {
    if (!record.pageKey || !roleCanAccessPage(record.pageKey, role)) return false;
  }
  return role.id === ADMIN_ROLE_ID || role.menuIds.includes(record.id);
}

export function filterMenuTreeByRole(
  nodes: readonly MenuTreeNode[],
  role: RoleRecord | null,
): MenuTreeNode[] {
  if (!role) return [];
  return nodes.flatMap((node) => {
    if (!node.visible) return [];

    const children = filterMenuTreeByRole(node.children, role);
    if (node.type === "module" || node.type === "directory") {
      return children.length ? [{ ...node, children }] : [];
    }

    return roleCanAccessRecord(node, role) ? [{ ...node, children: [] }] : [];
  });
}

export function resolveFirstPermittedInternalPath(
  records: readonly MenuConfigRecord[],
  role: RoleRecord | null,
) {
  if (!role) return null;
  const tree = filterMenuTreeByRole(buildMenuTree(records), role);
  const visit = (nodes: readonly MenuTreeNode[]): string | null => {
    for (const node of nodes) {
      if (node.type === "page" && node.pageKey) {
        const page = pageRegistryByKey.get(node.pageKey);
        if (page && roleCanAccessPage(node.pageKey, role)) {
          return resolvePagePathForMenu(page, node.id);
        }
      }
      const childPath = visit(node.children);
      if (childPath) return childPath;
    }
    return null;
  };
  return visit(tree);
}

export function isRecordPermittedWithAncestors(
  owner: MenuConfigRecord | undefined,
  records: readonly MenuConfigRecord[],
  role: RoleRecord | null,
) {
  if (!role) return false;
  if (!owner || !roleCanAccessRecord(owner, role)) return false;

  const byId = new Map(records.map((record) => [record.id, record]));
  let current: MenuConfigRecord | undefined = owner;
  const visited = new Set<string>();

  while (current?.parentId) {
    if (visited.has(current.id)) return false;
    visited.add(current.id);
    current = byId.get(current.parentId);
    if (!current?.visible) return false;
  }

  return current?.type === "module";
}
