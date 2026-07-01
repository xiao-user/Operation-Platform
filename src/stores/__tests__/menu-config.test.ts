import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { defaultTenantShellConfig } from "@/features/shell-config/local-storage-shell-config-repository";
import { MenuValidationError } from "@/features/menu-config/menu-validation";
import { useMenuConfigStore } from "@/stores/menu-config";
import { useNavigationStore } from "@/stores/navigation";
import { useUserStore } from "@/stores/user";
import type { MenuRecordInput } from "@/features/menu-config/types";
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

function moduleInput(name: string): MenuRecordInput {
  return {
    parentId: null,
    type: "module",
    name,
    icon: null,
    pageKey: null,
    externalUrl: null,
    externalOpenMode: null,
    sort: 999,
    visible: true,
  };
}

describe("menu configuration store", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("loads an arbitrary tenant without switching the signed-in tenant", () => {
    const userStore = useUserStore();
    const store = useMenuConfigStore();

    store.load(schoolB);

    expect(store.selectedTenant?.id).toBe(schoolB.id);
    expect(userStore.currentTenant.id).not.toBe(schoolB.id);
  });

  it("creates and persists a top-level module", () => {
    const store = useMenuConfigStore();
    store.load(schoolA);

    const created = store.create(moduleInput("自定义模块"));

    expect(created.tenantId).toBe(schoolA.id);
    expect(store.records.some((record) => record.id === created.id)).toBe(true);
    store.load(schoolA);
    expect(store.records.some((record) => record.name === "自定义模块")).toBe(true);
  });

  it("updates records after validation", () => {
    const store = useMenuConfigStore();
    store.load(schoolA);
    const moduleRecord = store.records.find((record) => record.type === "module")!;

    store.update(moduleRecord.id, { ...moduleInput("重命名模块"), sort: moduleRecord.sort });

    expect(store.records.find((record) => record.id === moduleRecord.id)?.name).toBe("重命名模块");
  });

  it("removes a menu and every descendant", () => {
    const store = useMenuConfigStore();
    store.load(schoolA);
    const moduleRecord = store.records.find((record) => record.type === "module")!;
    const descendantIds = store.records
      .filter((record) => record.parentId === moduleRecord.id)
      .map((record) => record.id);

    const removedCount = store.removeCascade(moduleRecord.id);

    expect(removedCount).toBeGreaterThan(1);
    expect(store.records.some((record) => record.id === moduleRecord.id)).toBe(false);
    expect(store.records.some((record) => descendantIds.includes(record.id))).toBe(false);
  });

  it("resets only the selected tenant", () => {
    const store = useMenuConfigStore();
    store.load(schoolA);
    store.create(moduleInput("学校 A 自定义"));
    store.load(schoolB);
    store.create(moduleInput("学校 B 自定义"));

    store.load(schoolA);
    store.reset();

    expect(store.records.some((record) => record.name === "学校 A 自定义")).toBe(false);
    store.load(schoolB);
    expect(store.records.some((record) => record.name === "学校 B 自定义")).toBe(true);
  });

  it("refreshes runtime navigation only when editing the current tenant", () => {
    const userStore = useUserStore();
    const navigationStore = useNavigationStore();
    const store = useMenuConfigStore();
    const currentTenant = { ...userStore.currentTenant };
    navigationStore.loadTenant(currentTenant);
    store.load(currentTenant);
    const moduleRecord = store.records.find((record) => record.type === "module")!;

    store.update(moduleRecord.id, {
      ...moduleInput("运行时已刷新"),
      sort: moduleRecord.sort,
    });

    expect(navigationStore.moduleNodes.map((node) => node.name)).toContain("运行时已刷新");
  });

  it("updates workbench config and refreshes current tenant navigation", () => {
    const userStore = useUserStore();
    const navigationStore = useNavigationStore();
    const store = useMenuConfigStore();
    const currentTenant = { ...userStore.currentTenant };
    navigationStore.loadTenant(currentTenant);
    store.load(currentTenant);

    store.updateWorkbench({ enabled: false, label: "首页", sort: 50 });

    expect(store.shellConfig.workbench).toEqual({ enabled: false, label: "首页", sort: 50 });
    expect(navigationStore.workbenchConfig).toEqual({ enabled: false, label: "首页", sort: 50 });
    expect(navigationStore.topLevelNavItems.some((item) => item.kind === "workbench")).toBe(false);
  });

  it("resets workbench config together with the selected tenant menu", () => {
    const store = useMenuConfigStore();
    store.load(schoolA);
    store.updateWorkbench({ enabled: false, label: "首页", sort: 30 });

    store.reset();

    expect(store.shellConfig).toEqual(defaultTenantShellConfig());
  });

  it("moves a page across levels and normalizes sibling order", () => {
    const store = useMenuConfigStore();
    store.load(schoolA);
    const securityModule = store.records.find((record) => record.name === "校园安全")!;
    const smartSafetyDirectory = store.records.find((record) => record.name === "校园智能安防")!;
    const visitorPage = store.records.find((record) => record.name === "访客管理")!;

    store.move(visitorPage.id, securityModule.id, 0);

    const moved = store.records.find((record) => record.id === visitorPage.id)!;
    const siblings = store.records
      .filter((record) => record.parentId === securityModule.id)
      .sort((a, b) => a.sort - b.sort);
    expect(moved.parentId).toBe(securityModule.id);
    expect(siblings.map((record) => record.id)).toEqual([
      visitorPage.id,
      smartSafetyDirectory.id,
    ]);
    expect(siblings.map((record) => record.sort)).toEqual([10, 20]);
  });

  it("pre-validates allowed and forbidden drag targets", () => {
    const store = useMenuConfigStore();
    store.load(schoolA);
    const familyModule = store.records.find((record) => record.name === "家校互动")!;
    const securityModule = store.records.find((record) => record.name === "校园安全")!;
    const smartSafetyDirectory = store.records.find((record) => record.name === "校园智能安防")!;
    const visitorPage = store.records.find((record) => record.name === "访客管理")!;

    expect(store.canMove(visitorPage.id, securityModule.id)).toBe(true);
    expect(store.canMove(visitorPage.id, smartSafetyDirectory.id)).toBe(true);
    expect(store.canMove(familyModule.id, securityModule.id)).toBe(false);
    expect(store.canMove(smartSafetyDirectory.id, smartSafetyDirectory.id)).toBe(false);
  });

  it("rejects moving a module below another menu", () => {
    const store = useMenuConfigStore();
    store.load(schoolA);
    const familyModule = store.records.find((record) => record.name === "家校互动")!;
    const securityModule = store.records.find((record) => record.name === "校园安全")!;

    expect(() => store.move(familyModule.id, securityModule.id, 0)).toThrow(MenuValidationError);
  });
});
