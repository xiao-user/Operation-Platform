import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { pageRegistryByKey } from "@/config/page-registry";
import { collectDescendantIds, buildMenuTree } from "@/features/menu-config/menu-tree";
import {
  MenuValidationError,
  validateMenuRecord,
} from "@/features/menu-config/menu-validation";
import { defaultTenantShellConfig } from "@/features/shell-config/default-shell-config";
import { ADMIN_ROLE_ID, type RoleRecord } from "@/features/access-control/types";
import { createDefaultTenantConfiguration } from "@/features/tenant-config/default-tenant-configuration";
import type {
  MenuConfigRecord,
  MenuRecordInput,
} from "@/features/menu-config/types";
import type { TenantShellConfig, WorkbenchConfig } from "@/features/shell-config/types";
import { useNavigationStore } from "@/stores/navigation";
import { useUserStore } from "@/stores/user";
import { cloneJson } from "@/lib/clone-json";
import { operationPlatformPersistence } from "@/features/persistence/runtime-operation-platform-persistence";
import type { TenantConfiguration } from "@/features/tenant-config/types";
import type { TenantInfo } from "@/types/user";

export const useMenuConfigStore = defineStore("menu-config", () => {
  const selectedTenant = ref<TenantInfo | null>(null);
  const loading = ref(false);
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

  let loadRequestId = 0;

  function applyLoadedConfiguration(
    tenant: TenantInfo,
    result: Awaited<ReturnType<typeof operationPlatformPersistence.loadTenantState>>["configuration"],
  ) {
    selectedTenant.value = { ...tenant };
    records.value = result.configuration.menuRecords;
    roles.value = result.configuration.roles;
    shellConfig.value = result.configuration.shellConfig;
    recoveryNotice.value = result.recoveryNotice;
  }

  function load(tenant: TenantInfo) {
    const requestId = ++loadRequestId;
    const cached = operationPlatformPersistence.peekTenantState(tenant);
    if (cached) {
      loading.value = false;
      applyLoadedConfiguration(tenant, cached.configuration);
      return;
    }

    loading.value = true;
    return operationPlatformPersistence.loadTenantState(tenant)
      .then((state) => {
        if (requestId !== loadRequestId) return;
        applyLoadedConfiguration(tenant, state.configuration);
      })
      .finally(() => {
        if (requestId === loadRequestId) loading.value = false;
      });
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

  async function persist(
    nextRecords: MenuConfigRecord[],
    nextRoles: RoleRecord[] = roles.value,
    nextShellConfig: TenantShellConfig = shellConfig.value,
  ) {
    const tenant = requireTenant();
    const next: TenantConfiguration = {
      version: 1,
      menuRecords: nextRecords,
      shellConfig: nextShellConfig,
      roles: nextRoles,
    };
    const saved = cloneJson(await operationPlatformPersistence.saveConfiguration(tenant, next));
    records.value = saved.menuRecords;
    roles.value = saved.roles;
    shellConfig.value = saved.shellConfig;
    recoveryNotice.value = null;
    useUserStore().refreshMemberRoles();
    refreshRuntimeIfCurrent(tenant);
    return saved;
  }

  function mapPersisted<T>(
    value: Promise<TenantConfiguration>,
    mapper: (configuration: TenantConfiguration) => T,
  ) {
    return value.then(mapper);
  }

  function allLeafMenuIds(source = records.value) {
    return source
      .filter((record) => record.type === "page" || record.type === "external")
      .map((record) => record.id);
  }

  function leafMenuRecords(source = records.value) {
    return source.filter((record) => record.type === "page" || record.type === "external");
  }

  function recordPathKey(record: MenuConfigRecord, source: readonly MenuConfigRecord[]) {
    const recordsById = new Map(source.map((item) => [item.id, item]));
    const parts = [`${record.type}:${record.name}`];
    let parentId = record.parentId;
    while (parentId) {
      const parent = recordsById.get(parentId);
      if (!parent) break;
      parts.unshift(`${parent.type}:${parent.name}`);
      parentId = parent.parentId;
    }
    return parts.join("/");
  }

  function grantKeyForRecord(record: MenuConfigRecord, source: readonly MenuConfigRecord[] = records.value) {
    if (record.type === "page" && record.pageKey) {
      const duplicatePageResource = source.some(
        (item) => item.id !== record.id && item.type === "page" && item.pageKey === record.pageKey,
      );
      return duplicatePageResource
        ? `page:${record.pageKey}:${recordPathKey(record, source)}`
        : `page:${record.pageKey}`;
    }
    if (record.type === "external" && record.externalUrl) {
      return `external:${record.externalUrl.trim().toLowerCase()}`;
    }
    return null;
  }

  function grantedLeafKeys(role: RoleRecord, source = records.value) {
    const recordsById = new Map(source.map((record) => [record.id, record]));
    return new Set(
      role.menuIds.flatMap((menuId) => {
        const record = recordsById.get(menuId);
        const key = record ? grantKeyForRecord(record, source) : null;
        return key ? [key] : [];
      }),
    );
  }

  function rolesForDefaultMenu(defaultRecords: MenuConfigRecord[]) {
    const defaultLeafRecords = leafMenuRecords(defaultRecords);
    const defaultLeafIds = defaultLeafRecords.map((record) => record.id);
    const defaultIdsByGrantKey = new Map(
      defaultLeafRecords.flatMap((record) => {
        const key = grantKeyForRecord(record, defaultRecords);
        return key ? [[key, record.id] as const] : [];
      }),
    );

    return roles.value.map((role) => {
      if (role.id === ADMIN_ROLE_ID) return { ...role, menuIds: [...defaultLeafIds] };
      const previousKeys = grantedLeafKeys(role);
      const nextMenuIds = [...previousKeys].flatMap((key) => {
        const id = defaultIdsByGrantKey.get(key);
        return id ? [id] : [];
      });
      return { ...role, menuIds: Array.from(new Set(nextMenuIds)) };
    });
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
    return mapPersisted(persist(records.value, normalizedRoles), (saved) => saved.roles);
  }

  function persistShellConfig(nextConfig: TenantShellConfig) {
    return mapPersisted(
      persist(records.value, roles.value, nextConfig),
      (saved) => saved.shellConfig,
    );
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
    return mapPersisted(persist(nextRecords, nextRoles), () => ({ ...created }));
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
    return mapPersisted(persist(nextRecords, nextRoles), () => ({ ...updated }));
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
    return mapPersisted(persist(nextRecords, nextRoles), () => removedIds.size);
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
    return update(id, input);
  }

  function updateWorkbench(input: Partial<WorkbenchConfig>) {
    const current = shellConfig.value.workbench;
    const label = input.label !== undefined ? input.label.trim() : current.label;
    const sort = input.sort !== undefined ? Number(input.sort) : current.sort;
    const icon = input.icon ?? current.icon;
    const saved = persistShellConfig({
      version: 1,
      workbench: {
        enabled: input.enabled ?? current.enabled,
        label,
        icon,
        sort,
      },
    });
    return saved.then((config) => config.workbench);
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

    return mapPersisted(
      persist(nextRecords),
      () => ({ ...moved, sort: (safeIndex + 1) * 10 }),
    );
  }

  function reset() {
    const tenant = requireTenant();
    const defaults = createDefaultTenantConfiguration(tenant);
    const saved = persist(
      defaults.menuRecords,
      rolesForDefaultMenu(defaults.menuRecords),
      defaults.shellConfig,
    );
    return mapPersisted(saved, () => {
      recoveryNotice.value = null;
      refreshRuntimeIfCurrent(tenant);
      return records.value;
    });
  }

  return {
    selectedTenant,
    loading,
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
