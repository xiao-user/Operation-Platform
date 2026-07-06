import { pageRegistryByKey } from "@/config/page-registry";
import { ADMIN_ROLE_ID, type RoleRecord } from "@/features/access-control/types";
import { validateMenuRecord } from "@/features/menu-config/menu-validation";
import type { MenuConfigRecord, MenuItemType } from "@/features/menu-config/types";
import type { TenantConfiguration } from "@/features/tenant-config/types";
import type { TenantInfo } from "@/types/user";

const MENU_TYPES = new Set<MenuItemType>(["module", "directory", "page", "external"]);

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isMenuRecord(value: unknown, tenantId: string): value is MenuConfigRecord {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    item.tenantId === tenantId &&
    isNullableString(item.parentId) &&
    typeof item.type === "string" &&
    MENU_TYPES.has(item.type as MenuItemType) &&
    typeof item.name === "string" &&
    isNullableString(item.icon) &&
    isNullableString(item.pageKey) &&
    isNullableString(item.externalUrl) &&
    isNullableString(item.externalOpenMode) &&
    typeof item.sort === "number" &&
    Number.isFinite(item.sort) &&
    typeof item.visible === "boolean"
  );
}

function isValidMenuRecords(value: unknown, tenant: TenantInfo): value is MenuConfigRecord[] {
  if (!Array.isArray(value) || !value.every((item) => isMenuRecord(item, tenant.id))) return false;
  const ids = new Set(value.map((record) => record.id));
  if (ids.size !== value.length) return false;

  return value.every((record) => {
    const errors = validateMenuRecord(record, value, {
      tenantType: tenant.type,
      pages: pageRegistryByKey,
    });
    return errors.length === 0;
  });
}

function isRole(value: unknown, tenantId: string): value is RoleRecord {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    item.tenantId === tenantId &&
    typeof item.name === "string" &&
    item.name.trim().length > 0 &&
    typeof item.description === "string" &&
    typeof item.builtIn === "boolean" &&
    typeof item.enabled === "boolean" &&
    typeof item.sort === "number" &&
    Number.isFinite(item.sort) &&
    Array.isArray(item.menuIds) &&
    item.menuIds.every((menuId) => typeof menuId === "string")
  );
}

function isValidRoles(
  value: unknown,
  tenant: TenantInfo,
  menuRecords: readonly MenuConfigRecord[],
): value is RoleRecord[] {
  if (!Array.isArray(value) || !value.every((role) => isRole(role, tenant.id))) return false;
  const roleIds = new Set(value.map((role) => role.id));
  const roleNames = new Set(value.map((role) => role.name.trim()));
  if (roleIds.size !== value.length || roleNames.size !== value.length) return false;

  const leafMenuIds = new Set(
    menuRecords
      .filter((record) => record.type === "page" || record.type === "external")
      .map((record) => record.id),
  );
  if (value.some((role) => role.menuIds.some((menuId) => !leafMenuIds.has(menuId)))) return false;

  const admin = value.find((role) => role.id === ADMIN_ROLE_ID);
  return Boolean(admin?.builtIn && admin.enabled);
}

function isValidShellConfig(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  if (item.version !== 1 || !item.workbench || typeof item.workbench !== "object") return false;
  const workbench = item.workbench as Record<string, unknown>;
  return (
    typeof workbench.enabled === "boolean" &&
    typeof workbench.label === "string" &&
    workbench.label.trim().length > 0 &&
    typeof workbench.icon === "string" &&
    workbench.icon.length > 0 &&
    typeof workbench.sort === "number" &&
    Number.isFinite(workbench.sort)
  );
}

export function isValidTenantConfiguration(
  value: unknown,
  tenant: TenantInfo,
): value is TenantConfiguration {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<TenantConfiguration>;
  if (item.version !== 1 || !isValidMenuRecords(item.menuRecords, tenant)) return false;
  return (
    isValidShellConfig(item.shellConfig) &&
    isValidRoles(item.roles, tenant, item.menuRecords)
  );
}
