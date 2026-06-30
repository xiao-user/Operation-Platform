import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
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
});
