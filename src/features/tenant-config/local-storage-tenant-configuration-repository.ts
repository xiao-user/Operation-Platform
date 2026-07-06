import { cloneTenantTemplate } from "@/config/menu-templates";
import {
  createDefaultRoles,
  tenantRoleRepository,
  tenantRoleStorageKey,
} from "@/features/access-control/local-storage-role-repository";
import {
  tenantMenuRepository,
  tenantMenuStorageKey,
} from "@/features/menu-config/local-storage-menu-repository";
import {
  defaultTenantShellConfig,
  tenantShellConfigRepository,
  tenantShellConfigStorageKey,
} from "@/features/shell-config/local-storage-shell-config-repository";
import { isValidTenantConfiguration } from "@/features/tenant-config/tenant-configuration-validation";
import type {
  TenantConfiguration,
  TenantConfigurationLoadResult,
} from "@/features/tenant-config/types";
import type { TenantInfo } from "@/types/user";

const CONFIGURATION_VERSION = 1;

export class TenantConfigurationPersistenceError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "TenantConfigurationPersistenceError";
    this.cause = cause;
  }
}

export function tenantConfigurationStorageKey(tenantId: string) {
  return `operation-platform:tenant-configuration:v1:${tenantId}`;
}

function invalidConfigurationStorageKey(tenantId: string, timestamp: number) {
  return `operation-platform:tenant-configuration:invalid:${tenantId}:${timestamp}`;
}

function cloneConfiguration(configuration: TenantConfiguration): TenantConfiguration {
  return {
    version: CONFIGURATION_VERSION,
    menuRecords: configuration.menuRecords.map((record) => ({ ...record })),
    shellConfig: {
      version: CONFIGURATION_VERSION,
      workbench: { ...configuration.shellConfig.workbench },
    },
    roles: configuration.roles.map((role) => ({ ...role, menuIds: [...role.menuIds] })),
  };
}

export function createDefaultTenantConfiguration(tenant: TenantInfo): TenantConfiguration {
  const menuRecords = cloneTenantTemplate(tenant);
  return {
    version: CONFIGURATION_VERSION,
    menuRecords,
    shellConfig: defaultTenantShellConfig(),
    roles: createDefaultRoles(tenant, menuRecords),
  };
}

export class LocalStorageTenantConfigurationRepository {
  constructor(
    private readonly storage: Storage,
    private readonly now: () => number = Date.now,
  ) {}

  list(tenant: TenantInfo): TenantConfigurationLoadResult {
    const key = tenantConfigurationStorageKey(tenant.id);
    const raw = this.storage.getItem(key);
    if (raw === null) return this.migrateLegacyConfiguration(tenant);

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!isValidTenantConfiguration(parsed, tenant)) {
        return this.recoverInvalidConfiguration(tenant, raw);
      }
      return { configuration: cloneConfiguration(parsed), recoveryNotice: null };
    } catch (error) {
      if (error instanceof TenantConfigurationPersistenceError) throw error;
      return this.recoverInvalidConfiguration(tenant, raw);
    }
  }

  replace(tenant: TenantInfo, configuration: TenantConfiguration) {
    if (!isValidTenantConfiguration(configuration, tenant)) {
      throw new TenantConfigurationPersistenceError("租户配置不完整，无法保存");
    }
    const cloned = cloneConfiguration(configuration);
    this.write(tenantConfigurationStorageKey(tenant.id), cloned);
    return cloneConfiguration(cloned);
  }

  reset(tenant: TenantInfo) {
    return this.replace(tenant, createDefaultTenantConfiguration(tenant));
  }

  remove(tenantId: string) {
    const keys = [
      tenantConfigurationStorageKey(tenantId),
      tenantMenuStorageKey(tenantId),
      tenantShellConfigStorageKey(tenantId),
      tenantRoleStorageKey(tenantId),
    ];
    const previousValues = new Map(keys.map((key) => [key, this.storage.getItem(key)]));
    try {
      for (const key of keys) this.storage.removeItem(key);
    } catch (error) {
      try {
        for (const [key, value] of previousValues) {
          if (value === null) this.storage.removeItem(key);
          else this.storage.setItem(key, value);
        }
      } catch (rollbackError) {
        throw new TenantConfigurationPersistenceError(
          "租户配置清理失败，且无法恢复清理前状态",
          rollbackError,
        );
      }
      throw new TenantConfigurationPersistenceError("租户配置清理失败，已恢复清理前状态", error);
    }
  }

  private migrateLegacyConfiguration(tenant: TenantInfo): TenantConfigurationLoadResult {
    const menuResult = tenantMenuRepository.list(tenant);
    const shellResult = tenantShellConfigRepository.list(tenant);
    const roleResult = tenantRoleRepository.list(tenant, menuResult.records);
    const configuration = this.replace(tenant, {
      version: CONFIGURATION_VERSION,
      menuRecords: menuResult.records,
      shellConfig: shellResult.config,
      roles: roleResult.roles,
    });
    return {
      configuration,
      recoveryNotice: [
        menuResult.recoveryNotice,
        shellResult.recoveryNotice,
        roleResult.recoveryNotice,
      ].filter(Boolean).join("；") || null,
    };
  }

  private recoverInvalidConfiguration(
    tenant: TenantInfo,
    raw: string,
  ): TenantConfigurationLoadResult {
    try {
      this.storage.setItem(invalidConfigurationStorageKey(tenant.id, this.now()), raw);
    } catch (error) {
      throw new TenantConfigurationPersistenceError("租户配置备份失败，无法恢复", error);
    }
    return {
      configuration: this.reset(tenant),
      recoveryNotice: "检测到无效租户配置，已恢复默认菜单、工作台和角色",
    };
  }

  private write(key: string, value: TenantConfiguration) {
    try {
      this.storage.setItem(key, JSON.stringify(value));
    } catch (error) {
      throw new TenantConfigurationPersistenceError("租户配置保存失败，请检查浏览器存储空间", error);
    }
  }
}

export const tenantConfigurationRepository = new LocalStorageTenantConfigurationRepository(
  window.localStorage,
);
