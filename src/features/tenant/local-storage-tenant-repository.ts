import { MOCK_TENANTS } from "@/config/mock";
import type { TenantRepository, TenantRepositoryLoadResult } from "@/features/tenant/tenant-repository";
import type { TenantInfo, TenantType } from "@/types/user";
import {
  defaultAdministrativeRegionForTenant,
  normalizeTenantAdministrativeRegion,
} from "@/features/tenant/administrative-region";

export const tenantStorageKey = "operation-platform:tenants:v1";

const TENANT_TYPES = new Set<TenantType>(["school", "bureau", "org", "platform"]);

export class TenantPersistenceError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "TenantPersistenceError";
    this.cause = cause;
  }
}

function invalidTenantStorageKey(timestamp: number) {
  return `operation-platform:tenants:invalid:${timestamp}`;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isTenant(value: unknown): value is TenantInfo {
  if (!value || typeof value !== "object") return false;
  const item = value as TenantInfo;
  return (
    isNonEmptyString(item.id) &&
    isNonEmptyString(item.name) &&
    isNonEmptyString(item.shortName) &&
    TENANT_TYPES.has(item.type) &&
    typeof item.enabled === "boolean"
  );
}

function normalizeTenant(tenant: TenantInfo): TenantInfo {
  const administrativeRegion = normalizeTenantAdministrativeRegion(tenant.administrativeRegion)
    ?? defaultAdministrativeRegionForTenant(tenant);
  return {
    ...tenant,
    name: tenant.name.trim(),
    shortName: tenant.shortName.trim(),
    enabled: tenant.type === "platform" ? true : tenant.enabled !== false,
    administrativeRegion,
  };
}

function normalizeTenants(tenants: TenantInfo[]) {
  return tenants.map(normalizeTenant).sort((a, b) => {
    const typeOrder = ["platform", "school", "bureau", "org"];
    return typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type) || a.name.localeCompare(b.name, "zh-CN");
  });
}

function defaultTenants() {
  return normalizeTenants(MOCK_TENANTS.map((tenant) => ({ ...tenant, enabled: tenant.enabled !== false })));
}

function isValidTenantSet(value: unknown): value is TenantInfo[] {
  if (!Array.isArray(value) || !value.every(isTenant)) return false;
  const ids = new Set(value.map((tenant) => tenant.id));
  if (ids.size !== value.length) return false;
  const names = new Set(value.map((tenant) => tenant.name.trim()));
  if (names.size !== value.length) return false;
  return value.some((tenant) => tenant.type === "platform" && tenant.enabled);
}

export class LocalStorageTenantRepository implements TenantRepository {
  constructor(
    private readonly storage: Storage,
    private readonly now: () => number = Date.now,
  ) {}

  list(): TenantRepositoryLoadResult {
    const raw = this.storage.getItem(tenantStorageKey);
    if (!raw) return { tenants: this.persistDefault(), recoveryNotice: null };

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!isValidTenantSet(parsed)) return this.recoverInvalidData(raw);
      return { tenants: normalizeTenants(parsed), recoveryNotice: null };
    } catch (error) {
      if (error instanceof TenantPersistenceError) throw error;
      return this.recoverInvalidData(raw);
    }
  }

  replace(tenants: TenantInfo[]) {
    const normalized = normalizeTenants(tenants);
    if (!isValidTenantSet(normalized)) {
      throw new Error("Invalid tenant records");
    }
    try {
      this.storage.setItem(tenantStorageKey, JSON.stringify(normalized));
    } catch (error) {
      throw new TenantPersistenceError("组织数据保存失败，请检查浏览器存储空间", error);
    }
    return normalized;
  }

  reset() {
    return this.persistDefault();
  }

  private persistDefault() {
    return this.replace(defaultTenants());
  }

  private recoverInvalidData(raw: string): TenantRepositoryLoadResult {
    try {
      this.storage.setItem(invalidTenantStorageKey(this.now()), raw);
    } catch (error) {
      throw new TenantPersistenceError("组织数据备份失败，无法恢复默认组织", error);
    }
    return {
      tenants: this.persistDefault(),
      recoveryNotice: "组织数据已损坏，已恢复默认组织模板。",
    };
  }
}

export const tenantRepository = new LocalStorageTenantRepository(window.localStorage);
