import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { ADMIN_ROLE_ID, STAFF_ROLE_ID } from "@/features/access-control/types";
import { workbenchLayoutStorageKey } from "@/features/workbench/local-storage-workbench-layout-repository";
import type { MenuTreeNode } from "@/features/menu-config/types";
import { workbenchDataSource } from "@/features/workbench/runtime-workbench-data-source";
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
    vi.restoreAllMocks();
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

  it("cancels a draft without persistence and saves one override atomically", async () => {
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
    await store.saveEditing();
    expect(store.isEditing).toBe(false);
    expect(store.hasOverride).toBe(true);
    expect(localStorage.getItem(workbenchLayoutStorageKey(store.context!))).not.toBeNull();

    store.load(school, "user-a", ADMIN_ROLE_ID, emptyTree);
    expect(store.items.find((item) => item.widgetKey === widgetKey)!.visible).toBe(false);
  });

  it("restores the current template and removes the personal override after saving", async () => {
    const store = useWorkbenchStore();
    store.load(school, "user-a", ADMIN_ROLE_ID, emptyTree);
    const widgetKey = store.items[0]!.widgetKey;
    store.beginEditing();
    store.setVisible(widgetKey, false);
    await store.saveEditing();

    store.beginEditing();
    store.restoreDefaultDraft();
    expect(store.visibleCount).toBe(store.totalCount);
    await store.saveEditing();

    expect(store.hasOverride).toBe(false);
    expect(localStorage.getItem(workbenchLayoutStorageKey(store.context!))).toBeNull();
  });

  it("keeps personal layouts isolated when the signed-in user changes", async () => {
    const store = useWorkbenchStore();
    store.load(school, "user-a", ADMIN_ROLE_ID, emptyTree);
    const widgetKey = store.items[0]!.widgetKey;
    store.beginEditing();
    store.setVisible(widgetKey, false);
    await store.saveEditing();

    store.load(school, "user-b", ADMIN_ROLE_ID, emptyTree);
    expect(store.items.find((item) => item.widgetKey === widgetKey)!.visible).toBe(true);
    expect(store.hasOverride).toBe(false);

    store.load(school, "user-a", ADMIN_ROLE_ID, emptyTree);
    expect(store.items.find((item) => item.widgetKey === widgetKey)!.visible).toBe(false);
    expect(store.hasOverride).toBe(true);
  });

  it("keeps classic coordinates and simple order/width independent across version switches", async () => {
    const store = useWorkbenchStore();
    store.load(school, "user-a", ADMIN_ROLE_ID, emptyTree);
    const classicFirst = store.savedLayout!.items[0]!;
    const classicPosition = { x: classicFirst.x, y: classicFirst.y, w: classicFirst.w, h: classicFirst.h };
    const firstKey = classicFirst.widgetKey;
    const secondKey = store.savedLayout!.items[1]!.widgetKey;

    await store.switchLayoutMode("simple");
    expect(store.layoutMode).toBe("simple");
    store.beginEditing();
    expect(store.resizeSimpleWidget(firstKey, 6)).toBe(true);
    expect(store.reorderSimpleWidget(firstKey, secondKey)).toBe(true);
    store.setSimpleLayoutType("columns");
    store.setSimpleColumnRatio("6:2");
    expect(store.moveSimpleWidgetToColumn(firstKey, "secondary")).toBe(true);
    await store.saveEditing();

    await store.switchLayoutMode("classic");
    expect(store.layoutMode).toBe("classic");
    expect(store.savedLayout!.items.find((item) => item.widgetKey === firstKey)).toMatchObject(
      classicPosition,
    );

    await store.switchLayoutMode("simple");
    const simpleFirst = store.savedLayout!.simpleItems.find((item) => item.widgetKey === firstKey)!;
    expect(store.savedLayout!.simpleLayoutType).toBe("columns");
    expect(store.savedLayout!.simpleColumnRatio).toBe("6:2");
    expect(simpleFirst.column).toBe("secondary");
    expect(simpleFirst.span).toBe(6);
    expect(simpleFirst.order).toBeGreaterThan(
      store.savedLayout!.simpleItems.find((item) => item.widgetKey === secondKey)!.order,
    );
  });

  it("adapts flow width to the drop target and appends directly to a column tail", async () => {
    const store = useWorkbenchStore();
    store.load(school, "user-a", ADMIN_ROLE_ID, emptyTree);
    await store.switchLayoutMode("simple");
    store.beginEditing();

    const half = store.draftLayout!.simpleItems.find((item) => item.span === 3)!;
    const full = store.draftLayout!.simpleItems.find((item) => item.span === 6)!;
    expect(store.reorderSimpleWidget(
      full.widgetKey,
      half.widgetKey,
      half.column,
      "after",
      true,
    )).toBe(true);
    expect(store.draftLayout!.simpleItems.find((item) => item.widgetKey === full.widgetKey)!.span)
      .toBe(3);

    store.setSimpleLayoutType("columns");
    const primary = store.draftLayout!.simpleItems.find((item) => item.column === "primary")!;
    expect(store.reorderSimpleWidget(
      primary.widgetKey,
      "",
      "secondary",
      "end",
    )).toBe(true);
    const secondary = store.draftLayout!.simpleItems
      .filter((item) => item.column === "secondary")
      .sort((first, second) => first.columnOrder - second.columnOrder);
    expect(secondary[secondary.length - 1]?.widgetKey).toBe(primary.widgetKey);
  });

  it("keeps flow and column ordering independent", async () => {
    const store = useWorkbenchStore();
    store.load(school, "user-a", ADMIN_ROLE_ID, emptyTree);
    await store.switchLayoutMode("simple");
    store.beginEditing();

    const flowItems = [...store.draftLayout!.simpleItems].sort((a, b) => a.order - b.order);
    const movedInFlow = flowItems[0]!;
    const flowTarget = flowItems[2]!;
    expect(store.reorderSimpleWidget(
      movedInFlow.widgetKey,
      flowTarget.widgetKey,
      flowTarget.column,
      "after",
      true,
    )).toBe(true);
    const expectedFlowOrder = [...store.draftLayout!.simpleItems]
      .sort((a, b) => a.order - b.order)
      .map((item) => item.widgetKey);

    store.setSimpleLayoutType("columns");
    const primary = [...store.draftLayout!.simpleItems]
      .filter((item) => item.column === "primary")
      .sort((a, b) => a.columnOrder - b.columnOrder);
    expect(primary.length).toBeGreaterThan(1);
    expect(store.reorderSimpleWidget(
      primary[0]!.widgetKey,
      primary[primary.length - 1]!.widgetKey,
      "primary",
      "after",
    )).toBe(true);

    expect([...store.draftLayout!.simpleItems]
      .sort((a, b) => a.order - b.order)
      .map((item) => item.widgetKey)).toEqual(expectedFlowOrder);
  });

  it("does not mutate the draft when a simple reorder target is invalid", async () => {
    const store = useWorkbenchStore();
    store.load(school, "user-a", ADMIN_ROLE_ID, emptyTree);
    await store.switchLayoutMode("simple");
    store.beginEditing();
    store.setSimpleLayoutType("columns");
    const source = store.draftLayout!.simpleItems[0]!;
    const before = JSON.stringify(store.draftLayout);

    expect(store.reorderSimpleWidget(
      source.widgetKey,
      "missing-widget",
      source.column === "primary" ? "secondary" : "primary",
      "after",
    )).toBe(false);
    expect(JSON.stringify(store.draftLayout)).toBe(before);
  });

  it("deduplicates widget data requests within one workbench context", async () => {
    const loadSpy = vi.spyOn(workbenchDataSource, "load");
    const store = useWorkbenchStore();
    store.load(school, "user-a", ADMIN_ROLE_ID, emptyTree);
    const item = store.items[0]!;

    await Promise.all([
      store.loadWidgetData(item),
      store.loadWidgetData(item),
    ]);
    expect(loadSpy).toHaveBeenCalledTimes(1);

    await store.loadWidgetData(item, { force: true });
    expect(loadSpy).toHaveBeenCalledTimes(2);
  });
});
