import { computed, ref } from "vue";
import type { RouteLocationNormalizedLoaded, Router } from "vue-router";
import { defineStore } from "pinia";
import { pageRegistryByKey } from "@/config/page-registry";
import { tenantMenuRepository } from "@/features/menu-config/local-storage-menu-repository";
import { buildMenuTree, resolveFirstTarget } from "@/features/menu-config/menu-tree";
import { resolveTenantRouteAccess } from "@/router/tenant-route-access";
import { useUserStore } from "@/stores/user";
import type { MenuConfigRecord, MenuTreeNode } from "@/features/menu-config/types";
import type { TenantInfo } from "@/types/user";

function filterVisibleTree(nodes: readonly MenuTreeNode[]): MenuTreeNode[] {
  return nodes
    .filter((node) => node.visible)
    .map((node) => ({ ...node, children: filterVisibleTree(node.children) }));
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

export const useNavigationStore = defineStore("navigation", () => {
  const records = ref<MenuConfigRecord[]>([]);
  const currentTenant = ref<TenantInfo | null>(null);
  const activeModuleId = ref("");
  const activeMenuId = ref("");
  const currentPath = ref("");
  const recoveryNotice = ref<string | null>(null);

  const tree = computed(() => filterVisibleTree(buildMenuTree(records.value)));
  const moduleNodes = computed(() =>
    tree.value.filter(
      (node) => node.type === "module" && resolveFirstTarget(node, pageRegistryByKey) !== null,
    ),
  );
  const activeModuleNode = computed(() =>
    moduleNodes.value.find((node) => node.id === activeModuleId.value) ?? null,
  );
  const currentMenus = computed(() => activeModuleNode.value?.children ?? []);
  const activeMenuNode = computed(() =>
    activeMenuId.value ? findNode(tree.value, activeMenuId.value) : null,
  );
  const activeMenuTrail = computed(() =>
    activeMenuId.value ? findTrail(currentMenus.value, activeMenuId.value) : [],
  );
  const defaultOpenMenus = computed(() =>
    activeMenuTrail.value.filter((node) => node.children.length > 0).map((node) => node.id),
  );

  function loadTenant(tenant: TenantInfo) {
    const result = tenantMenuRepository.list(tenant);
    currentTenant.value = { ...tenant };
    records.value = result.records;
    recoveryNotice.value = result.recoveryNotice;

    if (!moduleNodes.value.some((node) => node.id === activeModuleId.value)) {
      activeModuleId.value = moduleNodes.value[0]?.id ?? "";
      activeMenuId.value = "";
    }
  }

  function setActiveModule(moduleId: string) {
    if (!moduleNodes.value.some((node) => node.id === moduleId)) return;
    activeModuleId.value = moduleId;
    activeMenuId.value = "";
  }

  function setActiveMenu(menuId: string) {
    activeMenuId.value = menuId;
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
    const ownerKey =
      typeof route.meta.menuOwnerKey === "string"
        ? route.meta.menuOwnerKey
        : typeof route.meta.pageKey === "string"
          ? route.meta.pageKey
          : "";
    if (!ownerKey) return;

    const menu = records.value.find(
      (record) => record.type === "page" && record.pageKey === ownerKey && record.visible,
    );
    if (!menu) return;
    activeMenuId.value = menu.id;
    activeModuleId.value = rootModuleIdFor(menu);
  }

  async function navigateToMenu(menuId: string, router: Router) {
    const node = findNode(tree.value, menuId);
    if (!node) return;
    const target = resolveFirstTarget(node, pageRegistryByKey);
    if (!target) return;

    if (node.type === "module") setActiveModule(node.id);
    else setActiveMenu(node.id);

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
    const userStore = useUserStore();
    const result = resolveTenantRouteAccess(
      { path: route.path, meta: route.meta },
      userStore.role,
      records.value,
    );
    if (result.kind === "redirect" && result.path !== route.path) {
      await router.push(result.path);
    } else if (result.kind === "empty" && route.name !== "menu-unavailable") {
      await router.push({ name: "menu-unavailable" });
    }
  }

  return {
    records,
    currentTenant,
    activeModuleId,
    activeMenuId,
    currentPath,
    recoveryNotice,
    tree,
    moduleNodes,
    activeModuleNode,
    currentMenus,
    activeMenuNode,
    activeMenuTrail,
    defaultOpenMenus,
    loadTenant,
    setActiveModule,
    setActiveMenu,
    syncByRoute,
    navigateToMenu,
    ensureValidCurrentRoute,
  };
});
