import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { ADMIN_ROLE_ID, STAFF_ROLE_ID } from "@/features/access-control/types";
import { workbenchLayoutStorageKey } from "@/features/workbench/local-storage-workbench-layout-repository";
import type { MenuTreeNode } from "@/features/menu-config/types";
import { useWorkbenchStore } from "@/stores/workbench";
import type { TenantInfo } from "@/types/user";

const school: TenantInfo = {
  id: "school-store",
  name: "Store 测试学校",
  shortName: "测试学校",
  type: "school",
  enabled: true,
};
const emptyTree: MenuTreeNode[] = [];

describe("workbench store", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("loads the admin catalog for administrators and the business catalog for other roles", () => {
    const store = useWorkbenchStore();

    store.load(school, "user-a", ADMIN_ROLE_ID, emptyTree);
    expect(store.profile).toBe("admin");
    expect(store.totalCount).toBe(9);

    store.load(school, "user-a", STAFF_ROLE_ID, emptyTree);
    expect(store.profile).toBe("business");
    expect(store.totalCount).toBe(7);
  });

  it("hides without deleting and restores a colliding widget at the nearest free position", () => {
    const store = useWorkbenchStore();
    store.load(school, "user-a", ADMIN_ROLE_ID, emptyTree);
    store.beginEditing();
    const first = store.items[0]!;
    const second = store.items[1]!;
    const original = { x: first.x, y: first.y };

    store.setVisible(first.widgetKey, false);
    expect(store.totalCount).toBe(9);
    expect(store.visibleCount).toBe(8);
    expect(store.items.find((item) => item.widgetKey === first.widgetKey)).toMatchObject({
      visible: false,
      ...original,
    });

    store.updatePositions([
      { widgetKey: second.widgetKey, x: original.x, y: original.y, w: second.w, h: second.h },
    ]);
    store.setVisible(first.widgetKey, true);
    const restored = store.items.find((item) => item.widgetKey === first.widgetKey)!;

    expect(restored.visible).toBe(true);
    expect({ x: restored.x, y: restored.y }).not.toEqual(original);
    expect(store.totalCount).toBe(9);
  });

  it("cancels a draft without persistence and saves one override atomically", () => {
    const store = useWorkbenchStore();
    store.load(school, "user-a", ADMIN_ROLE_ID, emptyTree);
    const widgetKey = store.items[0]!.widgetKey;

    store.beginEditing();
    store.setVisible(widgetKey, false);
    expect(store.hasUnsavedChanges).toBe(true);
    store.cancelEditing();
    expect(store.items.find((item) => item.widgetKey === widgetKey)!.visible).toBe(true);
    expect(localStorage.length).toBe(0);

    store.beginEditing();
    store.setVisible(widgetKey, false);
    store.saveEditing();
    expect(store.isEditing).toBe(false);
    expect(store.hasOverride).toBe(true);
    expect(localStorage.getItem(workbenchLayoutStorageKey(store.context!))).not.toBeNull();

    store.load(school, "user-a", ADMIN_ROLE_ID, emptyTree);
    expect(store.items.find((item) => item.widgetKey === widgetKey)!.visible).toBe(false);
  });

  it("restores the current template and removes the personal override after saving", () => {
    const store = useWorkbenchStore();
    store.load(school, "user-a", ADMIN_ROLE_ID, emptyTree);
    const widgetKey = store.items[0]!.widgetKey;
    store.beginEditing();
    store.setVisible(widgetKey, false);
    store.saveEditing();

    store.beginEditing();
    store.restoreDefaultDraft();
    expect(store.visibleCount).toBe(store.totalCount);
    store.saveEditing();

    expect(store.hasOverride).toBe(false);
    expect(localStorage.getItem(workbenchLayoutStorageKey(store.context!))).toBeNull();
  });
});
