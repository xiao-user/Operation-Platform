import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { ADMIN_ROLE_ID } from "@/features/access-control/types";
import {
  operationPlatformPersistence,
  operationPlatformPersistenceCapabilities,
} from "@/features/persistence/runtime-operation-platform-persistence";
import type { PersistenceIdentity } from "@/features/persistence/operation-platform-persistence";
import {
  clearActiveTenantSession,
  loadActiveTenantFromSession,
  saveActiveTenantToSession,
} from "@/features/session/active-tenant-session";
import type { UserRole, UserInfo, TenantInfo } from "@/types/user";

const EMPTY_TENANT: TenantInfo = {
  id: "",
  name: "正在加载组织",
  shortName: "加载中",
  type: "platform",
  enabled: false,
};

export const useUserStore = defineStore("user", () => {
  const initialState = operationPlatformPersistence.initialState();
  const userInfo = ref<UserInfo>({
    ...initialState.userInfo,
    tenantRoleIds: { ...initialState.userInfo.tenantRoleIds },
  });
  const tenantList = ref<TenantInfo[]>(initialState.tenants.map((tenant) => ({ ...tenant })));
  const tenantRecoveryNotice = ref<string | null>(initialState.tenantRecoveryNotice);
  const memberRoleVersion = ref(0);
  const activeRoleVersion = ref(0);
  const persistenceInitialized = ref(initialState.initialized);
  const persistenceLoading = ref(false);
  const persistenceError = ref("");
  let persistenceRequestId = 0;
  let persistenceRequest: {
    key: string;
    promise: Promise<void>;
  } | null = null;

  function legacyRoleIdsForTenant(tenantId: string) {
    const legacyRoleId = userInfo.value.tenantRoleIds[tenantId];
    return legacyRoleId ? [legacyRoleId] : [];
  }

  function roleIdsForTenant(tenantId: string): UserRole[] {
    void memberRoleVersion.value;
    if (userInfo.value.platformAdmin) return [ADMIN_ROLE_ID];
    const tenant = tenantList.value.find((item) => item.id === tenantId && item.enabled !== false);
    if (!tenant) {
      return operationPlatformPersistenceCapabilities.requiresAuthentication
        ? []
        : legacyRoleIdsForTenant(tenantId);
    }
    const tenantState = operationPlatformPersistence.peekTenantState(tenant);
    const configuration = tenantState?.configuration.configuration;
    const members = tenantState?.members.members ?? [];
    const member = members.find((item) => item.userId === userInfo.value.id && item.enabled);
    if (!member) return [];
    if (!configuration) return [...member.roleIds];
    const enabledRoleIds = new Set(
      configuration.roles.filter((roleRecord) => roleRecord.enabled).map((roleRecord) => roleRecord.id),
    );
    return member.roleIds.filter((roleId) => enabledRoleIds.has(roleId));
  }

  function canAccessTenant(tenant: TenantInfo) {
    return tenant.enabled !== false &&
      (userInfo.value.platformAdmin || roleIdsForTenant(tenant.id).length > 0);
  }

  function hasAdminRoleForTenant(tenantId: string) {
    return roleIdsForTenant(tenantId).includes(ADMIN_ROLE_ID);
  }

  function firstAvailableTenant(tenants: TenantInfo[]) {
    const assignedTenants = tenants.filter(canAccessTenant);
    return assignedTenants.find((tenant) => tenant.type !== "platform")
      ?? assignedTenants[0]
      ?? tenants.find((tenant) => tenant.enabled !== false && tenant.type !== "platform")
      ?? tenants.find((tenant) => tenant.enabled !== false)
      ?? tenants[0]
      ?? EMPTY_TENANT;
  }

  function availableTenantById(tenants: TenantInfo[], tenantId: string | null) {
    if (!tenantId) return null;
    return tenants.find((tenant) => tenant.id === tenantId && canAccessTenant(tenant)) ?? null;
  }

  const initialActiveTenant = availableTenantById(
    tenantList.value,
    loadActiveTenantFromSession(userInfo.value.id),
  );
  const currentTenant = ref<TenantInfo>({
    ...(initialActiveTenant ?? firstAvailableTenant(tenantList.value)),
  });

  function defaultActiveRole(roleIds: readonly UserRole[]) {
    return roleIds.includes(ADMIN_ROLE_ID) ? ADMIN_ROLE_ID : roleIds[0] ?? null;
  }

  function activeRoleIdForTenant(tenantId: string): UserRole | null {
    void activeRoleVersion.value;
    const roleIds = roleIdsForTenant(tenantId);
    if (!roleIds.length) return null;
    const stored = operationPlatformPersistence.getActiveRole(tenantId, userInfo.value.id);
    return stored && roleIds.includes(stored) ? stored : defaultActiveRole(roleIds);
  }

  const role = computed<UserRole | null>(() => activeRoleIdForTenant(currentTenant.value.id));
  const roleIds = computed(() => roleIdsForTenant(currentTenant.value.id));
  const isAdmin = computed(() => role.value === ADMIN_ROLE_ID);
  const isTeacher = computed(() => role.value === "teacher");
  const isSchool = computed(() => currentTenant.value.type === "school");
  const isBureau = computed(() => currentTenant.value.type === "bureau");
  const availableTenants = computed(() => tenantList.value.filter(canAccessTenant));

  function applyAuthenticatedSession(session: UserInfo) {
    userInfo.value = { ...session, tenantRoleIds: { ...session.tenantRoleIds } };
    refreshMemberRoles();
  }

  function applyPersistenceState(state: ReturnType<typeof operationPlatformPersistence.initialState>) {
    const previousUserId = userInfo.value.id;
    const previousTenantId = currentTenant.value.id;
    userInfo.value = { ...state.userInfo, tenantRoleIds: { ...state.userInfo.tenantRoleIds } };
    tenantList.value = state.tenants.map((tenant) => ({ ...tenant }));
    tenantRecoveryNotice.value = state.tenantRecoveryNotice;
    const previousTenant = previousUserId === userInfo.value.id
      ? availableTenantById(tenantList.value, previousTenantId)
      : null;
    const sessionTenant = availableTenantById(
      tenantList.value,
      loadActiveTenantFromSession(userInfo.value.id),
    );
    currentTenant.value = {
      ...(previousTenant ?? sessionTenant ?? firstAvailableTenant(tenantList.value)),
    };
    persistenceInitialized.value = state.initialized;
    refreshMemberRoles();
  }

  function persistenceIdentityKey(identity: PersistenceIdentity | null) {
    return identity?.id ?? "__anonymous__";
  }

  async function initializePersistence(identity: PersistenceIdentity | null, force = false) {
    if (persistenceInitialized.value && !force) return;
    const key = persistenceIdentityKey(identity);
    if (persistenceRequest?.key === key) return persistenceRequest.promise;
    const requestId = ++persistenceRequestId;
    const promise = (async () => {
      persistenceLoading.value = true;
      persistenceError.value = "";
      try {
        const state = await operationPlatformPersistence.initialize(identity);
        if (requestId === persistenceRequestId) {
          applyPersistenceState(state);
          if (currentTenant.value.id) {
            await operationPlatformPersistence.loadTenantState(currentTenant.value);
            saveActiveTenantToSession(userInfo.value.id, currentTenant.value.id);
          }
          refreshMemberRoles();
        }
      } catch (error) {
        if (requestId === persistenceRequestId) {
          persistenceError.value = error instanceof Error ? error.message : "平台数据加载失败";
        }
        throw error;
      } finally {
        if (requestId === persistenceRequestId) {
          persistenceLoading.value = false;
          persistenceRequest = null;
        }
      }
    })();
    persistenceRequest = { key, promise };
    return promise;
  }

  function resetPersistence() {
    clearActiveTenantSession(userInfo.value.id);
    persistenceRequestId += 1;
    persistenceRequest = null;
    persistenceLoading.value = false;
    persistenceError.value = "";
    operationPlatformPersistence.reset();
    currentTenant.value = { ...EMPTY_TENANT };
    applyPersistenceState(operationPlatformPersistence.initialState());
  }

  async function switchTenant(tenantId: string, options: { remember?: boolean } = {}) {
    const found = tenantList.value.find((tenant) => tenant.id === tenantId && canAccessTenant(tenant));
    if (!found) return false;
    await operationPlatformPersistence.loadTenantState(found);
    if (options.remember !== false) {
      saveActiveTenantToSession(userInfo.value.id, tenantId);
    }
    currentTenant.value = { ...found };
    refreshMemberRoles();
    return true;
  }

  async function setActiveRoleForTenant(tenantId: string, roleId: UserRole) {
    const effectiveRoleIds = roleIdsForTenant(tenantId);
    if (!effectiveRoleIds.includes(roleId)) {
      throw new Error("当前成员未拥有该角色，或该角色已停用");
    }
    await operationPlatformPersistence.setActiveRole(tenantId, userInfo.value.id, roleId);
    activeRoleVersion.value += 1;
  }

  function visualizationThemeIdForTenant(tenantId: string) {
    return operationPlatformPersistence.getVisualizationTheme(tenantId, userInfo.value.id);
  }

  async function setVisualizationThemeForTenant(tenantId: string, themeId: string) {
    await operationPlatformPersistence.setVisualizationTheme(
      tenantId,
      userInfo.value.id,
      themeId,
    );
  }

  function refreshTenants() {
    tenantList.value = operationPlatformPersistence.listTenants();
    tenantRecoveryNotice.value = null;
    const current = tenantList.value.find(
      (tenant) => tenant.id === currentTenant.value.id && canAccessTenant(tenant),
    );
    currentTenant.value = { ...(current ?? firstAvailableTenant(tenantList.value)) };
  }

  function replaceTenants(tenants: TenantInfo[]) {
    tenantList.value = operationPlatformPersistence.replaceTenantCache(tenants);
    tenantRecoveryNotice.value = null;
    refreshTenants();
  }

  function refreshMemberRoles() {
    memberRoleVersion.value += 1;
    activeRoleVersion.value += 1;
  }

  function hasRole(...allowedRoles: UserRole[]): boolean {
    return role.value !== null && allowedRoles.includes(role.value);
  }

  return {
    role,
    roleIds,
    userInfo,
    tenantList,
    availableTenants,
    currentTenant,
    tenantRecoveryNotice,
    persistenceInitialized,
    persistenceLoading,
    persistenceError,
    persistenceCapabilities: operationPlatformPersistenceCapabilities,
    isAdmin,
    isTeacher,
    isSchool,
    isBureau,
    applyAuthenticatedSession,
    initializePersistence,
    resetPersistence,
    refreshMemberRoles,
    activeRoleIdForTenant,
    canAccessTenant,
    hasAdminRoleForTenant,
    setActiveRoleForTenant,
    visualizationThemeIdForTenant,
    setVisualizationThemeForTenant,
    roleForTenant: activeRoleIdForTenant,
    roleIdsForTenant,
    switchTenant,
    refreshTenants,
    replaceTenants,
    hasRole,
  };
});
