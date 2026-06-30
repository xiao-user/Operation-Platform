import { pageRegistryByKey } from "@/config/page-registry";
import { buildMenuTree } from "@/features/menu-config/menu-tree";
import type { MenuConfigRecord, MenuTreeNode } from "@/features/menu-config/types";
import type { UserRole } from "@/types/user";

interface RouteAccessTarget {
  path: string;
  meta: Record<string, unknown>;
}

export type TenantRouteAccessResult =
  | { kind: "allow" }
  | { kind: "redirect"; path: string }
  | { kind: "empty" };

function firstInternalPath(nodes: readonly MenuTreeNode[]): string | null {
  for (const node of nodes) {
    if (!node.visible) continue;
    if (node.type === "page" && node.pageKey) {
      const page = pageRegistryByKey.get(node.pageKey);
      if (page) return page.path;
    }
    const childPath = firstInternalPath(node.children);
    if (childPath) return childPath;
  }
  return null;
}

export function resolveFirstTenantInternalPath(records: readonly MenuConfigRecord[]) {
  return firstInternalPath(buildMenuTree(records));
}

function isVisibleMenuOwner(ownerKey: string, records: readonly MenuConfigRecord[]) {
  const owner = records.find(
    (record) => record.type === "page" && record.pageKey === ownerKey,
  );
  if (!owner?.visible) return false;

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

export function resolveTenantRouteAccess(
  to: RouteAccessTarget,
  role: UserRole,
  records: readonly MenuConfigRecord[],
): TenantRouteAccessResult {
  const fallbackPath = resolveFirstTenantInternalPath(records);

  if (to.meta.fixedSystem === true) {
    if (role === "admin") return { kind: "allow" };
    return fallbackPath ? { kind: "redirect", path: fallbackPath } : { kind: "empty" };
  }

  const pageKey = typeof to.meta.pageKey === "string" ? to.meta.pageKey : "";
  if (!pageKey) return { kind: "allow" };
  const registeredPage = pageRegistryByKey.get(pageKey);
  const ownerKey =
    typeof to.meta.menuOwnerKey === "string"
      ? to.meta.menuOwnerKey
      : registeredPage?.menuOwnerKey ?? pageKey;

  if (isVisibleMenuOwner(ownerKey, records)) return { kind: "allow" };
  return fallbackPath ? { kind: "redirect", path: fallbackPath } : { kind: "empty" };
}
