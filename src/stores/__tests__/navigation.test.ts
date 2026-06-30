import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useNavigationStore } from "@/stores/navigation";
import { tenantMenuRepository } from "@/features/menu-config/local-storage-menu-repository";
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
    expect(store.currentMenus.every((node) => node.parentId === store.activeModuleId)).toBe(true);
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
  });

  it("navigates an internal menu through its registered page", async () => {
    const store = useNavigationStore();
    store.loadTenant(schoolA);
    const deviceMenu = store.records.find((record) => record.pageKey === "device-list")!;
    const push = vi.fn().mockResolvedValue(undefined);

    await store.navigateToMenu(deviceMenu.id, { push } as never);

    expect(push).toHaveBeenCalledWith("/security/new-gate/device-list");
  });
});
