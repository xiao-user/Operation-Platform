import { computed, ref } from "vue";
import type { RouteLocationNormalizedLoaded } from "vue-router";
import { defineStore } from "pinia";
import { findMenuTrailByPath, moduleMenus, moduleDefaultPaths } from "@/config/navigation";
import type { SideMenuItem } from "@/types/navigation";
import type { TenantType } from "@/types/user";

// 各租户类型的默认首页模块
const tenantDefaultModule: Record<TenantType, string> = {
  school: "security",
  bureau: "bureau-custody",
  org: "org-manage",
};

export const useNavigationStore = defineStore("navigation", () => {
  const activeModule = ref("security");
  const activeMenuKey = ref("");
  const currentPath = ref(moduleDefaultPaths["security"]!);

  const currentMenus = computed<SideMenuItem[]>(() => moduleMenus[activeModule.value] ?? []);

  const activeMenuTrail = computed<SideMenuItem[]>(() =>
    findMenuTrailByPath(currentMenus.value, currentPath.value),
  );

  const defaultOpenMenus = computed<string[]>(() =>
    activeMenuTrail.value
      .filter((menu: SideMenuItem) => menu.children?.length)
      .map((menu) => menu.key),
  );

  function syncByRoute(route: RouteLocationNormalizedLoaded) {
    const segments = route.path.split("/").filter(Boolean);
    currentPath.value = route.path;

    activeModule.value =
      typeof route.meta.moduleKey === "string" ? route.meta.moduleKey : segments[0] || "security";

    const menuTrail = findMenuTrailByPath(moduleMenus[activeModule.value] ?? [], route.path);

    activeMenuKey.value =
      menuTrail[menuTrail.length - 1]?.key ||
      (typeof route.meta.menuKey === "string"
        ? route.meta.menuKey
        : segments[segments.length - 1] || "");
  }

  /** 切换租户类型时重置到对应默认模块 */
  function resetToTenantDefault(tenantType: TenantType) {
    const defaultModule = tenantDefaultModule[tenantType];
    activeModule.value = defaultModule;
    activeMenuKey.value = "";
    currentPath.value = moduleDefaultPaths[defaultModule] ?? "/";
  }

  function setActiveMenu(menuKey: string) {
    activeMenuKey.value = menuKey;
  }

  return {
    activeModule,
    activeMenuKey,
    currentMenus,
    activeMenuTrail,
    defaultOpenMenus,
    syncByRoute,
    resetToTenantDefault,
    setActiveMenu,
  };
});
