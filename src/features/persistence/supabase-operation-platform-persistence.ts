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

interface ConfigurationSaveWaiter {
  resolve: (configuration: TenantConfiguration) => void;
  reject: (error: unknown) => void;
}

interface PendingConfigurationSave {
  configuration: TenantConfiguration;
  waiters: ConfigurationSaveWaiter[];
}

interface ConfigurationSaveState {
  generation: number;
  running: boolean;
  pending: PendingConfigurationSave | null;
}

function sameConfiguration(
  first: TenantConfiguration | undefined,
  second: TenantConfiguration,
) {
  return first !== undefined && JSON.stringify(first) === JSON.stringify(second);
}

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
  private configurationSaveStates = new Map<string, ConfigurationSaveState>();
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
    this.configurationSaveStates.clear();
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
    this.configurationSaveStates.delete(tenantId);
    this.activeRoles.delete(tenantId);
    this.visualizationThemes.delete(tenantId);
    for (const key of this.workbenchLayouts.keys()) {
      if (key.startsWith(`${tenantId}:`)) this.workbenchLayouts.delete(key);
    }
  }

  private async ensureTenantLoaded(tenant: TenantInfo) {
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

  peekTenantState(tenant: TenantInfo) {
    if (!this.loadedTenants.has(tenant.id)) return null;
    const configuration = this.configurations.get(tenant.id);
    if (!configuration) {
      throw new Error(`组织「${tenant.name}」缺少远端配置`);
    }
    return {
      configuration: {
        configuration: cloneJson(configuration),
        recoveryNotice: null,
      },
      members: {
        members: (this.members.get(tenant.id) ?? []).map(cloneTenantMember),
        recoveryNotice: null,
      },
    };
  }

  async loadTenantState(tenant: TenantInfo) {
    await this.ensureTenantLoaded(tenant);
    const state = this.peekTenantState(tenant);
    if (!state) throw new Error(`组织「${tenant.name}」的数据尚未加载`);
    return state;
  }

  saveConfiguration(tenant: TenantInfo, configuration: TenantConfiguration) {
    if (this.peekTenantState(tenant)) {
      return this.enqueueConfigurationSave(tenant, configuration);
    }
    return this.loadTenantState(tenant).then(() =>
      this.enqueueConfigurationSave(tenant, configuration),
    );
  }

  private enqueueConfigurationSave(
    tenant: TenantInfo,
    configuration: TenantConfiguration,
  ) {
    const requested = cloneJson(configuration);
    const existingState = this.configurationSaveStates.get(tenant.id);
    if (!existingState && sameConfiguration(this.configurations.get(tenant.id), requested)) {
      return Promise.resolve(cloneJson(requested));
    }

    const state: ConfigurationSaveState = existingState ?? {
      generation: this.generation,
      running: false,
      pending: null,
    };
    if (!existingState) this.configurationSaveStates.set(tenant.id, state);

    const result = new Promise<TenantConfiguration>((resolve, reject) => {
      if (state.pending) {
        state.pending.configuration = requested;
        state.pending.waiters.push({ resolve, reject });
      } else {
        state.pending = {
          configuration: requested,
          waiters: [{ resolve, reject }],
        };
      }
    });

    if (!state.running) void this.flushConfigurationSaves(tenant.id, state);
    return result;
  }

  private async flushConfigurationSaves(tenantId: string, state: ConfigurationSaveState) {
    state.running = true;
    try {
      while (state.pending) {
        const pending = state.pending;
        state.pending = null;
        if (state.generation !== this.generation) {
          this.rejectConfigurationSave(pending, new Error("登录状态已变化，配置保存已取消"));
          continue;
        }

        const cached = this.configurations.get(tenantId);
        if (sameConfiguration(cached, pending.configuration)) {
          this.resolveConfigurationSave(pending, pending.configuration);
          continue;
        }

        try {
          const revision = await supabaseOperationPlatformRepository.saveConfiguration(
            tenantId,
            this.configurationRevisions.get(tenantId) ?? 0,
            pending.configuration,
          );
          if (state.generation !== this.generation) {
            this.rejectConfigurationSave(pending, new Error("登录状态已变化，配置保存结果已忽略"));
            continue;
          }
          const saved = cloneJson(pending.configuration);
          this.configurations.set(tenantId, saved);
          this.configurationRevisions.set(tenantId, revision);
          this.resolveConfigurationSave(pending, saved);
        } catch (error) {
          this.rejectConfigurationSave(pending, error);
          if (state.pending) {
            this.rejectConfigurationSave(state.pending, error);
            state.pending = null;
          }
          break;
        }
      }
    } finally {
      state.running = false;
      if (this.configurationSaveStates.get(tenantId) === state) {
        this.configurationSaveStates.delete(tenantId);
      }
    }
  }

  private resolveConfigurationSave(
    pending: PendingConfigurationSave,
    configuration: TenantConfiguration,
  ) {
    for (const waiter of pending.waiters) waiter.resolve(cloneJson(configuration));
  }

  private rejectConfigurationSave(pending: PendingConfigurationSave, error: unknown) {
    for (const waiter of pending.waiters) waiter.reject(error);
  }

  async replaceMembers(tenant: TenantInfo, members: TenantMemberRecord[]) {
    await this.loadTenantState(tenant);
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
