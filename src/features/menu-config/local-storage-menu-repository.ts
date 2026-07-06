import { cloneTenantTemplate } from "@/config/menu-templates";
import type { MenuConfigRecord, MenuItemType } from "@/features/menu-config/types";
import type {
  MenuRepositoryLoadResult,
  TenantMenuRepository,
} from "@/features/menu-config/menu-repository";
import type { TenantInfo } from "@/types/user";

const STORAGE_VERSION = 1;
const MENU_TYPES = new Set<MenuItemType>(["module", "directory", "page", "external"]);

interface StoredTenantMenu {
  version: number;
  records: MenuConfigRecord[];
}

export class MenuPersistenceError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "MenuPersistenceError";
    this.cause = cause;
  }
}

export function tenantMenuStorageKey(tenantId: string) {
  return `operation-platform:tenant-menu:v1:${tenantId}`;
}

function invalidMenuStorageKey(tenantId: string, timestamp: number) {
  return `operation-platform:tenant-menu:invalid:${tenantId}:${timestamp}`;
}

function cloneRecords(records: readonly MenuConfigRecord[]) {
  return records.map((record) => ({ ...record }));
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isRecord(value: unknown, tenantId: string): value is MenuConfigRecord {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
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

function isValidRecordSet(value: unknown, tenantId: string): value is MenuConfigRecord[] {
  if (!Array.isArray(value) || !value.every((item) => isRecord(item, tenantId))) return false;
  const ids = new Set(value.map((item) => item.id));
  if (ids.size !== value.length) return false;
  return value.every((item) => item.parentId === null || ids.has(item.parentId));
}

function rootModuleFor(record: MenuConfigRecord, records: readonly MenuConfigRecord[]) {
  const byId = new Map(records.map((item) => [item.id, item]));
  let current: MenuConfigRecord | undefined = record;
  const visited = new Set<string>();

  while (current?.parentId) {
    if (visited.has(current.id)) return null;
    visited.add(current.id);
    current = byId.get(current.parentId);
  }
  return current?.type === "module" ? current : null;
}

function migratePlatformSystemMenus(tenant: TenantInfo, records: readonly MenuConfigRecord[]) {
  if (tenant.type !== "platform") return cloneRecords(records);

  const nextRecords = cloneRecords(records);
  const requiredPageKeys = [
    "system-organization-management",
    "system-role-management",
    "system-menu-config",
  ];
  const template = cloneTenantTemplate(tenant);
  const templateModule =
    template.find((record) => record.type === "module" && record.name === "系统管理") ??
    template.find((record) => record.type === "module");
  if (!templateModule) return nextRecords;

  const existingMenuConfig = nextRecords.find(
    (record) => record.type === "page" && record.pageKey === "system-menu-config",
  );
  let systemModule =
    nextRecords.find((record) => record.type === "module" && record.name === "系统管理") ??
    (existingMenuConfig ? rootModuleFor(existingMenuConfig, nextRecords) : null);

  if (!systemModule) {
    systemModule = {
      ...templateModule,
      id: crypto.randomUUID(),
      tenantId: tenant.id,
      parentId: null,
    };
    nextRecords.push(systemModule);
  }

  let nextSort =
    Math.max(
      0,
      ...nextRecords
        .filter((record) => record.parentId === systemModule.id)
        .map((record) => record.sort),
    ) + 10;

  for (const pageKey of requiredPageKeys) {
    if (nextRecords.some((record) => record.type === "page" && record.pageKey === pageKey)) {
      continue;
    }
    const templatePage = template.find((record) => record.type === "page" && record.pageKey === pageKey);
    if (!templatePage) continue;
    nextRecords.push({
      ...templatePage,
      id: crypto.randomUUID(),
      tenantId: tenant.id,
      parentId: systemModule.id,
      sort: nextSort,
    });
    nextSort += 10;
  }

  return nextRecords;
}

export class LocalStorageTenantMenuRepository implements TenantMenuRepository {
  constructor(
    private readonly storage: Storage,
    private readonly now: () => number = Date.now,
  ) {}

  list(tenant: TenantInfo): MenuRepositoryLoadResult {
    const key = tenantMenuStorageKey(tenant.id);
    const raw = this.storage.getItem(key);
    if (raw === null) {
      return { records: this.persistTemplate(tenant), recoveryNotice: null };
    }

    try {
      const parsed = JSON.parse(raw) as Partial<StoredTenantMenu>;
      if (
        parsed.version !== STORAGE_VERSION ||
        !isValidRecordSet(parsed.records, tenant.id)
      ) {
        return this.recoverInvalidData(tenant, raw);
      }
      const records = migratePlatformSystemMenus(tenant, parsed.records);
      if (records.length !== parsed.records.length) {
        return { records: this.replace(tenant, records), recoveryNotice: null };
      }
      return { records, recoveryNotice: null };
    } catch (error) {
      if (error instanceof MenuPersistenceError) throw error;
      return this.recoverInvalidData(tenant, raw);
    }
  }

  replace(tenant: TenantInfo, records: MenuConfigRecord[]): MenuConfigRecord[] {
    if (!isValidRecordSet(records, tenant.id)) {
      throw new MenuPersistenceError("菜单数据不完整，无法保存");
    }
    const cloned = cloneRecords(records);
    this.write(tenantMenuStorageKey(tenant.id), {
      version: STORAGE_VERSION,
      records: cloned,
    });
    return cloneRecords(cloned);
  }

  reset(tenant: TenantInfo): MenuConfigRecord[] {
    return this.persistTemplate(tenant);
  }

  private persistTemplate(tenant: TenantInfo) {
    const records = cloneTenantTemplate(tenant);
    return this.replace(tenant, records);
  }

  private recoverInvalidData(tenant: TenantInfo, raw: string): MenuRepositoryLoadResult {
    try {
      this.storage.setItem(invalidMenuStorageKey(tenant.id, this.now()), raw);
    } catch (error) {
      throw new MenuPersistenceError("菜单备份失败，无法恢复默认菜单", error);
    }
    return {
      records: this.persistTemplate(tenant),
      recoveryNotice: "检测到无效菜单数据，已恢复默认菜单",
    };
  }

  private write(key: string, value: StoredTenantMenu) {
    try {
      this.storage.setItem(key, JSON.stringify(value));
    } catch (error) {
      throw new MenuPersistenceError("菜单保存失败，请检查浏览器存储空间", error);
    }
  }
}

export const tenantMenuRepository = new LocalStorageTenantMenuRepository(window.localStorage);
