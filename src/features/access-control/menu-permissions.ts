import { pageRegistryByKey, resolvePagePathForMenu } from "@/config/page-registry";
import { ADMIN_ROLE_ID, type RoleRecord } from "@/features/access-control/types";
import { buildMenuTree } from "@/features/menu-config/menu-tree";
import type { MenuConfigRecord, MenuTreeNode } from "@/features/menu-config/types";

export type RoleAccess = RoleRecord | readonly RoleRecord[] | null;

export function isAdminRole(roleId: string) {
  return roleId === ADMIN_ROLE_ID;
}

function isRoleRecordArray(roleAccess: RoleAccess): roleAccess is readonly RoleRecord[] {
  return Array.isArray(roleAccess);
}

function normalizeRoleAccess(roleAccess: RoleAccess): RoleRecord[] {
  if (!roleAccess) return [];
  return isRoleRecordArray(roleAccess) ? [...roleAccess] : [roleAccess];
}

export function isAdminAccess(roleAccess: RoleAccess) {
  return normalizeRoleAccess(roleAccess).some((role) => role.id === ADMIN_ROLE_ID);
}

export function resolveAccessRoles(
  roleIds: string | readonly string[] | null,
  roles: readonly RoleRecord[],
  _records: readonly MenuConfigRecord[],
): RoleRecord[] {
  if (!roleIds) return [];
  const requested = new Set(
    (Array.isArray(roleIds) ? roleIds : [roleIds]).filter(Boolean),
  );
  return roles.filter((role) => requested.has(role.id) && role.enabled);
}

export function resolveAccessRole(
  roleId: string | null,
  roles: readonly RoleRecord[],
  records: readonly MenuConfigRecord[],
): RoleRecord | null {
  return resolveAccessRoles(roleId, roles, records)[0] ?? null;
}

export function roleCanAccessPage(pageKey: string, roleAccess: RoleAccess) {
  const activeRoles = normalizeRoleAccess(roleAccess);
  if (!activeRoles.length) return false;
  const page = pageRegistryByKey.get(pageKey);
  return Boolean(page && (!page.requiresAdmin || isAdminAccess(activeRoles)));
}

export function roleCanAccessRecord(record: MenuConfigRecord, roleAccess: RoleAccess) {
  const activeRoles = normalizeRoleAccess(roleAccess);
  if (!activeRoles.length) return false;
  if (!record.visible) return false;
  if (record.type !== "page" && record.type !== "external") return true;
  if (record.type === "page") {
    if (!record.pageKey || !roleCanAccessPage(record.pageKey, activeRoles)) return false;
  }
  return isAdminAccess(activeRoles) || activeRoles.some((role) => role.menuIds.includes(record.id));
}

export function filterMenuTreeByRole(
  nodes: readonly MenuTreeNode[],
  roleAccess: RoleAccess,
): MenuTreeNode[] {
  const activeRoles = normalizeRoleAccess(roleAccess);
  if (!activeRoles.length) return [];
  return nodes.flatMap((node) => {
    if (!node.visible) return [];

    const children = filterMenuTreeByRole(node.children, activeRoles);
    if (node.type === "module" || node.type === "directory") {
      return children.length ? [{ ...node, children }] : [];
    }

    return roleCanAccessRecord(node, activeRoles) ? [{ ...node, children: [] }] : [];
  });
}

export function resolveFirstPermittedInternalPath(
  records: readonly MenuConfigRecord[],
  roleAccess: RoleAccess,
) {
  const activeRoles = normalizeRoleAccess(roleAccess);
  if (!activeRoles.length) return null;
  const tree = filterMenuTreeByRole(buildMenuTree(records), activeRoles);
  const visit = (nodes: readonly MenuTreeNode[]): string | null => {
    for (const node of nodes) {
      if (node.type === "page" && node.pageKey) {
        const page = pageRegistryByKey.get(node.pageKey);
        if (page && roleCanAccessPage(node.pageKey, activeRoles)) {
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
  roleAccess: RoleAccess,
) {
  const activeRoles = normalizeRoleAccess(roleAccess);
  if (!activeRoles.length) return false;
  if (!owner || !roleCanAccessRecord(owner, activeRoles)) return false;

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
