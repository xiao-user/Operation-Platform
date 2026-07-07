import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { pageRegistryByKey } from "@/config/page-registry";
import { resolveFirstTarget } from "@/features/menu-config/menu-tree";
import type { MenuTreeNode } from "@/features/menu-config/types";
import { workbenchDataSource } from "@/features/workbench/mock-workbench-data-source";
import { workbenchLayoutRepository } from "@/features/workbench/local-storage-workbench-layout-repository";
import {
  cloneWorkbenchLayout,
  createDefaultWorkbenchLayout,
  findAvailableWorkbenchPosition,
  resolveWorkbenchProfile,
  workbenchItemsOverlap,
} from "@/features/workbench/workbench-layout";
import type {
  UserWorkbenchLayout,
  WorkbenchDataContext,
  WorkbenchLayoutContext,
  WorkbenchLayoutItem,
  WorkbenchQuickLinkData,
  WorkbenchTemplate,
  WorkbenchWidgetData,
  WorkbenchWidgetDefinition,
  WorkbenchWidgetSettings,
  WorkbenchWidgetSizePreset,
} from "@/features/workbench/types";
import { WORKBENCH_GRID_COLUMNS } from "@/features/workbench/types";
import {
  getWorkbenchTemplate,
  workbenchWidgetRegistry,
} from "@/features/workbench/workbench-templates";
import type { TenantInfo } from "@/types/user";

function layoutsEqual(first: UserWorkbenchLayout | null, second: UserWorkbenchLayout | null) {
  return JSON.stringify(first) === JSON.stringify(second);
}

function collectQuickLinks(nodes: readonly MenuTreeNode[]): WorkbenchQuickLinkData[] {
  const result: WorkbenchQuickLinkData[] = [];
  const visit = (items: readonly MenuTreeNode[]) => {
    for (const node of items) {
      if (node.type === "page" || node.type === "external") {
        const target = resolveFirstTarget(node, pageRegistryByKey);
        if (target?.kind === "internal") {
          result.push({ id: node.id, name: node.name, kind: "internal", target: target.path });
        } else if (target?.kind === "external") {
          result.push({
            id: node.id,
            name: node.name,
            kind: "external",
            target: target.url,
            openMode: target.openMode,
          });
        }
      }
      visit(node.children);
    }
  };
  visit(nodes);
  return result;
}

export const useWorkbenchStore = defineStore("workbench", () => {
  const context = ref<WorkbenchLayoutContext | null>(null);
  const template = ref<WorkbenchTemplate | null>(null);
  const savedLayout = ref<UserWorkbenchLayout | null>(null);
  const draftLayout = ref<UserWorkbenchLayout | null>(null);
  const hasOverride = ref(false);
  const recoveryNotice = ref<string | null>(null);
  const isEditing = ref(false);
  const quickLinks = ref<WorkbenchQuickLinkData[]>([]);

  const activeLayout = computed(() =>
    isEditing.value ? draftLayout.value : savedLayout.value,
  );
  const items = computed(() => activeLayout.value?.items ?? []);
  const visibleItems = computed(() => items.value.filter((item) => item.visible));
  const hiddenItems = computed(() => items.value.filter((item) => !item.visible));
  const totalCount = computed(() => items.value.length);
  const visibleCount = computed(() => visibleItems.value.length);
  const hasUnsavedChanges = computed(
    () => isEditing.value && !layoutsEqual(savedLayout.value, draftLayout.value),
  );
  const profile = computed(() => context.value?.profile ?? "business");

  function requireLoaded() {
    if (!context.value || !template.value || !savedLayout.value) {
      throw new Error("工作台尚未加载");
    }
    return { context: context.value, template: template.value };
  }

  function requireDraft() {
    if (!draftLayout.value) throw new Error("请先进入工作台编辑模式");
    return draftLayout.value;
  }

  function load(
    tenant: TenantInfo,
    userId: string,
    roleIds: string | readonly string[] | null,
    navigationTree: readonly MenuTreeNode[],
  ) {
    const nextProfile = resolveWorkbenchProfile(roleIds);
    const nextContext: WorkbenchLayoutContext = { tenant, userId, profile: nextProfile };
    const nextTemplate = getWorkbenchTemplate(tenant.type, nextProfile);
    const result = workbenchLayoutRepository.list(nextContext, nextTemplate);
    context.value = { ...nextContext, tenant: { ...tenant } };
    template.value = nextTemplate;
    savedLayout.value = result.layout;
    draftLayout.value = null;
    hasOverride.value = result.hasOverride;
    recoveryNotice.value = result.recoveryNotice;
    quickLinks.value = collectQuickLinks(navigationTree);
    isEditing.value = false;
  }

  function updateQuickLinks(navigationTree: readonly MenuTreeNode[]) {
    quickLinks.value = collectQuickLinks(navigationTree);
  }

  function beginEditing() {
    requireLoaded();
    draftLayout.value = cloneWorkbenchLayout(savedLayout.value!);
    isEditing.value = true;
  }

  function cancelEditing() {
    draftLayout.value = null;
    isEditing.value = false;
  }

  function saveEditing() {
    const loaded = requireLoaded();
    const draft = requireDraft();
    const defaultLayout = createDefaultWorkbenchLayout(loaded.context, loaded.template);
    if (layoutsEqual(draft, defaultLayout)) {
      savedLayout.value = workbenchLayoutRepository.reset(loaded.context, loaded.template);
      hasOverride.value = false;
    } else {
      savedLayout.value = workbenchLayoutRepository.replace(
        loaded.context,
        loaded.template,
        draft,
      );
      hasOverride.value = true;
    }
    recoveryNotice.value = null;
    draftLayout.value = null;
    isEditing.value = false;
    return savedLayout.value;
  }

  function restoreDefaultDraft() {
    const loaded = requireLoaded();
    requireDraft();
    draftLayout.value = createDefaultWorkbenchLayout(loaded.context, loaded.template);
  }

  function findDraftItem(widgetKey: string) {
    return requireDraft().items.find((item) => item.widgetKey === widgetKey) ?? null;
  }

  function setVisible(widgetKey: string, visible: boolean) {
    const layout = requireDraft();
    const item = layout.items.find((entry) => entry.widgetKey === widgetKey);
    if (!item || item.visible === visible) return;
    if (visible) {
      const occupied = layout.items.filter((entry) => entry.visible && entry.widgetKey !== widgetKey);
      const preferred = { x: item.x, y: item.y, w: item.w, h: item.h };
      const collision = occupied.some((entry) => workbenchItemsOverlap(preferred, entry));
      if (collision) Object.assign(item, findAvailableWorkbenchPosition(preferred, occupied));
    }
    item.visible = visible;
  }

  function updatePositions(
    changes: Array<Pick<WorkbenchLayoutItem, "widgetKey" | "x" | "y" | "w" | "h">>,
  ) {
    const layout = requireDraft();
    const byKey = new Map(layout.items.map((item) => [item.widgetKey, item]));
    for (const change of changes) {
      const item = byKey.get(change.widgetKey);
      if (!item?.visible) continue;
      item.x = change.x;
      item.y = change.y;
      item.w = change.w;
      item.h = change.h;
    }
  }

  function updateSettings(widgetKey: string, settings: WorkbenchWidgetSettings) {
    const item = findDraftItem(widgetKey);
    if (item) item.settings = settings.kind === "quick-links"
      ? { kind: "quick-links", menuIds: settings.menuIds ? [...settings.menuIds] : null }
      : { ...settings };
  }

  function moveWidget(widgetKey: string, deltaX: number, deltaY: number) {
    const layout = requireDraft();
    const item = layout.items.find((entry) => entry.widgetKey === widgetKey);
    if (!item?.visible) return false;
    const next = {
      x: Math.max(0, Math.min(WORKBENCH_GRID_COLUMNS - item.w, item.x + deltaX)),
      y: Math.max(0, item.y + deltaY),
      w: item.w,
      h: item.h,
    };
    const collision = layout.items.some(
      (other) =>
        other.visible &&
        other.widgetKey !== widgetKey &&
        workbenchItemsOverlap(next, other),
    );
    if (collision || (next.x === item.x && next.y === item.y)) return false;
    Object.assign(item, next);
    return true;
  }

  function resizeWidget(widgetKey: string, preset: WorkbenchWidgetSizePreset) {
    const layout = requireDraft();
    const item = layout.items.find((entry) => entry.widgetKey === widgetKey);
    const definition = workbenchWidgetRegistry.get(widgetKey);
    if (!item?.visible || !definition) return false;
    const size = definition.sizePresets[preset];
    const preferred = {
      x: Math.min(item.x, WORKBENCH_GRID_COLUMNS - size.w),
      y: item.y,
      w: size.w,
      h: size.h,
    };
    const occupied = layout.items.filter(
      (other) => other.visible && other.widgetKey !== widgetKey,
    );
    const collision = occupied.some((other) => workbenchItemsOverlap(preferred, other));
    Object.assign(
      item,
      collision ? findAvailableWorkbenchPosition(preferred, occupied) : preferred,
    );
    return true;
  }

  function definitionFor(widgetKey: string): WorkbenchWidgetDefinition | null {
    return workbenchWidgetRegistry.get(widgetKey) ?? null;
  }

  async function loadWidgetData(item: WorkbenchLayoutItem): Promise<WorkbenchWidgetData> {
    const loaded = requireLoaded();
    const definition = definitionFor(item.widgetKey);
    if (!definition) throw new Error("工作台组件不存在");
    const dataContext: WorkbenchDataContext = {
      tenant: loaded.context.tenant,
      userId: loaded.context.userId,
      profile: loaded.context.profile,
    };
    return workbenchDataSource.load(definition, item.settings, dataContext, quickLinks.value);
  }

  return {
    context,
    template,
    savedLayout,
    draftLayout,
    activeLayout,
    items,
    visibleItems,
    hiddenItems,
    totalCount,
    visibleCount,
    profile,
    hasOverride,
    recoveryNotice,
    isEditing,
    hasUnsavedChanges,
    quickLinks,
    load,
    updateQuickLinks,
    beginEditing,
    cancelEditing,
    saveEditing,
    restoreDefaultDraft,
    setVisible,
    updatePositions,
    updateSettings,
    moveWidget,
    resizeWidget,
    definitionFor,
    loadWidgetData,
  };
});
