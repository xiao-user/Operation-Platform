import type {
  ShellConfigRepositoryLoadResult,
  TenantShellConfigRepository,
} from "@/features/shell-config/shell-config-repository";
import type { TenantShellConfig, WorkbenchConfig } from "@/features/shell-config/types";
import type { TenantInfo } from "@/types/user";
import { defaultTenantShellConfig } from "@/features/shell-config/default-shell-config";

export { defaultTenantShellConfig } from "@/features/shell-config/default-shell-config";

const SHELL_CONFIG_VERSION = 1;
const DEFAULT_WORKBENCH_ICON = "LayoutGrid";

export class ShellConfigPersistenceError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "ShellConfigPersistenceError";
    this.cause = cause;
  }
}

export function tenantShellConfigStorageKey(tenantId: string) {
  return `operation-platform:tenant-shell:v1:${tenantId}`;
}

function invalidShellConfigStorageKey(tenantId: string, timestamp: number) {
  return `operation-platform:tenant-shell:invalid:${tenantId}:${timestamp}`;
}

function cloneConfig(config: TenantShellConfig): TenantShellConfig {
  return {
    version: SHELL_CONFIG_VERSION,
    workbench: { ...config.workbench },
  };
}

function isWorkbenchConfig(value: unknown): value is WorkbenchConfig {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.enabled === "boolean" &&
    typeof item.label === "string" &&
    item.label.trim().length > 0 &&
    (item.icon === undefined || typeof item.icon === "string") &&
    typeof item.sort === "number" &&
    Number.isFinite(item.sort)
  );
}

function isShellConfig(value: unknown): value is TenantShellConfig {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return item.version === SHELL_CONFIG_VERSION && isWorkbenchConfig(item.workbench);
}

function normalizeConfig(config: TenantShellConfig): TenantShellConfig {
  return {
    version: SHELL_CONFIG_VERSION,
    workbench: {
      enabled: config.workbench.enabled,
      label: config.workbench.label.trim(),
      icon: config.workbench.icon || DEFAULT_WORKBENCH_ICON,
      sort: config.workbench.sort,
    },
  };
}

export class LocalStorageTenantShellConfigRepository implements TenantShellConfigRepository {
  constructor(
    private readonly storage: Storage,
    private readonly now: () => number = Date.now,
  ) {}

  list(tenant: TenantInfo): ShellConfigRepositoryLoadResult {
    const key = tenantShellConfigStorageKey(tenant.id);
    const raw = this.storage.getItem(key);
    if (raw === null) {
      return { config: this.persistDefault(tenant), recoveryNotice: null };
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!isShellConfig(parsed)) return this.recoverInvalidData(tenant, raw);
      return { config: cloneConfig(normalizeConfig(parsed)), recoveryNotice: null };
    } catch (error) {
      if (error instanceof ShellConfigPersistenceError) throw error;
      return this.recoverInvalidData(tenant, raw);
    }
  }

  replace(tenant: TenantInfo, config: TenantShellConfig): TenantShellConfig {
    if (!isShellConfig(config)) {
      throw new ShellConfigPersistenceError("系统入口配置不完整，无法保存");
    }
    const normalized = normalizeConfig(config);
    this.write(tenantShellConfigStorageKey(tenant.id), normalized);
    return cloneConfig(normalized);
  }

  reset(tenant: TenantInfo): TenantShellConfig {
    return this.persistDefault(tenant);
  }

  private persistDefault(tenant: TenantInfo) {
    return this.replace(tenant, defaultTenantShellConfig());
  }

  private recoverInvalidData(tenant: TenantInfo, raw: string): ShellConfigRepositoryLoadResult {
    try {
      this.storage.setItem(invalidShellConfigStorageKey(tenant.id, this.now()), raw);
    } catch (error) {
      throw new ShellConfigPersistenceError("系统入口配置备份失败，无法恢复默认配置", error);
    }
    return {
      config: this.persistDefault(tenant),
      recoveryNotice: "检测到无效系统入口配置，已恢复默认配置",
    };
  }

  private write(key: string, value: TenantShellConfig) {
    try {
      this.storage.setItem(key, JSON.stringify(value));
    } catch (error) {
      throw new ShellConfigPersistenceError("系统入口配置保存失败，请检查浏览器存储空间", error);
    }
  }
}

export const tenantShellConfigRepository = new LocalStorageTenantShellConfigRepository(
  window.localStorage,
);
