import { cloneTenantMember } from "@/features/tenant-members/tenant-member-factories";
import { cloneJson } from "@/lib/clone-json";
import { loadActiveTenantFromSession } from "@/features/session/active-tenant-session";
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
  validateWorkbenchLayout,
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
  private visualizationThemes = new Map<string, string>();
  private workbenchLayouts = new Map<string, UserWorkbenchLayout>();
  private loadedTenants = new Set<string>();
  private tenantLoadRequests = new Map<string, Promise<void>>();
  private generation = 0;

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
    const generation = ++this.generation;
    const bootstrap = await supabaseOperationPlatformRepository.bootstrap(
      identity,
      loadActiveTenantFromSession(identity.id),
    );
    const userInfo: UserInfo = {
      id: identity.id,
      email: identity.email ?? "",
      name: bootstrap.profile.display_name,
      initials: bootstrap.profile.initials || bootstrap.profile.display_name.slice(0, 2),
      platformAdmin: bootstrap.profile.platform_admin,
      tenantRoleIds: {},
    };
    const tenants = bootstrap.tenants.map((tenant) => ({ ...tenant }));
    const configurations = new Map(
      [...bootstrap.configurations].map(([id, value]) => [id, cloneJson(value.configuration)]),
    );
    const configurationRevisions = new Map(
      [...bootstrap.configurations].map(([id, value]) => [id, value.revision]),
    );
    const members = new Map(
      [...bootstrap.members].map(([id, members]) => [
        id,
        members.map(cloneTenantMember),
      ]),
    );
    const activeRoles = new Map(bootstrap.activeRoles);
    const visualizationThemes = new Map(bootstrap.visualizationThemes);
    const workbenchLayouts = new Map(
      [...bootstrap.workbenchLayouts].map(([key, layout]) => [key, cloneWorkbenchLayout(layout)]),
    );
    if (generation === this.generation) {
      this.userInfo = userInfo;
      this.tenants = tenants;
      this.configurations = configurations;
      this.configurationRevisions = configurationRevisions;
      this.members = members;
      this.activeRoles = activeRoles;
      this.visualizationThemes = visualizationThemes;
      this.workbenchLayouts = workbenchLayouts;
      this.loadedTenants = new Set(configurations.keys());
      this.tenantLoadRequests.clear();
    }
    return {
      userInfo: { ...userInfo },
      tenants: tenants.map((tenant) => ({ ...tenant })),
      tenantRecoveryNotice: null,
      initialized: true,
    };
  }

  reset() {
    this.generation += 1;
    this.userInfo = { ...EMPTY_USER };
    this.tenants = [];
    this.configurations.clear();
    this.configurationRevisions.clear();
    this.members.clear();
    this.activeRoles.clear();
    this.visualizationThemes.clear();
    this.workbenchLayouts.clear();
    this.loadedTenants.clear();
    this.tenantLoadRequests.clear();
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
    this.loadedTenants.delete(tenantId);
    this.tenantLoadRequests.delete(tenantId);
    this.activeRoles.delete(tenantId);
    this.visualizationThemes.delete(tenantId);
    for (const key of this.workbenchLayouts.keys()) {
      if (key.startsWith(`${tenantId}:`)) this.workbenchLayouts.delete(key);
    }
  }

  async ensureTenantLoaded(tenant: TenantInfo) {
    if (this.loadedTenants.has(tenant.id)) return;
    const pending = this.tenantLoadRequests.get(tenant.id);
    if (pending) return pending;
    const generation = this.generation;
    const request = (async () => {
      const state = await supabaseOperationPlatformRepository.loadTenantState(tenant);
      if (generation !== this.generation) return;
      if (state.configuration) {
        this.configurations.set(tenant.id, cloneJson(state.configuration.configuration));
        this.configurationRevisions.set(tenant.id, state.configuration.revision);
      }
      this.members.set(tenant.id, state.members.map(cloneTenantMember));
      this.loadedTenants.add(tenant.id);
    })();
    this.tenantLoadRequests.set(tenant.id, request);
    return request.finally(() => {
      if (this.tenantLoadRequests.get(tenant.id) === request) {
        this.tenantLoadRequests.delete(tenant.id);
      }
    });
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

  getVisualizationTheme(tenantId: string) {
    return this.visualizationThemes.get(tenantId) ?? null;
  }

  async setVisualizationTheme(tenantId: string, userId: string, themeId: string) {
    await supabaseOperationPlatformRepository.saveVisualizationTheme(tenantId, userId, themeId);
    this.visualizationThemes.set(tenantId, themeId);
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
    template: WorkbenchTemplate,
    layout: UserWorkbenchLayout,
  ) {
    if (!validateWorkbenchLayout(layout, context, template)) {
      throw new Error("工作台布局不完整，无法保存");
    }
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
