import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { DEVELOPING_PAGE_KEY } from "@/config/page-registry";
import { useNavigationStore } from "@/stores/navigation";
import { useUserStore } from "@/stores/user";
import { tenantMenuRepository } from "@/features/menu-config/local-storage-menu-repository";
import { tenantRoleRepository } from "@/features/access-control/local-storage-role-repository";
import { ADMIN_ROLE_ID, STAFF_ROLE_ID } from "@/features/access-control/types";
import {
  defaultTenantShellConfig,
  tenantShellConfigRepository,
} from "@/features/shell-config/local-storage-shell-config-repository";
import type { TenantInfo } from "@/types/user";

const schoolA: TenantInfo = {
  id: "school-a",
  name: "学校 A",
  shortName: "学校 A",
  type: "school",
};
const schoolB: TenantInfo = {
  id: "school-b",
  name: "学校 B",
  shortName: "学校 B",
  type: "school",
};

describe("navigation store", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("loads modules from a concrete tenant configuration", () => {
    const store = useNavigationStore();

    store.loadTenant(schoolA);

    expect(store.moduleNodes).toHaveLength(7);
    expect(store.moduleNodes.map((node) => node.name)).toContain("平安校园");
    expect(store.topLevelNavItems[0]).toMatchObject({
      kind: "workbench",
      name: "工作台",
      icon: "LayoutGrid",
    });
    expect(store.currentMenus.every((node) => node.parentId === store.activeModuleId)).toBe(true);
  });

  it("loads hidden workbench config independently from business menus", () => {
    const shellConfig = defaultTenantShellConfig();
    shellConfig.workbench.enabled = false;
    shellConfig.workbench.label = "首页";
    shellConfig.workbench.icon = "House";
    tenantShellConfigRepository.replace(schoolA, shellConfig);

    const store = useNavigationStore();
    store.loadTenant(schoolA);

    expect(store.workbenchConfig).toEqual({
      enabled: false,
      label: "首页",
      icon: "House",
      sort: 0,
    });
    expect(store.topLevelNavItems.some((item) => item.kind === "workbench")).toBe(false);
    expect(store.moduleNodes.map((node) => node.name)).toContain("平安校园");
  });

  it("keeps two schools on independent menu configurations", () => {
    const firstRecords = tenantMenuRepository.list(schoolA).records;
    const security = firstRecords.find((record) => record.name === "平安校园" && record.type === "module")!;
    security.name = "学校 A 安防";
    tenantMenuRepository.replace(schoolA, firstRecords);

    const store = useNavigationStore();
    store.loadTenant(schoolA);
    expect(store.moduleNodes.map((node) => node.name)).toContain("学校 A 安防");

    store.loadTenant(schoolB);
    expect(store.moduleNodes.map((node) => node.name)).toContain("平安校园");
    expect(store.moduleNodes.map((node) => node.name)).not.toContain("学校 A 安防");
  });

  it("does not show modules without a visible navigable target", () => {
    const records = tenantMenuRepository.list(schoolA).records;
    const familyModule = records.find((record) => record.name === "家校共育" && record.type === "module")!;
    for (const record of records) {
      if (record.parentId === familyModule.id) record.visible = false;
    }
    tenantMenuRepository.replace(schoolA, records);

    const store = useNavigationStore();
    store.loadTenant(schoolA);

    expect(store.moduleNodes.map((node) => node.name)).not.toContain("家校共育");
  });

  it("syncs the active module and menu from route ownership metadata", () => {
    const store = useNavigationStore();
    store.loadTenant(schoolA);
    const badgeMenu = store.records.find((record) => record.name === "班牌列表")!;

    store.syncByRoute({
      path: `/developing/${badgeMenu.id}`,
      fullPath: `/developing/${badgeMenu.id}`,
      params: { menuId: badgeMenu.id },
      meta: { pageKey: DEVELOPING_PAGE_KEY },
    } as never);

    expect(store.activeMenuNode?.name).toBe("班牌列表");
    expect(store.activeModuleNode?.name).toBe("平安校园");
    expect(store.activeSecondLevelNode?.name).toBe("班牌管理");
    expect(store.deepMenus.map((node) => node.name)).toContain("班牌列表");
    expect(store.secondLevelTabs.map((node) => node.name)).toEqual([
      "职工考勤",
      "学生考勤",
      "班牌管理",
    ]);
  });

  it("navigates an internal menu through its registered page", async () => {
    const store = useNavigationStore();
    store.loadTenant(schoolA);
    const deviceMenu = store.records.find((record) => record.name === "班牌列表")!;
    const push = vi.fn().mockResolvedValue(undefined);

    await store.navigateToMenu(deviceMenu.id, { push } as never);

    expect(push).toHaveBeenCalledWith(`/developing/${deviceMenu.id}`);
  });

  it("keeps the current menu selected when clicking the active first-level module again", async () => {
    const store = useNavigationStore();
    store.loadTenant(schoolA);
    const deviceMenu = store.records.find((record) => record.name === "班牌列表")!;
    store.syncByRoute({
      path: `/developing/${deviceMenu.id}`,
      fullPath: `/developing/${deviceMenu.id}`,
      params: { menuId: deviceMenu.id },
      meta: { pageKey: DEVELOPING_PAGE_KEY },
    } as never);
    const activeModuleId = store.activeModuleId;
    const push = vi.fn().mockResolvedValue(undefined);

    await store.navigateToMenu(activeModuleId, { push } as never);

    expect(store.activeMenuId).toBe(deviceMenu.id);
    expect(push).not.toHaveBeenCalled();
  });

  it("keeps the existing deep menu mounted until the next module route is confirmed", async () => {
    const store = useNavigationStore();
    store.loadTenant(schoolA);
    const currentMenu = store.records.find((record) => record.name === "班牌列表")!;
    store.syncByRoute({
      path: `/developing/${currentMenu.id}`,
      fullPath: `/developing/${currentMenu.id}`,
      params: { menuId: currentMenu.id },
      meta: { pageKey: DEVELOPING_PAGE_KEY },
    } as never);
    const previousModuleId = store.activeModuleId;
    const previousMenuId = store.activeMenuId;
    const previousDeepMenuIds = store.deepMenus.map((node) => node.id);
    const nextModule = store.moduleNodes.find((node) => node.id !== previousModuleId)!;
    const push = vi.fn().mockResolvedValue(undefined);

    await store.navigateToMenu(nextModule.id, { push } as never);

    expect(push).toHaveBeenCalledOnce();
    expect(store.activeModuleId).toBe(previousModuleId);
    expect(store.activeMenuId).toBe(previousMenuId);
    expect(store.deepMenus.map((node) => node.id)).toEqual(previousDeepMenuIds);
  });

  it("supports four-level navigation with second-level tabs and recursive sidebar menus", async () => {
    const records = tenantMenuRepository.list(schoolA).records;
    const securityModule = records.find(
      (record) => record.name === "平安校园" && record.type === "module",
    )!;
    const secondLevel = {
      id: "custom-second-level",
      tenantId: schoolA.id,
      parentId: securityModule.id,
      type: "directory",
      name: "二级业务",
      icon: null,
      pageKey: null,
      externalUrl: null,
      externalOpenMode: null,
      sort: 999,
      visible: true,
    } as const;
    const thirdLevel = {
      id: "custom-third-level",
      tenantId: schoolA.id,
      parentId: secondLevel.id,
      type: "directory",
      name: "三级目录",
      icon: null,
      pageKey: null,
      externalUrl: null,
      externalOpenMode: null,
      sort: 10,
      visible: true,
    } as const;
    const fourthLevel = {
      id: "custom-fourth-level",
      tenantId: schoolA.id,
      parentId: thirdLevel.id,
      type: "page",
      name: "四级页面",
      icon: null,
      pageKey: DEVELOPING_PAGE_KEY,
      externalUrl: null,
      externalOpenMode: null,
      sort: 10,
      visible: true,
    } as const;
    tenantMenuRepository.replace(schoolA, [
      ...records,
      secondLevel,
      thirdLevel,
      fourthLevel,
    ]);

    const store = useNavigationStore();
    store.loadTenant(schoolA);
    store.syncByRoute({
      path: "/developing/custom-fourth-level",
      fullPath: "/developing/custom-fourth-level",
      params: { menuId: fourthLevel.id },
      meta: { pageKey: DEVELOPING_PAGE_KEY },
    } as never);

    expect(store.activeModuleNode?.name).toBe("平安校园");
    expect(store.activeSecondLevelNode?.name).toBe("二级业务");
    expect(store.activeMenuTrail.map((node) => node.name)).toEqual([
      "二级业务",
      "三级目录",
      "四级页面",
    ]);
    expect(store.deepMenus.map((node) => node.name)).toEqual(["三级目录"]);
    expect(store.secondLevelTabs.map((node) => node.name)).toContain("二级业务");

    const push = vi.fn().mockResolvedValue(undefined);
    await store.navigateToMenu(fourthLevel.id, { push } as never);
    expect(push).toHaveBeenCalledWith("/developing/custom-fourth-level");
  });

  it("filters modules, second-level tabs and deep menus by the current role grants", () => {
    const records = tenantMenuRepository.list(schoolA).records;
    const page = records.find((record) => record.name === "班牌列表")!;
    const leafIds = records
      .filter((record) => record.type === "page" || record.type === "external")
      .map((record) => record.id);
    tenantRoleRepository.replace(schoolA, [
      {
        id: ADMIN_ROLE_ID,
        tenantId: schoolA.id,
        name: "管理员",
        description: "",
        builtIn: true,
        enabled: true,
        sort: 10,
        menuIds: leafIds,
      },
      {
        id: STAFF_ROLE_ID,
        tenantId: schoolA.id,
        name: "老师",
        description: "",
        builtIn: true,
        enabled: true,
        sort: 20,
        menuIds: [page.id],
      },
    ]);

    const userStore = useUserStore();
    userStore.applyAuthenticatedSession({
      ...userStore.userInfo,
      platformAdmin: false,
      tenantRoleIds: { [schoolA.id]: STAFF_ROLE_ID },
    });
    const store = useNavigationStore();
    store.loadTenant(schoolA);
    store.syncByRoute({
      path: `/developing/${page.id}`,
      fullPath: `/developing/${page.id}`,
      params: { menuId: page.id },
      meta: { pageKey: DEVELOPING_PAGE_KEY },
    } as never);

    expect(store.moduleNodes.map((node) => node.name)).toEqual(["平安校园"]);
    expect(store.secondLevelTabs.map((node) => node.name)).toEqual(["班牌管理"]);
    expect(store.deepMenus.map((node) => node.name)).toEqual(["班牌列表"]);
  });
});
