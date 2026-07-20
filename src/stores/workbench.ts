import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { pageRegistryByKey } from "@/config/page-registry";
import { resolveFirstTarget } from "@/features/menu-config/menu-tree";
import type { MenuTreeNode } from "@/features/menu-config/types";
import { workbenchDataSource } from "@/features/workbench/runtime-workbench-data-source";
import { operationPlatformPersistence } from "@/features/persistence/runtime-operation-platform-persistence";
import {
  cloneWorkbenchLayout,
  createDefaultWorkbenchLayout,
  findAvailableWorkbenchPosition,
  resolveWorkbenchProfile,
  workbenchItemsOverlap,
} from "@/features/workbench/workbench-layout";
import type {
  UserWorkbenchLayout,
  FlowWorkbenchSpan,
  SimpleWorkbenchLayoutItem,
  SimpleWorkbenchColumn,
  SimpleWorkbenchColumnRatio,
  SimpleWorkbenchDropPlacement,
  SimpleWorkbenchLayoutType,
  WorkbenchDataContext,
  WorkbenchLayoutMode,
  WorkbenchLayoutContext,
  WorkbenchLayoutItem,
  WorkbenchQuickLinkData,
  WorkbenchTemplate,
  WorkbenchWidgetData,
  WorkbenchWidgetDefinition,
  WorkbenchWidgetSettings,
  WorkbenchWidgetSizePreset,
  WorkbenchWidgetItem,
} from "@/features/workbench/types";
import {
  CLASSIC_WORKBENCH_MAX_ROW_SPAN,
  WORKBENCH_GRID_COLUMNS,
} from "@/features/workbench/types";
import {
  getWorkbenchTemplate,
  workbenchWidgetRegistry,
} from "@/features/workbench/workbench-templates";
import type { TenantInfo } from "@/types/user";

function layoutsEqual(first: UserWorkbenchLayout | null, second: UserWorkbenchLayout | null) {
  return JSON.stringify(first) === JSON.stringify(second);
}

function resolveSimpleInsertionIndex(
  placement: SimpleWorkbenchDropPlacement | undefined,
  targetIndex: number,
  movedBeforeTarget: boolean,
  destinationLength: number,
) {
  if (placement === "end") return destinationLength;
  if (placement === "before") return targetIndex;
  if (placement === "after") return targetIndex + 1;
  return movedBeforeTarget ? targetIndex + 1 : targetIndex;
}

function collectQuickLinks(
  nodes: readonly MenuTreeNode[],
  tenantId: string,
): WorkbenchQuickLinkData[] {
  const result: WorkbenchQuickLinkData[] = [];
  const visit = (items: readonly MenuTreeNode[], module: MenuTreeNode) => {
    for (const node of items) {
      if (node.type === "page") {
        const target = resolveFirstTarget(node, pageRegistryByKey);
        if (target?.kind === "internal") {
          result.push({
            id: node.id,
            name: node.name,
            kind: "internal",
            target: target.path,
            openMode: target.openMode,
            tenantId,
            icon: node.icon,
            moduleId: module.id,
            moduleName: module.name,
            moduleIcon: module.icon,
          });
        }
      }
      visit(node.children, module);
    }
  };
  for (const module of nodes) {
    if (module.type === "module") visit(module.children, module);
  }
  return result;
}

function pushClassicCollisions(items: WorkbenchLayoutItem[], lockedWidgetKey: string) {
  const queue = [lockedWidgetKey];
  let attempts = 0;
  while (queue.length && attempts < items.length * items.length) {
    attempts += 1;
    const activeKey = queue.shift()!;
    const active = items.find((item) => item.widgetKey === activeKey);
    if (!active?.visible) continue;
    const collisions = items
      .filter((item) =>
        item.visible &&
        item.widgetKey !== active.widgetKey &&
        workbenchItemsOverlap(active, item)
      )
      .sort((first, second) => first.y - second.y || first.x - second.x);
    for (const collision of collisions) {
      collision.y = active.y + active.h;
      queue.push(collision.widgetKey);
    }
  }
}

function compactClassicItems(items: WorkbenchLayoutItem[], lockedWidgetKey: string) {
  const visible = items
    .filter((item) => item.visible && item.widgetKey !== lockedWidgetKey)
    .sort((first, second) => first.y - second.y || first.x - second.x);
  for (const item of visible) {
    while (item.y > 0) {
      const candidate = { ...item, y: item.y - 1 };
      const collision = items.some((other) =>
        other.visible &&
        other.widgetKey !== item.widgetKey &&
        workbenchItemsOverlap(candidate, other)
      );
      if (collision) break;
      item.y -= 1;
    }
  }
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
  const dataIdentity = ref({
    name: "",
    initials: "",
    account: "",
    roleName: "",
  });
  const widgetDataCache = new Map<string, Promise<WorkbenchWidgetData>>();

  const activeLayout = computed(() =>
    isEditing.value ? draftLayout.value : savedLayout.value,
  );
  const layoutMode = computed(() => activeLayout.value?.mode ?? "classic");
  const items = computed(() => activeLayout.value?.items ?? []);
  const simpleItems = computed(() => activeLayout.value?.simpleItems ?? []);
  const currentItems = computed<(WorkbenchLayoutItem | SimpleWorkbenchLayoutItem)[]>(() => {
    const layout = activeLayout.value;
    if (!layout) return [];
    return layout.mode === "simple"
      ? [...layout.simpleItems].sort((first, second) =>
        layout.simpleLayoutType === "columns"
          ? first.columnOrder - second.columnOrder
          : first.order - second.order
      )
      : layout.items;
  });
  const visibleItems = computed(() => currentItems.value.filter((item) => item.visible));
  const hiddenItems = computed(() => currentItems.value.filter((item) => !item.visible));
  const totalCount = computed(() => currentItems.value.length);
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
    identity?: { name: string; initials: string; account: string; roleName: string },
  ) {
    const previousContextKey = context.value
      ? `${context.value.tenant.id}:${context.value.userId}:${context.value.profile}`
      : "";
    const nextProfile = resolveWorkbenchProfile(roleIds);
    const nextContext: WorkbenchLayoutContext = { tenant, userId, profile: nextProfile };
    const nextContextKey = `${tenant.id}:${userId}:${nextProfile}`;
    if (previousContextKey !== nextContextKey) widgetDataCache.clear();
    const nextTemplate = getWorkbenchTemplate(tenant.type, nextProfile);
    const result = operationPlatformPersistence.loadWorkbenchLayout(nextContext, nextTemplate);
    context.value = { ...nextContext, tenant: { ...tenant } };
    template.value = nextTemplate;
    savedLayout.value = result.layout;
    draftLayout.value = null;
    hasOverride.value = result.hasOverride;
    recoveryNotice.value = result.recoveryNotice;
    quickLinks.value = collectQuickLinks(navigationTree, tenant.id);
    dataIdentity.value = identity ?? {
      name: userId,
      initials: userId.slice(0, 1).toUpperCase(),
      account: userId,
      roleName: nextProfile === "admin" ? "管理员" : "业务角色",
    };
    isEditing.value = false;
  }

  function updateQuickLinks(navigationTree: readonly MenuTreeNode[]) {
    const tenantId = context.value?.tenant.id;
    if (!tenantId) return;
    quickLinks.value = collectQuickLinks(navigationTree, tenantId);
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

  async function saveEditing() {
    const loaded = requireLoaded();
    const draft = requireDraft();
    const defaultLayout = createDefaultWorkbenchLayout(loaded.context, loaded.template);
    const isDefault = layoutsEqual(draft, defaultLayout);
    savedLayout.value = isDefault
      ? await operationPlatformPersistence.resetWorkbenchLayout(loaded.context, loaded.template)
      : await operationPlatformPersistence.saveWorkbenchLayout(
        loaded.context,
        loaded.template,
        draft,
      );
    hasOverride.value = !isDefault;
    recoveryNotice.value = null;
    draftLayout.value = null;
    isEditing.value = false;
    return savedLayout.value;
  }

  function restoreDefaultDraft() {
    const loaded = requireLoaded();
    const draft = requireDraft();
    const defaults = createDefaultWorkbenchLayout(loaded.context, loaded.template);
    if (draft.mode === "simple") {
      draft.simpleItems = defaults.simpleItems;
      draft.simpleLayoutType = defaults.simpleLayoutType;
      draft.simpleColumnRatio = defaults.simpleColumnRatio;
    } else {
      draft.items = defaults.items;
    }
  }

  function findDraftItem(widgetKey: string) {
    const layout = requireDraft();
    const items = layout.mode === "simple" ? layout.simpleItems : layout.items;
    return items.find((item) => item.widgetKey === widgetKey) ?? null;
  }

  function setVisible(widgetKey: string, visible: boolean) {
    const layout = requireDraft();
    if (layout.mode === "simple") {
      const item = layout.simpleItems.find((entry) => entry.widgetKey === widgetKey);
      if (item && item.visible !== visible) item.visible = visible;
      return;
    }
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

  function placeClassicWidget(widgetKey: string, x: number, y: number) {
    const layout = requireDraft();
    if (layout.mode !== "classic") return false;
    const item = layout.items.find((entry) => entry.widgetKey === widgetKey);
    if (!item?.visible) return false;
    const nextX = Math.max(0, Math.min(WORKBENCH_GRID_COLUMNS - item.w, Math.round(x)));
    const nextY = Math.max(0, Math.round(y));
    if (nextX === item.x && nextY === item.y) return false;
    item.x = nextX;
    item.y = nextY;
    pushClassicCollisions(layout.items, widgetKey);
    compactClassicItems(layout.items, widgetKey);
    return true;
  }

  function resizeClassicWidgetWidth(widgetKey: string, width: number) {
    const layout = requireDraft();
    if (layout.mode !== "classic") return false;
    const item = layout.items.find((entry) => entry.widgetKey === widgetKey);
    const definition = workbenchWidgetRegistry.get(widgetKey);
    if (!item?.visible || !definition) return false;
    const nextWidth = Math.max(
      definition.minSize.w,
      Math.min(definition.maxSize.w, Math.round(width)),
    );
    if (nextWidth === item.w) return false;
    item.w = nextWidth;
    item.x = Math.min(item.x, WORKBENCH_GRID_COLUMNS - item.w);
    pushClassicCollisions(layout.items, widgetKey);
    compactClassicItems(layout.items, widgetKey);
    return true;
  }

  function setClassicRowSpan(widgetKey: string, rowSpan: number) {
    const layout = requireDraft();
    if (layout.mode !== "classic") return false;
    const item = layout.items.find((entry) => entry.widgetKey === widgetKey);
    if (!item?.visible) return false;
    const nextSpan = Math.max(
      1,
      Math.min(CLASSIC_WORKBENCH_MAX_ROW_SPAN, Math.round(rowSpan)),
    );
    if (nextSpan === item.h) return false;
    item.h = nextSpan;
    pushClassicCollisions(layout.items, widgetKey);
    compactClassicItems(layout.items, widgetKey);
    return true;
  }

  function updateSettings(widgetKey: string, settings: WorkbenchWidgetSettings) {
    const item = findDraftItem(widgetKey);
    if (item) item.settings = settings.kind === "quick-links"
      ? { kind: "quick-links", menuIds: settings.menuIds ? [...settings.menuIds] : null }
      : { ...settings };
  }

  function moveWidget(widgetKey: string, deltaX: number, deltaY: number) {
    const layout = requireDraft();
    if (layout.mode !== "classic") return false;
    const item = layout.items.find((entry) => entry.widgetKey === widgetKey);
    if (!item?.visible) return false;
    return placeClassicWidget(widgetKey, item.x + deltaX, item.y + deltaY);
  }

  function resizeWidget(widgetKey: string, preset: WorkbenchWidgetSizePreset) {
    const layout = requireDraft();
    if (layout.mode !== "classic") return false;
    const item = layout.items.find((entry) => entry.widgetKey === widgetKey);
    const definition = workbenchWidgetRegistry.get(widgetKey);
    if (!item?.visible || !definition) return false;
    return resizeClassicWidgetWidth(widgetKey, definition.sizePresets[preset].w);
  }

  function reorderSimpleWidget(
    widgetKey: string,
    targetWidgetKey: string,
    targetColumn?: SimpleWorkbenchColumn,
    placement?: SimpleWorkbenchDropPlacement,
    adaptSpanToTarget = false,
  ) {
    const layout = requireDraft();
    if (layout.mode !== "simple" || widgetKey === targetWidgetKey) return false;
    const ordered = layout.simpleItems
      .map((item) => ({ ...item }))
      .sort((first, second) => first.order - second.order);
    const fromIndex = ordered.findIndex((item) => item.widgetKey === widgetKey);
    const targetOriginal = targetWidgetKey
      ? ordered.find((item) => item.widgetKey === targetWidgetKey)
      : null;
    if (fromIndex < 0) return false;
    const [moved] = ordered.splice(fromIndex, 1);
    if (!moved) return false;
    if (layout.simpleLayoutType === "columns") {
      const destinationColumn = targetColumn ?? moved.column;
      const primary = ordered
        .filter((item) => item.column === "primary")
        .sort((first, second) => first.columnOrder - second.columnOrder);
      const secondary = ordered
        .filter((item) => item.column === "secondary")
        .sort((first, second) => first.columnOrder - second.columnOrder);
      const destination = destinationColumn === "primary" ? primary : secondary;
      const targetIndex = targetWidgetKey
        ? destination.findIndex((item) => item.widgetKey === targetWidgetKey)
        : destination.length;
      if (targetWidgetKey && targetIndex < 0) return false;
      moved.column = destinationColumn;
      const insertionIndex = resolveSimpleInsertionIndex(
        placement,
        targetIndex,
        Boolean(targetOriginal && moved.column === targetOriginal.column &&
          moved.columnOrder < targetOriginal.columnOrder),
        destination.length,
      );
      destination.splice(insertionIndex, 0, moved);
      primary.forEach((item, columnOrder) => { item.columnOrder = columnOrder; });
      secondary.forEach((item, columnOrder) => { item.columnOrder = columnOrder; });
      layout.simpleItems = [...primary, ...secondary];
    } else {
      const targetIndex = ordered.findIndex((item) => item.widgetKey === targetWidgetKey);
      if (targetIndex < 0) return false;
      if (adaptSpanToTarget && targetOriginal) moved.span = targetOriginal.span === 6 ? 6 : 3;
      const insertionIndex = resolveSimpleInsertionIndex(
        placement,
        targetIndex,
        Boolean(targetOriginal && moved.order < targetOriginal.order),
        ordered.length,
      );
      ordered.splice(insertionIndex, 0, moved);
      layout.simpleItems = ordered;
      layout.simpleItems.forEach((item, order) => { item.order = order; });
    }
    return true;
  }

  function moveSimpleWidget(widgetKey: string, offset: -1 | 1) {
    const layout = requireDraft();
    if (layout.mode !== "simple") return false;
    const active = layout.simpleItems.find((item) => item.widgetKey === widgetKey);
    if (!active) return false;
    const ordered = [...layout.simpleItems]
      .filter((item) => layout.simpleLayoutType !== "columns" || item.column === active.column)
      .sort((first, second) => layout.simpleLayoutType === "columns"
        ? first.columnOrder - second.columnOrder
        : first.order - second.order
      );
    const index = ordered.findIndex((item) => item.widgetKey === widgetKey);
    const target = ordered[index + offset];
    if (index < 0 || !target) return false;
    return reorderSimpleWidget(
      widgetKey,
      target.widgetKey,
      active.column,
      offset === 1 ? "after" : "before",
    );
  }

  function resizeSimpleWidget(widgetKey: string, span: FlowWorkbenchSpan) {
    const layout = requireDraft();
    if (layout.mode !== "simple") return false;
    const item = layout.simpleItems.find((entry) => entry.widgetKey === widgetKey);
    if (!item || item.span === span) return false;
    item.span = span;
    return true;
  }

  function moveSimpleWidgetToColumn(widgetKey: string, column: SimpleWorkbenchColumn) {
    const layout = requireDraft();
    if (layout.mode !== "simple" || layout.simpleLayoutType !== "columns") return false;
    const item = layout.simpleItems.find((entry) => entry.widgetKey === widgetKey);
    if (!item || item.column === column) return false;
    return reorderSimpleWidget(widgetKey, "", column, "end");
  }

  function setSimpleLayoutType(layoutType: SimpleWorkbenchLayoutType) {
    const layout = requireDraft();
    if (layout.mode !== "simple" || layout.simpleLayoutType === layoutType) return;
    layout.simpleLayoutType = layoutType;
  }

  function setSimpleColumnRatio(ratio: SimpleWorkbenchColumnRatio) {
    const layout = requireDraft();
    if (layout.mode !== "simple" || layout.simpleColumnRatio === ratio) return;
    layout.simpleColumnRatio = ratio;
  }

  async function switchLayoutMode(mode: WorkbenchLayoutMode) {
    const loaded = requireLoaded();
    if (isEditing.value) throw new Error("请先保存或取消当前调整");
    if (savedLayout.value?.mode === mode) return savedLayout.value;
    const next = cloneWorkbenchLayout(savedLayout.value!);
    next.mode = mode;
    const defaults = createDefaultWorkbenchLayout(loaded.context, loaded.template);
    savedLayout.value = layoutsEqual(next, defaults)
      ? await operationPlatformPersistence.resetWorkbenchLayout(loaded.context, loaded.template)
      : await operationPlatformPersistence.saveWorkbenchLayout(loaded.context, loaded.template, next);
    hasOverride.value = !layoutsEqual(savedLayout.value, defaults);
    recoveryNotice.value = null;
    return savedLayout.value;
  }

  function definitionFor(widgetKey: string): WorkbenchWidgetDefinition | null {
    return workbenchWidgetRegistry.get(widgetKey) ?? null;
  }

  async function loadWidgetData(
    item: WorkbenchWidgetItem,
    options: { force?: boolean } = {},
  ): Promise<WorkbenchWidgetData> {
    const loaded = requireLoaded();
    const definition = definitionFor(item.widgetKey);
    if (!definition) throw new Error("工作台组件不存在");
    const dataContext: WorkbenchDataContext = {
      tenant: loaded.context.tenant,
      userId: loaded.context.userId,
      profile: loaded.context.profile,
      userName: dataIdentity.value.name,
      userInitials: dataIdentity.value.initials,
      userAccount: dataIdentity.value.account,
      roleName: dataIdentity.value.roleName,
    };
    const cacheKey = JSON.stringify([
      dataContext.tenant.id,
      dataContext.userId,
      dataContext.profile,
      item.widgetKey,
      item.settings,
      quickLinks.value,
    ]);
    if (options.force) widgetDataCache.delete(cacheKey);
    const cached = widgetDataCache.get(cacheKey);
    if (cached) return cached;
    const request = workbenchDataSource
      .load(definition, item.settings, dataContext, quickLinks.value)
      .catch((error) => {
        widgetDataCache.delete(cacheKey);
        throw error;
      });
    widgetDataCache.set(cacheKey, request);
    return request;
  }

  return {
    context,
    dataIdentity,
    template,
    savedLayout,
    draftLayout,
    activeLayout,
    layoutMode,
    items,
    simpleItems,
    currentItems,
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
    placeClassicWidget,
    resizeClassicWidgetWidth,
    setClassicRowSpan,
    updateSettings,
    moveWidget,
    resizeWidget,
    reorderSimpleWidget,
    moveSimpleWidget,
    resizeSimpleWidget,
    moveSimpleWidgetToColumn,
    setSimpleLayoutType,
    setSimpleColumnRatio,
    switchLayoutMode,
    definitionFor,
    loadWidgetData,
  };
});
