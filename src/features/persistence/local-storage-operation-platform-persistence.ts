import { MOCK_USER_INFO } from "@/config/mock";
import { activeRoleRepository } from "@/features/access-control/local-storage-active-role-repository";
import { tenantConfigurationRepository } from "@/features/tenant-config/local-storage-tenant-configuration-repository";
import { tenantMemberRepository } from "@/features/tenant-members/local-storage-tenant-member-repository";
import { tenantRepository } from "@/features/tenant/local-storage-tenant-repository";
import { workbenchLayoutRepository } from "@/features/workbench/local-storage-workbench-layout-repository";
import type { OperationPlatformPersistence } from "@/features/persistence/operation-platform-persistence";
import type { TenantConfiguration } from "@/features/tenant-config/types";
import type { TenantMemberRecord } from "@/features/tenant-members/types";
import type {
  UserWorkbenchLayout,
  WorkbenchLayoutContext,
  WorkbenchTemplate,
} from "@/features/workbench/types";
import type { TenantInfo } from "@/types/user";

export class LocalStorageOperationPlatformPersistence implements OperationPlatformPersistence {
  readonly capabilities = {
    localDataExport: true,
    requiresAuthentication: false,
    memberAccountKind: "identifier",
  } as const;

  initialState() {
    const result = tenantRepository.list();
    return {
      userInfo: { ...MOCK_USER_INFO, tenantRoleIds: { ...MOCK_USER_INFO.tenantRoleIds } },
      tenants: result.tenants,
      tenantRecoveryNotice: result.recoveryNotice,
      initialized: true,
    };
  }

  async initialize() {
    return this.initialState();
  }

  reset() {}

  listTenants() {
    return tenantRepository.list().tenants;
  }

  replaceTenantCache(tenants: TenantInfo[]) {
    return tenantRepository.replace(tenants);
  }

  async createTenant(
    tenant: TenantInfo,
    configuration: TenantConfiguration,
    administrator: TenantMemberRecord,
  ) {
    const previousTenants = tenantRepository.list().tenants;
    const savedTenants = tenantRepository.replace([...previousTenants, tenant]);
    try {
      tenantConfigurationRepository.replace(tenant, configuration);
      tenantMemberRepository.replace(tenant, [administrator]);
    } catch (error) {
      tenantRepository.replace(previousTenants);
      try {
        tenantConfigurationRepository.remove(tenant.id);
      } catch {
        // The original persistence error is more useful to the caller.
      }
      throw error;
    }
    return { ...savedTenants.find((item) => item.id === tenant.id)! };
  }

  async updateTenant(tenant: TenantInfo) {
    const tenants = tenantRepository.list().tenants;
    const saved = tenantRepository.replace(
      tenants.map((item) => item.id === tenant.id ? tenant : item),
    );
    return { ...saved.find((item) => item.id === tenant.id)! };
  }

  async deleteTenant(tenantId: string) {
    const previousTenants = tenantRepository.list().tenants;
    const target = previousTenants.find((tenant) => tenant.id === tenantId);
    if (!target || target.type === "platform") return;
    tenantRepository.replace(previousTenants.filter((tenant) => tenant.id !== tenantId));
    try {
      tenantConfigurationRepository.remove(tenantId);
    } catch (error) {
      tenantRepository.replace(previousTenants);
      throw error;
    }
  }

  peekTenantState(tenant: TenantInfo) {
    return {
      configuration: tenantConfigurationRepository.list(tenant),
      members: tenantMemberRepository.list(tenant),
    };
  }

  async loadTenantState(tenant: TenantInfo) {
    return this.peekTenantState(tenant);
  }

  async saveConfiguration(tenant: TenantInfo, configuration: TenantConfiguration) {
    return tenantConfigurationRepository.replace(tenant, configuration);
  }

  async replaceMembers(tenant: TenantInfo, members: TenantMemberRecord[]) {
    return tenantMemberRepository.replace(tenant, members);
  }

  getActiveRole(tenantId: string, userId: string) {
    return activeRoleRepository.get({ tenantId, userId });
  }

  async setActiveRole(tenantId: string, userId: string, roleId: string) {
    activeRoleRepository.set({ tenantId, userId }, roleId);
  }

  getVisualizationTheme(tenantId: string, userId: string) {
    try {
      const scopedKey = `operation-platform:visualization-theme:v1:${tenantId}:${userId}`;
      const scoped = window.localStorage.getItem(scopedKey);
      if (scoped) return scoped;
      const legacy = window.localStorage.getItem(
        "operation-platform:regional-education-overview:theme:v1",
      );
      if (legacy) window.localStorage.setItem(scopedKey, legacy);
      return legacy;
    } catch {
      return null;
    }
  }

  async setVisualizationTheme(tenantId: string, userId: string, themeId: string) {
    window.localStorage.setItem(
      `operation-platform:visualization-theme:v1:${tenantId}:${userId}`,
      themeId,
    );
  }

  loadWorkbenchLayout(context: WorkbenchLayoutContext, template: WorkbenchTemplate) {
    return workbenchLayoutRepository.list(context, template);
  }

  async saveWorkbenchLayout(
    context: WorkbenchLayoutContext,
    template: WorkbenchTemplate,
    layout: UserWorkbenchLayout,
  ) {
    return workbenchLayoutRepository.replace(context, template, layout);
  }

  async resetWorkbenchLayout(context: WorkbenchLayoutContext, template: WorkbenchTemplate) {
    return workbenchLayoutRepository.reset(context, template);
  }
}
