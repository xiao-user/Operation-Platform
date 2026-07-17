import { cloneTenantMember } from "@/features/tenant-members/tenant-member-factories";
import { cloneJson } from "@/lib/clone-json";
import {
  remoteWorkbenchLayoutKey,
  supabaseOperationPlatformRepository,
} from "@/features/persistence/supabase-operation-platform-repository";
import type {
  OperationPlatformPersistence,
  PersistenceIdentity,
} from "@/features/persistence/operation-platform-persistence";
import type { TenantConfiguration } from "@/features/tenant-config/types";
import type { TenantMemberRecord } from "@/features/tenant-members/types";
import {
  cloneWorkbenchLayout,
  createDefaultWorkbenchLayout,
  reconcileStoredWorkbenchLayout,
} from "@/features/workbench/workbench-layout";
import type {
  UserWorkbenchLayout,
  WorkbenchLayoutContext,
  WorkbenchTemplate,
} from "@/features/workbench/types";
import type { TenantInfo, UserInfo } from "@/types/user";

const EMPTY_USER: UserInfo = {
  id: "",
  name: "",
  initials: "",
  platformAdmin: false,
  tenantRoleIds: {},
};

export class SupabaseOperationPlatformPersistence implements OperationPlatformPersistence {
  readonly capabilities = {
    localDataExport: false,
    requiresAuthentication: true,
    memberAccountKind: "email",
  } as const;

  private userInfo: UserInfo = { ...EMPTY_USER };
  private tenants: TenantInfo[] = [];
  private configurations = new Map<string, TenantConfiguration>();
  private configurationRevisions = new Map<string, number>();
  private members = new Map<string, TenantMemberRecord[]>();
  private activeRoles = new Map<string, string>();
  private workbenchLayouts = new Map<string, UserWorkbenchLayout>();

  initialState() {
    return {
      userInfo: { ...EMPTY_USER },
      tenants: [],
      tenantRecoveryNotice: null,
      initialized: false,
    };
  }

  async initialize(identity: PersistenceIdentity | null) {
    if (!identity) return this.initialState();
    const bootstrap = await supabaseOperationPlatformRepository.bootstrap(identity);
    this.userInfo = {
      id: identity.id,
      email: identity.email ?? "",
      name: bootstrap.profile.display_name,
      initials: bootstrap.profile.initials || bootstrap.profile.display_name.slice(0, 2),
      platformAdmin: bootstrap.profile.platform_admin,
      tenantRoleIds: {},
    };
    this.tenants = bootstrap.tenants.map((tenant) => ({ ...tenant }));
    this.configurations = new Map(
      [...bootstrap.configurations].map(([id, value]) => [id, cloneJson(value.configuration)]),
    );
    this.configurationRevisions = new Map(
      [...bootstrap.configurations].map(([id, value]) => [id, value.revision]),
    );
    this.members = new Map(
      [...bootstrap.members].map(([id, members]) => [
        id,
        members.map(cloneTenantMember),
      ]),
    );
    this.activeRoles = new Map(bootstrap.activeRoles);
    this.workbenchLayouts = new Map(
      [...bootstrap.workbenchLayouts].map(([key, layout]) => [key, cloneWorkbenchLayout(layout)]),
    );
    return {
      userInfo: { ...this.userInfo },
      tenants: this.listTenants(),
      tenantRecoveryNotice: null,
      initialized: true,
    };
  }

  reset() {
    this.userInfo = { ...EMPTY_USER };
    this.tenants = [];
    this.configurations.clear();
    this.configurationRevisions.clear();
    this.members.clear();
    this.activeRoles.clear();
    this.workbenchLayouts.clear();
  }

  listTenants() {
    return this.tenants.map((tenant) => ({ ...tenant }));
  }

  replaceTenantCache(tenants: TenantInfo[]) {
    this.tenants = tenants.map((tenant) => ({ ...tenant }));
    return this.listTenants();
  }

  async createTenant(
    tenant: TenantInfo,
    configuration: TenantConfiguration,
    administrator: TenantMemberRecord,
  ) {
    const saved = await supabaseOperationPlatformRepository.createTenant(
      tenant,
      configuration,
      administrator,
    );
    this.tenants = [...this.tenants, saved];
    this.configurations.set(saved.id, cloneJson(configuration));
    this.configurationRevisions.set(saved.id, 1);
    this.members.set(saved.id, [cloneTenantMember(administrator)]);
    return { ...saved };
  }

  async updateTenant(tenant: TenantInfo) {
    const saved = await supabaseOperationPlatformRepository.updateTenant(tenant);
    this.tenants = this.tenants.map((item) => item.id === saved.id ? saved : item);
    return { ...saved };
  }

  async deleteTenant(tenantId: string) {
    await supabaseOperationPlatformRepository.deleteTenant(tenantId);
    this.tenants = this.tenants.filter((tenant) => tenant.id !== tenantId);
    this.configurations.delete(tenantId);
    this.configurationRevisions.delete(tenantId);
    this.members.delete(tenantId);
    this.activeRoles.delete(tenantId);
    for (const key of this.workbenchLayouts.keys()) {
      if (key.startsWith(`${tenantId}:`)) this.workbenchLayouts.delete(key);
    }
  }

  loadConfiguration(tenant: TenantInfo) {
    const configuration = this.configurations.get(tenant.id);
    return configuration
      ? { configuration: cloneJson(configuration), recoveryNotice: null }
      : null;
  }

  async saveConfiguration(tenant: TenantInfo, configuration: TenantConfiguration) {
    const revision = await supabaseOperationPlatformRepository.saveConfiguration(
      tenant.id,
      this.configurationRevisions.get(tenant.id) ?? 0,
      configuration,
    );
    const saved = cloneJson(configuration);
    this.configurations.set(tenant.id, saved);
    this.configurationRevisions.set(tenant.id, revision);
    return cloneJson(saved);
  }

  loadMembers(tenant: TenantInfo) {
    return {
      members: (this.members.get(tenant.id) ?? []).map(cloneTenantMember),
      recoveryNotice: null,
    };
  }

  async replaceMembers(tenant: TenantInfo, members: TenantMemberRecord[]) {
    const saved = await supabaseOperationPlatformRepository.replaceMembers(tenant.id, members);
    this.members.set(tenant.id, saved);
    return saved.map(cloneTenantMember);
  }

  getActiveRole(tenantId: string) {
    return this.activeRoles.get(tenantId) ?? null;
  }

  async setActiveRole(tenantId: string, userId: string, roleId: string) {
    await supabaseOperationPlatformRepository.saveActiveRole(tenantId, userId, roleId);
    this.activeRoles.set(tenantId, roleId);
  }

  loadWorkbenchLayout(context: WorkbenchLayoutContext, template: WorkbenchTemplate) {
    const stored = this.workbenchLayouts.get(
      remoteWorkbenchLayoutKey(context.tenant.id, context.profile),
    );
    const reconciled = stored
      ? reconcileStoredWorkbenchLayout(stored, context, template)
      : null;
    return {
      layout: reconciled ?? createDefaultWorkbenchLayout(context, template),
      hasOverride: Boolean(reconciled),
      recoveryNotice: stored && !reconciled
        ? "检测到无效远端工作台布局，已恢复当前角色的默认布局"
        : null,
    };
  }

  async saveWorkbenchLayout(
    context: WorkbenchLayoutContext,
    _template: WorkbenchTemplate,
    layout: UserWorkbenchLayout,
  ) {
    await supabaseOperationPlatformRepository.saveWorkbenchLayout(context.userId, layout);
    const saved = cloneWorkbenchLayout(layout);
    this.workbenchLayouts.set(
      remoteWorkbenchLayoutKey(context.tenant.id, context.profile),
      saved,
    );
    return cloneWorkbenchLayout(saved);
  }

  async resetWorkbenchLayout(context: WorkbenchLayoutContext, template: WorkbenchTemplate) {
    await supabaseOperationPlatformRepository.resetWorkbenchLayout(
      context.tenant.id,
      context.userId,
      context.profile,
    );
    this.workbenchLayouts.delete(remoteWorkbenchLayoutKey(context.tenant.id, context.profile));
    return createDefaultWorkbenchLayout(context, template);
  }
}
