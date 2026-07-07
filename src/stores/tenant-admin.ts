import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { tenantRepository } from "@/features/tenant/local-storage-tenant-repository";
import {
  createCurrentUserAdminMember,
  tenantMemberRepository,
} from "@/features/tenant-members/local-storage-tenant-member-repository";
import { tenantConfigurationRepository } from "@/features/tenant-config/local-storage-tenant-configuration-repository";
import { useNavigationStore } from "@/stores/navigation";
import { useUserStore } from "@/stores/user";
import type { TenantInfo, TenantType } from "@/types/user";

export type TenantDraft = Omit<TenantInfo, "id"> & { id?: string };

function nextTenantId(type: TenantType) {
  return `${type}-${crypto.randomUUID()}`;
}

export const useTenantAdminStore = defineStore("tenant-admin", () => {
  const loadResult = tenantRepository.list();
  const tenants = ref<TenantInfo[]>(loadResult.tenants);
  const recoveryNotice = ref(loadResult.recoveryNotice);
  const enabledTenants = computed(() => tenants.value.filter((tenant) => tenant.enabled !== false));

  function persist(nextTenants: TenantInfo[]) {
    tenants.value = tenantRepository.replace(nextTenants);
    syncRuntimeStores();
  }

  function syncRuntimeStores() {
    recoveryNotice.value = null;
    const userStore = useUserStore();
    userStore.refreshTenants();
    const navigationStore = useNavigationStore();
    navigationStore.loadTenant(userStore.currentTenant);
  }

  function create(input: TenantDraft) {
    const name = input.name.trim();
    if (tenants.value.some((tenant) => tenant.name === name)) {
      throw new Error("组织名称不能重复");
    }
    const tenant: TenantInfo = {
      id: input.id ?? nextTenantId(input.type),
      name,
      shortName: input.shortName.trim(),
      type: input.type,
      enabled: input.enabled !== false,
    };
    const previousTenants = tenants.value.map((item) => ({ ...item }));
    const savedTenants = tenantRepository.replace([...tenants.value, tenant]);
    try {
      const userStore = useUserStore();
      tenantMemberRepository.replace(tenant, [
        createCurrentUserAdminMember(tenant, userStore.userInfo),
      ]);
    } catch (error) {
      tenantRepository.replace(previousTenants);
      throw error;
    }
    tenants.value = savedTenants;
    syncRuntimeStores();
    return tenant;
  }

  function update(tenantId: string, input: TenantDraft) {
    const name = input.name.trim();
    if (tenants.value.some((tenant) => tenant.id !== tenantId && tenant.name === name)) {
      throw new Error("组织名称不能重复");
    }
    persist(
      tenants.value.map((tenant) =>
        tenant.id === tenantId
          ? {
              ...tenant,
              name,
              shortName: input.shortName.trim(),
              type: tenant.type,
              enabled: tenant.type === "platform" ? true : input.enabled !== false,
            }
          : tenant,
      ),
    );
  }

  function setEnabled(tenantId: string, enabled: boolean) {
    persist(
      tenants.value.map((tenant) =>
        tenant.id === tenantId
          ? { ...tenant, enabled: tenant.type === "platform" ? true : enabled }
          : tenant,
      ),
    );
  }

  function remove(tenantId: string) {
    const target = tenants.value.find((tenant) => tenant.id === tenantId);
    if (!target || target.type === "platform") return;
    const previousTenants = tenants.value.map((tenant) => ({ ...tenant }));
    const nextTenants = previousTenants.filter((tenant) => tenant.id !== tenantId);
    const savedTenants = tenantRepository.replace(nextTenants);
    try {
      tenantConfigurationRepository.remove(tenantId);
    } catch (error) {
      try {
        tenantRepository.replace(previousTenants);
      } catch (rollbackError) {
        throw new Error(
          `组织删除失败且组织列表回滚失败（原始错误：${error instanceof Error ? error.message : "未知错误"}；回滚错误：${rollbackError instanceof Error ? rollbackError.message : "未知错误"}）`,
        );
      }
      throw error;
    }
    tenants.value = savedTenants;
    syncRuntimeStores();
  }

  function reload() {
    const result = tenantRepository.list();
    tenants.value = result.tenants;
    recoveryNotice.value = result.recoveryNotice;
  }

  return {
    tenants,
    enabledTenants,
    recoveryNotice,
    create,
    update,
    setEnabled,
    remove,
    reload,
  };
});
