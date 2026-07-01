import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { DEVELOPING_PAGE_KEY } from "@/config/page-registry";
import { useNavigationStore } from "@/stores/navigation";
import { tenantMenuRepository } from "@/features/menu-config/local-storage-menu-repository";
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

    expect(store.moduleNodes).toHaveLength(9);
    expect(store.moduleNodes.map((node) => node.name)).toContain("校园安全");
    expect(store.topLevelNavItems[0]).toMatchObject({ kind: "workbench", name: "工作台" });
    expect(store.currentMenus.every((node) => node.parentId === store.activeModuleId)).toBe(true);
  });

  it("loads hidden workbench config independently from business menus", () => {
    const shellConfig = defaultTenantShellConfig();
    shellConfig.workbench.enabled = false;
    shellConfig.workbench.label = "首页";
    tenantShellConfigRepository.replace(schoolA, shellConfig);

    const store = useNavigationStore();
    store.loadTenant(schoolA);

    expect(store.workbenchConfig).toEqual({ enabled: false, label: "首页", sort: 0 });
    expect(store.topLevelNavItems.some((item) => item.kind === "workbench")).toBe(false);
    expect(store.moduleNodes.map((node) => node.name)).toContain("校园安全");
  });

  it("keeps two schools on independent menu configurations", () => {
    const firstRecords = tenantMenuRepository.list(schoolA).records;
    const security = firstRecords.find((record) => record.name === "校园安全" && record.type === "module")!;
    security.name = "学校 A 安防";
    tenantMenuRepository.replace(schoolA, firstRecords);

    const store = useNavigationStore();
    store.loadTenant(schoolA);
    expect(store.moduleNodes.map((node) => node.name)).toContain("学校 A 安防");

    store.loadTenant(schoolB);
    expect(store.moduleNodes.map((node) => node.name)).toContain("校园安全");
    expect(store.moduleNodes.map((node) => node.name)).not.toContain("学校 A 安防");
  });

  it("does not show modules without a visible navigable target", () => {
    const records = tenantMenuRepository.list(schoolA).records;
    const familyModule = records.find((record) => record.name === "家校互动" && record.type === "module")!;
    for (const record of records) {
      if (record.parentId === familyModule.id) record.visible = false;
    }
    tenantMenuRepository.replace(schoolA, records);

    const store = useNavigationStore();
    store.loadTenant(schoolA);

    expect(store.moduleNodes.map((node) => node.name)).not.toContain("家校互动");
  });

  it("syncs the active module and menu from route ownership metadata", () => {
    const store = useNavigationStore();
    store.loadTenant(schoolA);

    store.syncByRoute({
      path: "/security/new-gate/person-group",
      fullPath: "/security/new-gate/person-group",
      meta: { pageKey: "person-group", menuOwnerKey: "device-list" },
    } as never);

    expect(store.activeMenuNode?.pageKey).toBe("device-list");
    expect(store.activeModuleNode?.name).toBe("校园安全");
    expect(store.activeSecondLevelNode?.name).toBe("校园智能安防");
    expect(store.deepMenus.map((node) => node.name)).toEqual(["新版门禁设置", "访客管理"]);
    expect(store.secondLevelTabs.map((node) => node.name)).toEqual(["校园智能安防"]);
  });

  it("navigates an internal menu through its registered page", async () => {
    const store = useNavigationStore();
    store.loadTenant(schoolA);
    const deviceMenu = store.records.find((record) => record.pageKey === "device-list")!;
    const push = vi.fn().mockResolvedValue(undefined);

    await store.navigateToMenu(deviceMenu.id, { push } as never);

    expect(push).toHaveBeenCalledWith("/security/new-gate/device-list");
  });

  it("supports four-level navigation with second-level tabs and recursive sidebar menus", async () => {
    const records = tenantMenuRepository.list(schoolA).records;
    const securityModule = records.find(
      (record) => record.name === "校园安全" && record.type === "module",
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

    expect(store.activeModuleNode?.name).toBe("校园安全");
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
});
