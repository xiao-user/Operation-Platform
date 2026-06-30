import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { pageRegistryByKey } from "@/config/page-registry";
import { tenantMenuRepository } from "@/features/menu-config/local-storage-menu-repository";
import { collectDescendantIds, buildMenuTree } from "@/features/menu-config/menu-tree";
import {
  MenuValidationError,
  validateMenuRecord,
} from "@/features/menu-config/menu-validation";
import type {
  MenuConfigRecord,
  MenuRecordInput,
} from "@/features/menu-config/types";
import { useNavigationStore } from "@/stores/navigation";
import { useUserStore } from "@/stores/user";
import type { TenantInfo } from "@/types/user";

export const useMenuConfigStore = defineStore("menu-config", () => {
  const selectedTenant = ref<TenantInfo | null>(null);
  const records = ref<MenuConfigRecord[]>([]);
  const recoveryNotice = ref<string | null>(null);
  const tree = computed(() => buildMenuTree(records.value));

  function load(tenant: TenantInfo) {
    const result = tenantMenuRepository.list(tenant);
    selectedTenant.value = { ...tenant };
    records.value = result.records;
    recoveryNotice.value = result.recoveryNotice;
  }

  function requireTenant() {
    if (!selectedTenant.value) throw new Error("请先选择租户");
    return selectedTenant.value;
  }

  function refreshRuntimeIfCurrent(tenant: TenantInfo) {
    const userStore = useUserStore();
    if (userStore.currentTenant.id === tenant.id) {
      useNavigationStore().loadTenant(tenant);
    }
  }

  function persist(nextRecords: MenuConfigRecord[]) {
    const tenant = requireTenant();
    const saved = tenantMenuRepository.replace(tenant, nextRecords);
    records.value = saved;
    refreshRuntimeIfCurrent(tenant);
    return saved;
  }

  function validate(record: MenuConfigRecord, source = records.value) {
    const tenant = requireTenant();
    const codes = validateMenuRecord(record, source, {
      tenantType: tenant.type,
      pages: pageRegistryByKey,
    });
    if (codes.length) throw new MenuValidationError(codes);
  }

  function create(input: MenuRecordInput) {
    const tenant = requireTenant();
    const created: MenuConfigRecord = {
      ...input,
      id: crypto.randomUUID(),
      tenantId: tenant.id,
    };
    validate(created);
    persist([...records.value, created]);
    return { ...created };
  }

  function update(id: string, input: MenuRecordInput) {
    const tenant = requireTenant();
    const existing = records.value.find((record) => record.id === id);
    if (!existing) throw new Error("菜单不存在或已被删除");
    const updated: MenuConfigRecord = {
      ...input,
      id,
      tenantId: tenant.id,
    };
    validate(updated);
    persist(records.value.map((record) => (record.id === id ? updated : record)));
    return { ...updated };
  }

  function removeCascade(id: string) {
    if (!records.value.some((record) => record.id === id)) return 0;
    const removedIds = collectDescendantIds(records.value, id);
    removedIds.add(id);
    persist(records.value.filter((record) => !removedIds.has(record.id)));
    return removedIds.size;
  }

  function setVisible(id: string, visible: boolean) {
    const existing = records.value.find((record) => record.id === id);
    if (!existing) return;
    const input: MenuRecordInput = { ...existing, visible };
    update(id, input);
  }

  function reset() {
    const tenant = requireTenant();
    records.value = tenantMenuRepository.reset(tenant);
    recoveryNotice.value = null;
    refreshRuntimeIfCurrent(tenant);
    return records.value;
  }

  return {
    selectedTenant,
    records,
    recoveryNotice,
    tree,
    load,
    create,
    update,
    removeCascade,
    setVisible,
    reset,
  };
});
