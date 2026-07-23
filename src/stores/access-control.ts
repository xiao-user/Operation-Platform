import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { createDefaultRoles } from "@/features/access-control/default-roles";
import { ADMIN_ROLE_ID, type RoleInput, type RoleRecord } from "@/features/access-control/types";
import type { TenantMemberRecord } from "@/features/tenant-members/types";
import { buildMenuTree } from "@/features/menu-config/menu-tree";
import type { MenuConfigRecord, MenuTreeNode } from "@/features/menu-config/types";
import type { TenantShellConfig } from "@/features/shell-config/types";
import { useNavigationStore } from "@/stores/navigation";
import { useUserStore } from "@/stores/user";
import { cloneJson } from "@/lib/clone-json";
import { operationPlatformPersistence } from "@/features/persistence/runtime-operation-platform-persistence";
import type { TenantInfo } from "@/types/user";

function sortRoles(roles: RoleRecord[]) {
  return [...roles].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "zh-CN"));
}

function defaultRoleInput(): RoleInput {
  return {
    name: "",
    description: "",
    enabled: true,
    sort: 100,
    menuIds: [],
  };
}

export interface PermissionTreeNode extends MenuTreeNode {
  disabled: boolean;
  children: PermissionTreeNode[];
}

export const useAccessControlStore = defineStore("access-control", () => {
  const selectedTenant = ref<TenantInfo | null>(null);
  const loading = ref(false);
  const records = ref<MenuConfigRecord[]>([]);
  const roles = ref<RoleRecord[]>([]);
  const members = ref<TenantMemberRecord[]>([]);
  const shellConfig = ref<TenantShellConfig | null>(null);
  const recoveryNotice = ref<string | null>(null);

  const roleOptions = computed(() =>
    sortRoles(roles.value).map((role) => ({
      value: role.id,
      label: role.name,
      disabled: !role.enabled,
    })),
  );
  const menuTree = computed(() => buildMenuTree(records.value));
  const leafMenuIds = computed(() =>
    records.value
      .filter((record) => record.visible && (record.type === "page" || record.type === "external"))
      .map((record) => record.id),
  );
  const permissionTree = computed<PermissionTreeNode[]>(() => {
    const convert = (nodes: MenuTreeNode[]): PermissionTreeNode[] =>
      nodes
        .filter((node) => node.visible)
        .map((node) => ({
          ...node,
          disabled: node.type !== "page" && node.type !== "external",
          children: convert(node.children),
        }))
        .filter((node) => !node.disabled || node.children.length);
    return convert(menuTree.value);
  });

  function requireTenant() {
    if (!selectedTenant.value) throw new Error("Access control tenant is not loaded");
    return selectedTenant.value;
  }

  async function persist(nextRoles: RoleRecord[]) {
    const tenant = requireTenant();
    if (!shellConfig.value) throw new Error("租户配置尚未加载");
    const configuration = await operationPlatformPersistence.saveConfiguration(tenant, {
      version: 1,
      menuRecords: records.value,
      shellConfig: shellConfig.value,
      roles: nextRoles,
    });
    roles.value = cloneJson(configuration.roles);
    recoveryNotice.value = null;
    members.value = operationPlatformPersistence.peekTenantState(tenant)?.members.members ?? [];
    useUserStore().refreshMemberRoles();
    refreshRuntimeIfCurrent(tenant);
    return roles.value;
  }

  function refreshRuntimeIfCurrent(tenant: TenantInfo) {
    const userStore = useUserStore();
    if (userStore.currentTenant.id === tenant.id) {
      useNavigationStore().loadTenant(tenant);
    }
  }

  let loadRequestId = 0;

  function applyLoadedState(
    tenant: TenantInfo,
    state: Awaited<ReturnType<typeof operationPlatformPersistence.loadTenantState>>,
  ) {
    const result = state.configuration;
    selectedTenant.value = { ...tenant };
    records.value = result.configuration.menuRecords;
    roles.value = result.configuration.roles;
    shellConfig.value = result.configuration.shellConfig;
    const memberResult = state.members;
    members.value = memberResult.members;
    recoveryNotice.value = [result.recoveryNotice, memberResult.recoveryNotice]
      .filter(Boolean)
      .join("；") || null;
  }

  function load(tenant: TenantInfo) {
    const requestId = ++loadRequestId;
    const cached = operationPlatformPersistence.peekTenantState(tenant);
    if (cached) {
      loading.value = false;
      applyLoadedState(tenant, cached);
      return;
    }

    loading.value = true;
    return operationPlatformPersistence.loadTenantState(tenant)
      .then((state) => {
        if (requestId !== loadRequestId) return;
        applyLoadedState(tenant, state);
      })
      .finally(() => {
        if (requestId === loadRequestId) loading.value = false;
      });
  }

  function enabledMemberCountForRole(roleId: string) {
    return members.value.filter((member) => member.enabled && member.roleIds.includes(roleId)).length;
  }

  function memberCountForRole(roleId: string) {
    return members.value.filter((member) => member.roleIds.includes(roleId)).length;
  }

  function assertRoleNotUsedByEnabledMembers(roleId: string) {
    if (enabledMemberCountForRole(roleId) > 0) {
      throw new Error("已有启用成员使用该角色，请先调整成员角色");
    }
  }

  function createRole(input: RoleInput = defaultRoleInput()) {
    const tenant = requireTenant();
    const name = input.name.trim();
    if (roles.value.some((role) => role.name === name)) {
      throw new Error("角色名称不能重复");
    }
    const role: RoleRecord = {
      id: `role-${crypto.randomUUID()}`,
      tenantId: tenant.id,
      name,
      description: input.description.trim(),
      builtIn: false,
      enabled: input.enabled,
      sort: input.sort,
      menuIds: input.menuIds,
    };
    const saved = persist([...roles.value, role]);
    return saved instanceof Promise ? saved.then(() => role) : role;
  }

  function updateRole(roleId: string, input: RoleInput) {
    const name = input.name.trim();
    if (roles.value.some((role) => role.id !== roleId && role.name === name)) {
      throw new Error("角色名称不能重复");
    }
    const existing = roles.value.find((role) => role.id === roleId);
    if (existing?.enabled && !input.enabled) assertRoleNotUsedByEnabledMembers(roleId);
    return persist(
      roles.value.map((role) =>
        role.id === roleId
          ? {
              ...role,
              name: role.builtIn ? role.name : name,
              description: input.description.trim(),
              enabled: role.id === ADMIN_ROLE_ID ? true : input.enabled,
              sort: input.sort,
              menuIds: input.menuIds,
            }
          : role,
      ),
    );
  }

  function setRoleEnabled(roleId: string, enabled: boolean) {
    const existing = roles.value.find((role) => role.id === roleId);
    if (existing?.enabled && !enabled) assertRoleNotUsedByEnabledMembers(roleId);
    return persist(
      roles.value.map((role) =>
        role.id === roleId
          ? {
              ...role,
              enabled: role.id === ADMIN_ROLE_ID ? true : enabled,
            }
          : role,
      ),
    );
  }

  function removeRole(roleId: string) {
    const target = roles.value.find((role) => role.id === roleId);
    if (!target || target.builtIn) return;
    assertRoleNotUsedByEnabledMembers(roleId);
    return persist(roles.value.filter((role) => role.id !== roleId));
  }

  function updateRoleMenuIds(roleId: string, menuIds: string[]) {
    return persist(
      roles.value.map((role) =>
        role.id === roleId
          ? {
              ...role,
              menuIds: role.id === ADMIN_ROLE_ID ? leafMenuIds.value : menuIds,
            }
          : role,
      ),
    );
  }

  function resetRoles() {
    const tenant = requireTenant();
    if (!shellConfig.value) throw new Error("租户配置尚未加载");
    const defaultRoleIds = new Set(createDefaultRoles(tenant, records.value).map((role) => role.id));
    const usedCustomRoleIds = members.value.flatMap((member) =>
      member.enabled ? member.roleIds.filter((roleId) => !defaultRoleIds.has(roleId)) : [],
    );
    if (usedCustomRoleIds.length) {
      throw new Error("已有启用成员使用自定义角色，请先调整成员角色");
    }
    const saved = persist(createDefaultRoles(tenant, records.value));
    if (saved instanceof Promise) {
      return saved.then(() => {
        recoveryNotice.value = null;
        refreshRuntimeIfCurrent(tenant);
      });
    }
    recoveryNotice.value = null;
    refreshRuntimeIfCurrent(tenant);
  }

  return {
    selectedTenant,
    loading,
    records,
    roles,
    members,
    roleOptions,
    menuTree,
    leafMenuIds,
    permissionTree,
    recoveryNotice,
    load,
    createRole,
    updateRole,
    setRoleEnabled,
    removeRole,
    updateRoleMenuIds,
    resetRoles,
    memberCountForRole,
    enabledMemberCountForRole,
  };
});
