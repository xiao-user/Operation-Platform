import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { pageRegistryByKey } from "@/config/page-registry";
import { tenantMenuRepository } from "@/features/menu-config/local-storage-menu-repository";
import { collectDescendantIds, buildMenuTree } from "@/features/menu-config/menu-tree";
import {
  MenuValidationError,
  validateMenuRecord,
} from "@/features/menu-config/menu-validation";
import {
  defaultTenantShellConfig,
  tenantShellConfigRepository,
} from "@/features/shell-config/local-storage-shell-config-repository";
import type {
  MenuConfigRecord,
  MenuRecordInput,
} from "@/features/menu-config/types";
import type { TenantShellConfig, WorkbenchConfig } from "@/features/shell-config/types";
import { useNavigationStore } from "@/stores/navigation";
import { useUserStore } from "@/stores/user";
import type { TenantInfo } from "@/types/user";

export const useMenuConfigStore = defineStore("menu-config", () => {
  const selectedTenant = ref<TenantInfo | null>(null);
  const records = ref<MenuConfigRecord[]>([]);
  const shellConfig = ref<TenantShellConfig>(defaultTenantShellConfig());
  const recoveryNotice = ref<string | null>(null);
  const tree = computed(() => buildMenuTree(records.value));

  function load(tenant: TenantInfo) {
    const menuResult = tenantMenuRepository.list(tenant);
    const shellResult = tenantShellConfigRepository.list(tenant);
    selectedTenant.value = { ...tenant };
    records.value = menuResult.records;
    shellConfig.value = shellResult.config;
    recoveryNotice.value = [menuResult.recoveryNotice, shellResult.recoveryNotice]
      .filter(Boolean)
      .join("；") || null;
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

  function persistShellConfig(nextConfig: TenantShellConfig) {
    const tenant = requireTenant();
    const saved = tenantShellConfigRepository.replace(tenant, nextConfig);
    shellConfig.value = saved;
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

  function updateWorkbench(input: Partial<WorkbenchConfig>) {
    const current = shellConfig.value.workbench;
    const label = input.label !== undefined ? input.label.trim() : current.label;
    const sort = input.sort !== undefined ? Number(input.sort) : current.sort;
    return persistShellConfig({
      version: 1,
      workbench: {
        enabled: input.enabled ?? current.enabled,
        label,
        sort,
      },
    }).workbench;
  }

  function canMove(id: string, nextParentId: string | null) {
    const existing = records.value.find((record) => record.id === id);
    if (!existing) return false;
    const moved: MenuConfigRecord = { ...existing, parentId: nextParentId };
    return validateMenuRecord(moved, records.value, {
      tenantType: requireTenant().type,
      pages: pageRegistryByKey,
    }).length === 0;
  }

  function sortedSiblings(source: readonly MenuConfigRecord[], parentId: string | null) {
    return source
      .filter((record) => record.parentId === parentId)
      .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "zh-CN"));
  }

  function replaceSiblings(
    source: readonly MenuConfigRecord[],
    parentId: string | null,
    siblings: readonly MenuConfigRecord[],
  ) {
    const siblingIds = new Set(siblings.map((record) => record.id));
    const normalizedSiblings = siblings.map((record, index) => ({
      ...record,
      parentId,
      sort: (index + 1) * 10,
    }));

    return [
      ...source.filter(
        (record) => record.parentId !== parentId && !siblingIds.has(record.id),
      ),
      ...normalizedSiblings,
    ];
  }

  function move(id: string, nextParentId: string | null, nextIndex: number) {
    const existing = records.value.find((record) => record.id === id);
    if (!existing) throw new Error("菜单不存在或已被删除");

    const moved: MenuConfigRecord = { ...existing, parentId: nextParentId };
    validate(moved);

    const withoutMoved = records.value.filter((record) => record.id !== id);
    const targetSiblings = sortedSiblings(withoutMoved, nextParentId);
    const safeIndex = Math.max(0, Math.min(nextIndex, targetSiblings.length));
    targetSiblings.splice(safeIndex, 0, moved);

    let nextRecords = replaceSiblings(withoutMoved, nextParentId, targetSiblings);
    if (existing.parentId !== nextParentId) {
      nextRecords = replaceSiblings(
        nextRecords,
        existing.parentId,
        sortedSiblings(nextRecords, existing.parentId),
      );
    }

    persist(nextRecords);
    return { ...moved, sort: (safeIndex + 1) * 10 };
  }

  function reset() {
    const tenant = requireTenant();
    records.value = tenantMenuRepository.reset(tenant);
    shellConfig.value = tenantShellConfigRepository.reset(tenant);
    recoveryNotice.value = null;
    refreshRuntimeIfCurrent(tenant);
    return records.value;
  }

  return {
    selectedTenant,
    records,
    shellConfig,
    recoveryNotice,
    tree,
    load,
    create,
    update,
    removeCascade,
    setVisible,
    updateWorkbench,
    canMove,
    move,
    reset,
  };
});
