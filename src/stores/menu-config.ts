import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { pageRegistryByKey } from "@/config/page-registry";
import { collectDescendantIds, buildMenuTree } from "@/features/menu-config/menu-tree";
import {
  MenuValidationError,
  validateMenuRecord,
} from "@/features/menu-config/menu-validation";
import {
  defaultTenantShellConfig,
} from "@/features/shell-config/local-storage-shell-config-repository";
import { ADMIN_ROLE_ID, type RoleRecord } from "@/features/access-control/types";
import {
  createDefaultTenantConfiguration,
  tenantConfigurationRepository,
} from "@/features/tenant-config/local-storage-tenant-configuration-repository";
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
  const roles = ref<RoleRecord[]>([]);
  const shellConfig = ref<TenantShellConfig>(defaultTenantShellConfig());
  const recoveryNotice = ref<string | null>(null);
  const tree = computed(() => buildMenuTree(records.value));
  const roleOptions = computed(() =>
    roles.value
      .filter((role) => role.enabled && role.id !== ADMIN_ROLE_ID)
      .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "zh-CN"))
      .map((role) => ({
        id: role.id,
        name: role.name,
        builtIn: role.builtIn,
      })),
  );

  function load(tenant: TenantInfo) {
    const result = tenantConfigurationRepository.list(tenant);
    selectedTenant.value = { ...tenant };
    records.value = result.configuration.menuRecords;
    roles.value = result.configuration.roles;
    shellConfig.value = result.configuration.shellConfig;
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

  function persist(
    nextRecords: MenuConfigRecord[],
    nextRoles: RoleRecord[] = roles.value,
    nextShellConfig: TenantShellConfig = shellConfig.value,
  ) {
    const tenant = requireTenant();
    const saved = tenantConfigurationRepository.replace(tenant, {
      version: 1,
      menuRecords: nextRecords,
      shellConfig: nextShellConfig,
      roles: nextRoles,
    });
    records.value = saved.menuRecords;
    roles.value = saved.roles;
    shellConfig.value = saved.shellConfig;
    refreshRuntimeIfCurrent(tenant);
    return saved;
  }

  function allLeafMenuIds(source = records.value) {
    return source
      .filter((record) => record.type === "page" || record.type === "external")
      .map((record) => record.id);
  }

  function leafMenuIdsForRecord(recordId: string, source = records.value) {
    const target = source.find((record) => record.id === recordId);
    if (!target) return [];
    if (target.type === "page" || target.type === "external") return [target.id];

    const descendantIds = collectDescendantIds(source, recordId);
    return source
      .filter((record) =>
        descendantIds.has(record.id) && (record.type === "page" || record.type === "external"),
      )
      .map((record) => record.id);
  }

  function persistRoles(nextRoles: RoleRecord[]) {
    const availableMenuIds = new Set(allLeafMenuIds());
    const normalizedRoles = nextRoles.map((role) => {
      const menuIds = role.id === ADMIN_ROLE_ID
        ? [...availableMenuIds]
        : role.menuIds.filter((id) => availableMenuIds.has(id));
      return {
        ...role,
        menuIds: Array.from(new Set(menuIds)),
      };
    });
    return persist(records.value, normalizedRoles).roles;
  }

  function persistShellConfig(nextConfig: TenantShellConfig) {
    return persist(records.value, roles.value, nextConfig).shellConfig;
  }

  function validate(record: MenuConfigRecord, source = records.value) {
    const tenant = requireTenant();
    const codes = validateMenuRecord(record, source, {
      tenantType: tenant.type,
      pages: pageRegistryByKey,
    });
    if (codes.length) throw new MenuValidationError(codes);
  }

  function rolesWithRecordVisibility(
    recordId: string,
    roleIds: string[],
    sourceRecords: MenuConfigRecord[],
    sourceRoles: RoleRecord[] = roles.value,
  ) {
    const leafIds = leafMenuIdsForRecord(recordId, sourceRecords);
    if (!leafIds.length) return sourceRoles;
    const selectedRoleIds = new Set(roleIds);
    const targetLeafIds = new Set(leafIds);
    return sourceRoles.map((role) => {
      if (role.id === ADMIN_ROLE_ID) return role;
      return {
        ...role,
        menuIds: selectedRoleIds.has(role.id)
          ? Array.from(new Set([...role.menuIds, ...targetLeafIds]))
          : role.menuIds.filter((menuId) => !targetLeafIds.has(menuId)),
      };
    });
  }

  function create(input: MenuRecordInput, visibleRoleIds?: string[]) {
    const tenant = requireTenant();
    const inheritedRoleIds = input.parentId ? roleIdsForRecord(input.parentId) : [];
    const hasParentPermissionScope = input.parentId
      ? leafMenuIdsForRecord(input.parentId).length > 0
      : false;
    const created: MenuConfigRecord = {
      ...input,
      id: crypto.randomUUID(),
      tenantId: tenant.id,
    };
    validate(created);
    const nextRecords = [...records.value, created];
    const selectedRoleIds = visibleRoleIds ?? (
      hasParentPermissionScope ? inheritedRoleIds : roleOptions.value.map((role) => role.id)
    );
    const nextRoles = created.type === "page" || created.type === "external"
      ? rolesWithRecordVisibility(created.id, selectedRoleIds, nextRecords)
      : roles.value;
    persist(nextRecords, nextRoles);
    return { ...created };
  }

  function update(id: string, input: MenuRecordInput, visibleRoleIds?: string[]) {
    const tenant = requireTenant();
    const existing = records.value.find((record) => record.id === id);
    if (!existing) throw new Error("菜单不存在或已被删除");
    const updated: MenuConfigRecord = {
      ...input,
      id,
      tenantId: tenant.id,
    };
    validate(updated);
    const nextRecords = records.value.map((record) => (record.id === id ? updated : record));
    const nextRoles = visibleRoleIds
      ? rolesWithRecordVisibility(id, visibleRoleIds, nextRecords)
      : roles.value;
    persist(nextRecords, nextRoles);
    return { ...updated };
  }

  function removeCascade(id: string) {
    if (!records.value.some((record) => record.id === id)) return 0;
    const removedIds = collectDescendantIds(records.value, id);
    removedIds.add(id);
    const nextRecords = records.value.filter((record) => !removedIds.has(record.id));
    const availableMenuIds = new Set(allLeafMenuIds(nextRecords));
    const nextRoles = roles.value.map((role) => ({
      ...role,
      menuIds: role.id === ADMIN_ROLE_ID
        ? [...availableMenuIds]
        : role.menuIds.filter((menuId) => availableMenuIds.has(menuId)),
    }));
    persist(nextRecords, nextRoles);
    return removedIds.size;
  }

  function roleIdsForRecord(recordId: string) {
    const leafIds = leafMenuIdsForRecord(recordId);
    if (!leafIds.length) return roleOptions.value.map((role) => role.id);
    return roles.value
      .filter((role) =>
        role.enabled &&
        role.id !== ADMIN_ROLE_ID &&
        leafIds.every((leafId) => role.menuIds.includes(leafId)),
      )
      .map((role) => role.id);
  }

  function setRecordRoleVisibility(recordId: string, roleIds: string[]) {
    return persistRoles(rolesWithRecordVisibility(recordId, roleIds, records.value));
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
    const icon = input.icon ?? current.icon;
    return persistShellConfig({
      version: 1,
      workbench: {
        enabled: input.enabled ?? current.enabled,
        label,
        icon,
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
    const defaults = createDefaultTenantConfiguration(tenant);
    const nextMenuIds = allLeafMenuIds(defaults.menuRecords);
    persist(
      defaults.menuRecords,
      roles.value.map((role) => ({ ...role, menuIds: [...nextMenuIds] })),
      defaults.shellConfig,
    );
    recoveryNotice.value = null;
    refreshRuntimeIfCurrent(tenant);
    return records.value;
  }

  return {
    selectedTenant,
    records,
    roles,
    roleOptions,
    shellConfig,
    recoveryNotice,
    tree,
    load,
    create,
    update,
    removeCascade,
    roleIdsForRecord,
    setRecordRoleVisibility,
    setVisible,
    updateWorkbench,
    canMove,
    move,
    reset,
  };
});
