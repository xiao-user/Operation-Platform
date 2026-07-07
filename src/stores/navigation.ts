import { computed, ref } from "vue";
import type { RouteLocationNormalizedLoaded, Router } from "vue-router";
import { defineStore } from "pinia";
import { pageRegistryByKey } from "@/config/page-registry";
import {
  filterMenuTreeByRole,
  isAdminAccess,
  resolveAccessRole,
  resolveAccessRoles,
} from "@/features/access-control/menu-permissions";
import type { RoleRecord } from "@/features/access-control/types";
import { buildMenuTree, resolveFirstTarget } from "@/features/menu-config/menu-tree";
import { defaultTenantShellConfig } from "@/features/shell-config/local-storage-shell-config-repository";
import { tenantConfigurationRepository } from "@/features/tenant-config/local-storage-tenant-configuration-repository";
import {
  resolveFirstTenantInternalPath,
  resolveTenantRouteAccess,
} from "@/router/tenant-route-access";
import { useUserStore } from "@/stores/user";
import type { MenuConfigRecord, MenuTreeNode } from "@/features/menu-config/types";
import type { TenantShellConfig } from "@/features/shell-config/types";
import type { MenuIconKey } from "@/types/navigation";
import type { TenantInfo } from "@/types/user";

export type TopLevelNavItem =
  | {
      kind: "workbench";
      id: "workbench";
      name: string;
      sort: number;
      icon: MenuIconKey;
      path: "/workbench";
    }
  | {
      kind: "module";
      id: string;
      name: string;
      sort: number;
      icon: MenuIconKey | null;
      node: MenuTreeNode;
    };

function isRoleAllowedNode(node: MenuTreeNode, isAdmin: boolean) {
  if (node.type !== "page" || !node.pageKey) return true;
  const page = pageRegistryByKey.get(node.pageKey);
  return Boolean(page && (!page.requiresAdmin || isAdmin));
}

function filterVisibleTree(nodes: readonly MenuTreeNode[], isAdmin: boolean): MenuTreeNode[] {
  return nodes
    .filter((node) => node.visible && isRoleAllowedNode(node, isAdmin))
    .map((node) => ({ ...node, children: filterVisibleTree(node.children, isAdmin) }));
}

function findNode(nodes: readonly MenuTreeNode[], id: string): MenuTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNode(node.children, id);
    if (child) return child;
  }
  return null;
}

function findTrail(
  nodes: readonly MenuTreeNode[],
  id: string,
  trail: MenuTreeNode[] = [],
): MenuTreeNode[] {
  for (const node of nodes) {
    const nextTrail = [...trail, node];
    if (node.id === id) return nextTrail;
    const childTrail = findTrail(node.children, id, nextTrail);
    if (childTrail.length) return childTrail;
  }
  return [];
}

function routeParamValue(value: unknown) {
  if (Array.isArray(value)) return value[0];
  return typeof value === "string" ? value : "";
}

export const useNavigationStore = defineStore("navigation", () => {
  const userStore = useUserStore();
  const records = ref<MenuConfigRecord[]>([]);
  const roles = ref<RoleRecord[]>([]);
  const shellConfig = ref<TenantShellConfig>(defaultTenantShellConfig());
  const currentTenant = ref<TenantInfo | null>(null);
  const activeModuleId = ref("");
  const activeMenuId = ref("");
  const currentPath = ref("");
  const recoveryNotice = ref<string | null>(null);

  const workbenchConfig = computed(() => shellConfig.value.workbench);
  const isWorkbenchRoute = computed(() => currentPath.value === "/workbench");
  const authenticatedRoleIds = computed(() =>
    currentTenant.value ? userStore.roleIdsForTenant(currentTenant.value.id) : [],
  );
  const activeRoleId = computed(() =>
    currentTenant.value ? userStore.activeRoleIdForTenant(currentTenant.value.id) : null,
  );
  const availableRoleRecords = computed(() =>
    resolveAccessRoles(authenticatedRoleIds.value, roles.value, records.value),
  );
  const activeRoleRecord = computed(() =>
    resolveAccessRole(activeRoleId.value, roles.value, records.value),
  );
  const activeRoleRecords = computed(() =>
    activeRoleRecord.value ? [activeRoleRecord.value] : [],
  );
  const tree = computed(() =>
    filterVisibleTree(
      filterMenuTreeByRole(buildMenuTree(records.value), activeRoleRecord.value),
      isAdminAccess(activeRoleRecord.value),
    ),
  );
  const moduleNodes = computed(() =>
    tree.value.filter(
      (node) => node.type === "module" && resolveFirstTarget(node, pageRegistryByKey) !== null,
    ),
  );
  const topLevelNavItems = computed<TopLevelNavItem[]>(() => {
    const workbenchItems: TopLevelNavItem[] = workbenchConfig.value.enabled && activeRoleRecord.value
      ? [
          {
            kind: "workbench",
            id: "workbench",
            name: workbenchConfig.value.label,
            sort: workbenchConfig.value.sort,
            icon: workbenchConfig.value.icon,
            path: "/workbench",
          },
        ]
      : [];
    const modules: TopLevelNavItem[] = moduleNodes.value.map((node) => ({
      kind: "module",
      id: node.id,
      name: node.name,
      sort: node.sort,
      icon: node.icon,
      node,
    }));
    return [...workbenchItems, ...modules].sort(
      (a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "zh-CN"),
    );
  });
  const activeModuleNode = computed(() =>
    moduleNodes.value.find((node) => node.id === activeModuleId.value) ?? null,
  );
  const currentMenus = computed(() => activeModuleNode.value?.children ?? []);
  const secondLevelTabs = computed(() =>
    currentMenus.value.filter((node) => resolveFirstTarget(node, pageRegistryByKey) !== null),
  );
  const activeMenuNode = computed(() =>
    activeMenuId.value ? findNode(tree.value, activeMenuId.value) : null,
  );
  const activeMenuTrail = computed(() =>
    activeMenuId.value ? findTrail(currentMenus.value, activeMenuId.value) : [],
  );
  const activeSecondLevelNode = computed(() => activeMenuTrail.value[0] ?? null);
  const moduleRailNodes = computed(() => moduleNodes.value);
  const deepMenus = computed(() => activeSecondLevelNode.value?.children ?? []);
  const defaultOpenMenus = computed(() =>
    activeMenuTrail.value.filter((node) => node.children.length > 0).map((node) => node.id),
  );
  const firstInternalPath = computed(() =>
    resolveFirstTenantInternalPath(records.value, activeRoleId.value, roles.value),
  );
  const defaultEntryPath = computed(() => {
    if (!activeRoleRecord.value) return "/menu-unavailable";
    return workbenchConfig.value.enabled ? "/workbench" : firstInternalPath.value ?? "/menu-unavailable";
  });

  function loadTenant(tenant: TenantInfo) {
    const result = tenantConfigurationRepository.list(tenant);
    const configuration = result.configuration;
    currentTenant.value = { ...tenant };
    records.value = configuration.menuRecords;
    roles.value = configuration.roles;
    shellConfig.value = configuration.shellConfig;
    recoveryNotice.value = result.recoveryNotice;

    if (!moduleNodes.value.some((node) => node.id === activeModuleId.value)) {
      activeModuleId.value = moduleNodes.value[0]?.id ?? "";
      activeMenuId.value = "";
    }
  }

  function rootModuleIdFor(record: MenuConfigRecord) {
    const byId = new Map(records.value.map((item) => [item.id, item]));
    let current: MenuConfigRecord | undefined = record;
    const visited = new Set<string>();
    while (current?.parentId) {
      if (visited.has(current.id)) return "";
      visited.add(current.id);
      current = byId.get(current.parentId);
    }
    return current?.type === "module" ? current.id : "";
  }

  function syncByRoute(route: RouteLocationNormalizedLoaded) {
    currentPath.value = route.path;
    if (route.meta.fixedWorkbench === true || route.path === "/workbench") {
      activeMenuId.value = "";
      return;
    }

    const ownerKey =
      typeof route.meta.menuOwnerKey === "string"
        ? route.meta.menuOwnerKey
        : typeof route.meta.pageKey === "string"
          ? route.meta.pageKey
          : "";
    if (!ownerKey) return;

    const pageKey = typeof route.meta.pageKey === "string" ? route.meta.pageKey : "";
    const registeredPage = pageKey ? pageRegistryByKey.get(pageKey) : null;
    if (registeredPage?.menuRouteParam) {
      const scopedMenuId = routeParamValue(route.params[registeredPage.menuRouteParam]);
      const scopedMenu = records.value.find(
        (record) =>
          record.id === scopedMenuId &&
          record.type === "page" &&
          record.pageKey === registeredPage.key &&
          record.visible,
      );
      if (!scopedMenu) return;
      activeMenuId.value = scopedMenu.id;
      activeModuleId.value = rootModuleIdFor(scopedMenu);
      return;
    }

    const menu = records.value.find(
      (record) => record.type === "page" && record.pageKey === ownerKey && record.visible,
    );
    if (!menu) return;
    activeMenuId.value = menu.id;
    activeModuleId.value = rootModuleIdFor(menu);
  }

  async function navigateToWorkbench(router: Router) {
    if (workbenchConfig.value.enabled) {
      await router.push("/workbench");
    } else {
      await navigateToDefault(router);
    }
  }

  async function navigateToDefault(router: Router) {
    if (defaultEntryPath.value === "/menu-unavailable") {
      await router.push({ name: "menu-unavailable" });
      return;
    }
    await router.push(defaultEntryPath.value);
  }

  async function navigateToMenu(menuId: string, router: Router) {
    const node = findNode(tree.value, menuId);
    if (!node) return;
    if (node.type === "module" && activeModuleId.value === node.id && activeMenuId.value) {
      return;
    }
    const target = resolveFirstTarget(node, pageRegistryByKey);
    if (!target) return;

    if (target.kind === "internal") {
      await router.push(target.path);
      return;
    }

    if (target.openMode === "new-tab") {
      window.open(target.url, "_blank", "noopener,noreferrer");
    } else {
      window.location.assign(target.url);
    }
  }

  async function ensureValidCurrentRoute(router: Router) {
    if (!currentTenant.value) return;
    const route = router.currentRoute.value;
    const result = resolveTenantRouteAccess(
      { path: route.path, meta: route.meta },
      activeRoleId.value,
      records.value,
      shellConfig.value,
      roles.value,
    );
    const shouldUseDefaultEntry =
      route.meta.requiresAdmin === true && defaultEntryPath.value !== "/menu-unavailable";
    const defaultEntry = shouldUseDefaultEntry ? defaultEntryPath.value : null;
    if (result.kind === "redirect" && result.path !== route.path) {
      await router.push(defaultEntry ?? result.path);
    } else if (result.kind === "empty" && route.name !== "menu-unavailable") {
      await router.push(defaultEntry ?? { name: "menu-unavailable" });
    }
  }

  return {
    records,
    roles,
    shellConfig,
    activeRoleId,
    availableRoleRecords,
    activeRoleRecords,
    activeRoleRecord,
    currentTenant,
    activeModuleId,
    activeMenuId,
    currentPath,
    recoveryNotice,
    workbenchConfig,
    isWorkbenchRoute,
    tree,
    moduleNodes,
    topLevelNavItems,
    activeModuleNode,
    currentMenus,
    secondLevelTabs,
    activeMenuNode,
    activeMenuTrail,
    activeSecondLevelNode,
    moduleRailNodes,
    deepMenus,
    defaultOpenMenus,
    firstInternalPath,
    defaultEntryPath,
    loadTenant,
    syncByRoute,
    navigateToWorkbench,
    navigateToDefault,
    navigateToMenu,
    ensureValidCurrentRoute,
  };
});
