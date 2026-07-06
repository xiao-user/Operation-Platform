import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { ADMIN_ROLE_ID } from "@/features/access-control/types";
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

  function firstAvailableTenant(tenants: TenantInfo[]) {
    return (
      tenants.find((tenant) => tenant.enabled !== false && tenant.type !== "platform") ??
      tenants.find((tenant) => tenant.enabled !== false) ??
      tenants[0]!
    );
  }

  // 当前选中的租户（默认优先进入业务组织，运营平台通过租户切换进入）
  const currentTenant = ref<TenantInfo>({
    ...firstAvailableTenant(tenantList.value),
  });

  function roleForTenant(tenantId: string): UserRole | null {
    if (userInfo.value.platformAdmin) return ADMIN_ROLE_ID;
    return userInfo.value.tenantRoleIds[tenantId] ?? null;
  }

  const role = computed<UserRole | null>(() => roleForTenant(currentTenant.value.id));
  const isAdmin = computed(() => role.value === "admin");
  const isTeacher = computed(() => role.value === "teacher");
  const isSchool = computed(() => currentTenant.value.type === "school");
  const isBureau = computed(() => currentTenant.value.type === "bureau");
  const availableTenants = computed(() =>
    tenantList.value.filter((tenant) => tenant.enabled !== false),
  );

  function applyAuthenticatedSession(session: UserInfo) {
    userInfo.value = {
      ...session,
      tenantRoleIds: { ...session.tenantRoleIds },
    };
  }

  function switchTenant(tenantId: string) {
    const found = tenantList.value.find((t) => t.id === tenantId && t.enabled !== false);
    if (found) currentTenant.value = { ...found };
  }

  function refreshTenants() {
    const result = tenantRepository.list();
    tenantList.value = result.tenants;
    tenantRecoveryNotice.value = result.recoveryNotice;
    const current = tenantList.value.find(
      (tenant) => tenant.id === currentTenant.value.id && tenant.enabled !== false,
    );
    const fallback = firstAvailableTenant(tenantList.value);
    currentTenant.value = { ...(current ?? fallback ?? tenantList.value[0]!) };
  }

  function replaceTenants(tenants: TenantInfo[]) {
    tenantList.value = tenantRepository.replace(tenants);
    tenantRecoveryNotice.value = null;
    refreshTenants();
  }

  /**
   * 检查当前角色是否拥有某项权限
   */
  function hasRole(...allowedRoles: UserRole[]): boolean {
    return role.value !== null && allowedRoles.includes(role.value);
  }

  return {
    role,
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
    roleForTenant,
    switchTenant,
    refreshTenants,
    replaceTenants,
    hasRole,
  };
});
