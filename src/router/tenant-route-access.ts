import { pageRegistryByKey, resolvePagePathForMenu } from "@/config/page-registry";
import { buildMenuTree } from "@/features/menu-config/menu-tree";
import { defaultTenantShellConfig } from "@/features/shell-config/local-storage-shell-config-repository";
import type { MenuConfigRecord, MenuTreeNode } from "@/features/menu-config/types";
import type { TenantShellConfig } from "@/features/shell-config/types";
import type { UserRole } from "@/types/user";

interface RouteAccessTarget {
  path: string;
  meta: Record<string, unknown>;
  params?: Record<string, unknown>;
}

export type TenantRouteAccessResult =
  | { kind: "allow" }
  | { kind: "redirect"; path: string }
  | { kind: "empty" };

function canAccessPage(pageKey: string, role: UserRole) {
  const page = pageRegistryByKey.get(pageKey);
  return Boolean(page && (!page.requiresAdmin || role === "admin"));
}

function firstInternalPath(nodes: readonly MenuTreeNode[], role: UserRole): string | null {
  for (const node of nodes) {
    if (!node.visible) continue;
    if (node.type === "page" && node.pageKey) {
      const page = pageRegistryByKey.get(node.pageKey);
      if (page && canAccessPage(node.pageKey, role)) {
        return resolvePagePathForMenu(page, node.id);
      }
    }
    const childPath = firstInternalPath(node.children, role);
    if (childPath) return childPath;
  }
  return null;
}

export function resolveFirstTenantInternalPath(
  records: readonly MenuConfigRecord[],
  role: UserRole = "admin",
) {
  return firstInternalPath(buildMenuTree(records), role);
}

function isVisibleMenuRecord(
  owner: MenuConfigRecord | undefined,
  role: UserRole,
  records: readonly MenuConfigRecord[],
) {
  if (!owner || owner.type !== "page" || !owner.pageKey || !owner.visible) return false;
  if (!canAccessPage(owner.pageKey, role)) return false;

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

function isVisibleMenuOwner(
  ownerKey: string,
  role: UserRole,
  records: readonly MenuConfigRecord[],
) {
  const owner = records.find(
    (record) => record.type === "page" && record.pageKey === ownerKey,
  );
  return isVisibleMenuRecord(owner, role, records);
}

function routeParamValue(params: Record<string, unknown> | undefined, key: string) {
  const value = params?.[key];
  if (Array.isArray(value)) return value[0];
  return typeof value === "string" ? value : "";
}

export function resolveTenantRouteAccess(
  to: RouteAccessTarget,
  role: UserRole,
  records: readonly MenuConfigRecord[],
  shellConfig: TenantShellConfig = defaultTenantShellConfig(),
): TenantRouteAccessResult {
  const fallbackPath = resolveFirstTenantInternalPath(records, role);

  if (to.meta.fixedWorkbench === true) {
    if (shellConfig.workbench.enabled) return { kind: "allow" };
    return fallbackPath ? { kind: "redirect", path: fallbackPath } : { kind: "empty" };
  }

  if (to.meta.fixedSystem === true) {
    if (role === "admin") return { kind: "allow" };
    return fallbackPath ? { kind: "redirect", path: fallbackPath } : { kind: "empty" };
  }

  if (to.meta.requiresAdmin === true && role !== "admin") {
    return fallbackPath ? { kind: "redirect", path: fallbackPath } : { kind: "empty" };
  }

  const pageKey = typeof to.meta.pageKey === "string" ? to.meta.pageKey : "";
  if (!pageKey) return { kind: "allow" };
  const registeredPage = pageRegistryByKey.get(pageKey);
  if (registeredPage?.menuRouteParam) {
    const scopedMenuId = routeParamValue(to.params, registeredPage.menuRouteParam);
    const scopedOwner = records.find(
      (record) =>
        record.id === scopedMenuId &&
        record.type === "page" &&
        record.pageKey === registeredPage.key,
    );
    if (isVisibleMenuRecord(scopedOwner, role, records)) return { kind: "allow" };
    return fallbackPath ? { kind: "redirect", path: fallbackPath } : { kind: "empty" };
  }

  const ownerKey =
    typeof to.meta.menuOwnerKey === "string"
      ? to.meta.menuOwnerKey
      : registeredPage?.menuOwnerKey ?? pageKey;

  if (isVisibleMenuOwner(ownerKey, role, records)) return { kind: "allow" };
  return fallbackPath ? { kind: "redirect", path: fallbackPath } : { kind: "empty" };
}
