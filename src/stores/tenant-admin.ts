import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { createCurrentUserAdminMember } from "@/features/tenant-members/tenant-member-factories";
import { createDefaultTenantConfiguration } from "@/features/tenant-config/default-tenant-configuration";
import { operationPlatformPersistence } from "@/features/persistence/runtime-operation-platform-persistence";
import { useNavigationStore } from "@/stores/navigation";
import { useUserStore } from "@/stores/user";
import type { TenantInfo, TenantType } from "@/types/user";

export type TenantDraft = Omit<TenantInfo, "id"> & { id?: string };

function nextTenantId(type: TenantType) {
  return `${type}-${crypto.randomUUID()}`;
}

export const useTenantAdminStore = defineStore("tenant-admin", () => {
  const userStore = useUserStore();
  const tenants = ref<TenantInfo[]>(userStore.tenantList.map((tenant) => ({ ...tenant })));
  const recoveryNotice = ref(userStore.tenantRecoveryNotice);
  const enabledTenants = computed(() => tenants.value.filter((tenant) => tenant.enabled !== false));

  function syncRuntimeStores() {
    recoveryNotice.value = null;
    userStore.refreshTenants();
    tenants.value = userStore.tenantList.map((tenant) => ({ ...tenant }));
    useNavigationStore().loadTenant(userStore.currentTenant);
  }

  async function create(input: TenantDraft) {
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
    const member = createCurrentUserAdminMember(tenant, userStore.userInfo);
    const configuration = createDefaultTenantConfiguration(tenant);
    const saved = await operationPlatformPersistence.createTenant(tenant, configuration, member);
    syncRuntimeStores();
    return saved;
  }

  async function update(tenantId: string, input: TenantDraft) {
    const name = input.name.trim();
    if (tenants.value.some((tenant) => tenant.id !== tenantId && tenant.name === name)) {
      throw new Error("组织名称不能重复");
    }
    const existing = tenants.value.find((tenant) => tenant.id === tenantId);
    if (!existing) throw new Error("组织不存在或已被删除");
    await operationPlatformPersistence.updateTenant({
      ...existing,
      name,
      shortName: input.shortName.trim(),
      enabled: existing.type === "platform" ? true : input.enabled !== false,
    });
    syncRuntimeStores();
  }

  async function setEnabled(tenantId: string, enabled: boolean) {
    const existing = tenants.value.find((tenant) => tenant.id === tenantId);
    if (!existing) return;
    await update(tenantId, { ...existing, enabled });
  }

  async function remove(tenantId: string) {
    const target = tenants.value.find((tenant) => tenant.id === tenantId);
    if (!target || target.type === "platform") return;
    await operationPlatformPersistence.deleteTenant(tenantId);
    syncRuntimeStores();
  }

  function reload() {
    tenants.value = operationPlatformPersistence.listTenants();
    recoveryNotice.value = null;
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
