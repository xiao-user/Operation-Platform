import { computed, ref } from "vue";
import { defineStore } from "pinia";
import type { UserRole, UserInfo, TenantInfo } from "@/types/user";
import { MOCK_USER_INFO, MOCK_TENANTS } from "@/config/mock";

export const useUserStore = defineStore("user", () => {
  const role = ref<UserRole>("admin");

  // 当前登录用户信息（对接登录接口后从响应中赋值）
  const userInfo = ref<UserInfo>({ ...MOCK_USER_INFO });

  // 可切换的租户列表（对接接口后替换）
  const tenantList = ref<TenantInfo[]>([...MOCK_TENANTS]);

  // 当前选中的租户（默认第一个）
  const currentTenant = ref<TenantInfo>({ ...MOCK_TENANTS[0]! });

  const isAdmin = computed(() => role.value === "admin");
  const isTeacher = computed(() => role.value === "teacher");
  const isSchool = computed(() => currentTenant.value.type === "school");
  const isBureau = computed(() => currentTenant.value.type === "bureau");

  function setRole(newRole: UserRole) {
    role.value = newRole;
  }

  function switchTenant(tenantId: string) {
    const found = tenantList.value.find((t) => t.id === tenantId);
    if (found) currentTenant.value = { ...found };
  }

  /**
   * 检查当前角色是否拥有某项权限
   */
  function hasRole(...allowedRoles: UserRole[]): boolean {
    return allowedRoles.includes(role.value);
  }

  return {
    role,
    userInfo,
    tenantList,
    currentTenant,
    isAdmin,
    isTeacher,
    isSchool,
    isBureau,
    setRole,
    switchTenant,
    hasRole,
  };
});
