import { pageRegistryByKey } from "@/config/page-registry";
import {
  isAdminAccess,
  isRecordPermittedWithAncestors,
  resolveAccessRoles,
  resolveFirstPermittedInternalPath,
} from "@/features/access-control/menu-permissions";
import type { RoleRecord } from "@/features/access-control/types";
import { defaultTenantShellConfig } from "@/features/shell-config/default-shell-config";
import type { MenuConfigRecord } from "@/features/menu-config/types";
import type { TenantShellConfig } from "@/features/shell-config/types";
import type { UserRole } from "@/types/user";

type RouteRoleInput = UserRole | readonly UserRole[] | null;

interface RouteAccessTarget {
  path: string;
  meta: Record<string, unknown>;
  params?: Record<string, unknown>;
}

export type TenantRouteAccessResult =
  | { kind: "allow" }
  | { kind: "redirect"; path: string }
  | { kind: "empty" };

export function resolveFirstTenantInternalPath(
  records: readonly MenuConfigRecord[],
  role: RouteRoleInput,
  roles: readonly RoleRecord[] = [],
) {
  if (!roles.length) return null;
  return resolveFirstPermittedInternalPath(
    records,
    resolveAccessRoles(role, roles, records),
  );
}

function routeParamValue(params: Record<string, unknown> | undefined, key: string) {
  const value = params?.[key];
  if (Array.isArray(value)) return value[0];
  return typeof value === "string" ? value : "";
}

export function resolveTenantRouteAccess(
  to: RouteAccessTarget,
  role: RouteRoleInput,
  records: readonly MenuConfigRecord[],
  shellConfig: TenantShellConfig = defaultTenantShellConfig(),
  roles: readonly RoleRecord[] = [],
): TenantRouteAccessResult {
  const activeRoles = resolveAccessRoles(role, roles, records);
  const fallbackPath = resolveFirstTenantInternalPath(records, role, roles);

  if (!activeRoles.length) return { kind: "empty" };

  if (to.meta.fixedWorkbench === true) {
    if (shellConfig.workbench.enabled) return { kind: "allow" };
    return fallbackPath ? { kind: "redirect", path: fallbackPath } : { kind: "empty" };
  }

  if (to.meta.requiresAdmin === true && !isAdminAccess(activeRoles)) {
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
    const allowed = isRecordPermittedWithAncestors(scopedOwner, records, activeRoles);
    if (allowed) return { kind: "allow" };
    return fallbackPath ? { kind: "redirect", path: fallbackPath } : { kind: "empty" };
  }

  const ownerKey =
    typeof to.meta.menuOwnerKey === "string"
      ? to.meta.menuOwnerKey
      : registeredPage?.menuOwnerKey ?? pageKey;

  const owner = records.find(
    (record) => record.type === "page" && record.pageKey === ownerKey,
  );
  if (isRecordPermittedWithAncestors(owner, records, activeRoles)) return { kind: "allow" };
  return fallbackPath ? { kind: "redirect", path: fallbackPath } : { kind: "empty" };
}
