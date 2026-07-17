import { ADMIN_ROLE_ID, type RoleRecord } from "@/features/access-control/types";
import { createDefaultRoles } from "@/features/access-control/default-roles";
import type { RoleRepository, RoleRepositoryLoadResult } from "@/features/access-control/role-repository";
import type { MenuConfigRecord } from "@/features/menu-config/types";
import type { TenantInfo } from "@/types/user";

export { createDefaultRoles } from "@/features/access-control/default-roles";

export function tenantRoleStorageKey(tenantId: string) {
  return `operation-platform:tenant-roles:v1:${tenantId}`;
}

function invalidTenantRoleStorageKey(tenantId: string, timestamp: number) {
  return `operation-platform:tenant-roles:invalid:${tenantId}:${timestamp}`;
}

export class RolePersistenceError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "RolePersistenceError";
    this.cause = cause;
  }
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isRole(value: unknown, tenantId: string): value is RoleRecord {
  if (!value || typeof value !== "object") return false;
  const item = value as RoleRecord;
  return (
    isString(item.id) &&
    item.id.length > 0 &&
    item.tenantId === tenantId &&
    isString(item.name) &&
    item.name.trim().length > 0 &&
    isString(item.description) &&
    typeof item.builtIn === "boolean" &&
    typeof item.enabled === "boolean" &&
    typeof item.sort === "number" &&
    Array.isArray(item.menuIds) &&
    item.menuIds.every(isString)
  );
}

function normalizeRole(role: RoleRecord): RoleRecord {
  return {
    ...role,
    name: role.name.trim(),
    description: role.description.trim(),
    enabled: role.id === ADMIN_ROLE_ID ? true : role.enabled,
    menuIds: Array.from(new Set(role.menuIds)),
  };
}

function normalizeRoles(roles: RoleRecord[]) {
  return roles
    .map(normalizeRole)
    .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "zh-CN"));
}

function isValidRoleSet(value: unknown, tenantId: string): value is RoleRecord[] {
  if (!Array.isArray(value) || !value.every((item) => isRole(item, tenantId))) return false;
  const ids = new Set(value.map((role) => role.id));
  if (ids.size !== value.length) return false;
  const admin = value.find((role) => role.id === ADMIN_ROLE_ID);
  return Boolean(admin?.builtIn && admin.enabled);
}

export class LocalStorageTenantRoleRepository implements RoleRepository {
  constructor(
    private readonly storage: Storage,
    private readonly now: () => number = Date.now,
  ) {}

  list(tenant: TenantInfo, records: readonly MenuConfigRecord[]): RoleRepositoryLoadResult {
    const key = tenantRoleStorageKey(tenant.id);
    const raw = this.storage.getItem(key);
    if (!raw) return { roles: this.persistDefault(tenant, records), recoveryNotice: null };

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!isValidRoleSet(parsed, tenant.id)) return this.recoverInvalidData(tenant, records, raw);
      return { roles: normalizeRoles(parsed), recoveryNotice: null };
    } catch (error) {
      if (error instanceof RolePersistenceError) throw error;
      return this.recoverInvalidData(tenant, records, raw);
    }
  }

  replace(tenant: TenantInfo, roles: RoleRecord[]) {
    const normalized = normalizeRoles(roles);
    if (!isValidRoleSet(normalized, tenant.id)) {
      throw new RolePersistenceError("角色权限数据不完整，无法保存");
    }
    try {
      this.storage.setItem(tenantRoleStorageKey(tenant.id), JSON.stringify(normalized));
    } catch (error) {
      throw new RolePersistenceError("角色权限保存失败，请检查浏览器存储空间", error);
    }
    return normalized;
  }

  reset(tenant: TenantInfo, records: readonly MenuConfigRecord[]) {
    return this.persistDefault(tenant, records);
  }

  private persistDefault(tenant: TenantInfo, records: readonly MenuConfigRecord[]) {
    return this.replace(tenant, createDefaultRoles(tenant, records));
  }

  private recoverInvalidData(
    tenant: TenantInfo,
    records: readonly MenuConfigRecord[],
    raw: string,
  ): RoleRepositoryLoadResult {
    try {
      this.storage.setItem(invalidTenantRoleStorageKey(tenant.id, this.now()), raw);
    } catch (error) {
      throw new RolePersistenceError("角色权限备份失败，无法恢复默认角色", error);
    }
    return {
      roles: this.persistDefault(tenant, records),
      recoveryNotice: "角色权限数据已损坏，已恢复默认角色模板。",
    };
  }
}

export const tenantRoleRepository = new LocalStorageTenantRoleRepository(window.localStorage);
