import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { activeRoleRepository } from "@/features/access-control/local-storage-active-role-repository";
import { ADMIN_ROLE_ID } from "@/features/access-control/types";
import {
  tenantMemberRepository,
} from "@/features/tenant-members/local-storage-tenant-member-repository";
import { tenantConfigurationRepository } from "@/features/tenant-config/local-storage-tenant-configuration-repository";
import type { UserRole, UserInfo, TenantInfo } from "@/types/user";
import { MOCK_USER_INFO } from "@/config/mock";
import { tenantRepository } from "@/features/tenant/local-storage-tenant-repository";

export const useUserStore = defineStore("user", () => {
  const tenantLoadResult = tenantRepository.list();

  // 当前登录用户信息（对接登录接口后从响应中赋值）
  const userInfo = ref<UserInfo>({ ...MOCK_USER_INFO });

  // 可切换的租户列表（对接接口后替换）
  const tenantList = ref<TenantInfo[]>(tenantLoadResult.tenants);
  const tenantRecoveryNotice = ref(tenantLoadResult.recoveryNotice);
  const memberRoleVersion = ref(0);
  const activeRoleVersion = ref(0);

  function legacyRoleIdsForTenant(tenantId: string) {
    const legacyRoleId = userInfo.value.tenantRoleIds[tenantId];
    return legacyRoleId ? [legacyRoleId] : [];
  }

  function roleIdsForTenant(tenantId: string): UserRole[] {
    void memberRoleVersion.value;
    if (userInfo.value.platformAdmin) return [ADMIN_ROLE_ID];
    const tenant = tenantList.value.find((item) => item.id === tenantId && item.enabled !== false);
    if (!tenant) return legacyRoleIdsForTenant(tenantId);
    const enabledRoleIds = new Set(
      tenantConfigurationRepository
        .list(tenant)
        .configuration.roles
        .filter((roleRecord) => roleRecord.enabled)
        .map((roleRecord) => roleRecord.id),
    );
    const member = tenantMemberRepository
      .list(tenant)
      .members.find((item) => item.userId === userInfo.value.id && item.enabled);
    return member ? member.roleIds.filter((roleId) => enabledRoleIds.has(roleId)) : [];
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
    return (
      assignedTenants.find((tenant) => tenant.type !== "platform") ??
      assignedTenants[0] ??
      tenants.find((tenant) => tenant.enabled !== false && tenant.type !== "platform") ??
      tenants.find((tenant) => tenant.enabled !== false) ??
      tenants[0]!
    );
  }

  // 当前选中的租户（默认优先进入业务组织，运营平台通过租户切换进入）
  const currentTenant = ref<TenantInfo>({
    ...firstAvailableTenant(tenantList.value),
  });

  function defaultActiveRole(roleIds: readonly UserRole[]) {
    return roleIds.includes(ADMIN_ROLE_ID) ? ADMIN_ROLE_ID : roleIds[0] ?? null;
  }

  function activeRoleIdForTenant(tenantId: string): UserRole | null {
    void activeRoleVersion.value;
    const roleIds = roleIdsForTenant(tenantId);
    if (!roleIds.length) return null;
    const stored = activeRoleRepository.get({
      tenantId,
      userId: userInfo.value.id,
    });
    return stored && roleIds.includes(stored) ? stored : defaultActiveRole(roleIds);
  }

  function roleForTenant(tenantId: string): UserRole | null {
    return activeRoleIdForTenant(tenantId);
  }

  const role = computed<UserRole | null>(() => activeRoleIdForTenant(currentTenant.value.id));
  const roleIds = computed(() => roleIdsForTenant(currentTenant.value.id));
  const isAdmin = computed(() => role.value === ADMIN_ROLE_ID);
  const isTeacher = computed(() => role.value === "teacher");
  const isSchool = computed(() => currentTenant.value.type === "school");
  const isBureau = computed(() => currentTenant.value.type === "bureau");
  const availableTenants = computed(() => tenantList.value.filter(canAccessTenant));

  function applyAuthenticatedSession(session: UserInfo) {
    userInfo.value = {
      ...session,
      tenantRoleIds: { ...session.tenantRoleIds },
    };
    refreshMemberRoles();
  }

  function switchTenant(tenantId: string) {
    const found = tenantList.value.find((tenant) => tenant.id === tenantId && canAccessTenant(tenant));
    if (found) currentTenant.value = { ...found };
  }

  function setActiveRoleForTenant(tenantId: string, roleId: UserRole) {
    const effectiveRoleIds = roleIdsForTenant(tenantId);
    if (!effectiveRoleIds.includes(roleId)) {
      throw new Error("当前成员未拥有该角色，或该角色已停用");
    }
    activeRoleRepository.set({ tenantId, userId: userInfo.value.id }, roleId);
    activeRoleVersion.value += 1;
  }

  function refreshTenants() {
    const result = tenantRepository.list();
    tenantList.value = result.tenants;
    tenantRecoveryNotice.value = result.recoveryNotice;
    const current = tenantList.value.find(
      (tenant) => tenant.id === currentTenant.value.id && canAccessTenant(tenant),
    );
    const fallback = firstAvailableTenant(tenantList.value);
    currentTenant.value = { ...(current ?? fallback ?? tenantList.value[0]!) };
  }

  function replaceTenants(tenants: TenantInfo[]) {
    tenantList.value = tenantRepository.replace(tenants);
    tenantRecoveryNotice.value = null;
    refreshTenants();
  }

  function refreshMemberRoles() {
    memberRoleVersion.value += 1;
    activeRoleVersion.value += 1;
  }

  /**
   * 检查当前角色是否拥有某项权限
   */
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
    isAdmin,
    isTeacher,
    isSchool,
    isBureau,
    applyAuthenticatedSession,
    refreshMemberRoles,
    activeRoleIdForTenant,
    canAccessTenant,
    hasAdminRoleForTenant,
    setActiveRoleForTenant,
    roleForTenant,
    roleIdsForTenant,
    switchTenant,
    refreshTenants,
    replaceTenants,
    hasRole,
  };
});
