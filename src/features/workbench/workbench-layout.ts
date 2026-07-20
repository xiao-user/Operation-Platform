import { ADMIN_ROLE_ID } from "@/features/access-control/types";
import {
  CLASSIC_WORKBENCH_MAX_ROW_SPAN,
  WORKBENCH_GRID_COLUMNS,
  WORKBENCH_LAYOUT_VERSION,
  FLOW_WORKBENCH_SPANS,
  SIMPLE_WORKBENCH_SPANS,
  type FlowWorkbenchSpan,
  type SimpleWorkbenchLayoutItem,
  type SimpleWorkbenchSpan,
  type UserWorkbenchLayout,
  type WorkbenchLayoutContext,
  type WorkbenchLayoutItem,
  type WorkbenchProfile,
  type WorkbenchTemplate,
  type WorkbenchWidgetDefinition,
  type WorkbenchWidgetPosition,
  type WorkbenchWidgetSettings,
} from "@/features/workbench/types";
import { workbenchWidgetRegistry } from "@/features/workbench/workbench-templates";

export function resolveWorkbenchProfile(roleIds: string | readonly string[] | null): WorkbenchProfile {
  const activeRoleIds = Array.isArray(roleIds) ? roleIds : roleIds ? [roleIds] : [];
  return activeRoleIds.includes(ADMIN_ROLE_ID) ? "admin" : "business";
}

export function cloneWorkbenchSettings(
  settings: WorkbenchWidgetSettings,
): WorkbenchWidgetSettings {
  if (settings.kind === "quick-links") {
    return { kind: "quick-links", menuIds: settings.menuIds ? [...settings.menuIds] : null };
  }
  return { ...settings };
}

export function cloneWorkbenchItem(item: WorkbenchLayoutItem): WorkbenchLayoutItem {
  return { ...item, settings: cloneWorkbenchSettings(item.settings) };
}

export function cloneSimpleWorkbenchItem(
  item: SimpleWorkbenchLayoutItem,
): SimpleWorkbenchLayoutItem {
  return { ...item, settings: cloneWorkbenchSettings(item.settings) };
}

export function cloneWorkbenchLayout(layout: UserWorkbenchLayout): UserWorkbenchLayout {
  return {
    ...layout,
    items: layout.items.map(cloneWorkbenchItem),
    simpleItems: Array.isArray(layout.simpleItems)
      ? layout.simpleItems.map(cloneSimpleWorkbenchItem)
      : [],
  };
}

export function simpleSpanFromClassicWidth(width: number): FlowWorkbenchSpan {
  if (width <= 6) return 3;
  return 6;
}

export function createClassicItems(
  items: readonly WorkbenchLayoutItem[],
): WorkbenchLayoutItem[] {
  const logicalRows = [...new Set(items.map((item) => item.y))].sort((a, b) => a - b);
  const rowByLegacyY = new Map(logicalRows.map((legacyY, row) => [legacyY, row]));
  return items.map((item) => ({
    ...cloneWorkbenchItem(item),
    y: rowByLegacyY.get(item.y) ?? 0,
    h: 1,
  }));
}

function simpleColumnFromClassicItem(item: WorkbenchLayoutItem) {
  return item.x >= 8 ? "secondary" as const : "primary" as const;
}

function createSimpleItems(items: readonly WorkbenchLayoutItem[]) {
  return [...items]
    .sort((first, second) => first.y - second.y || first.x - second.x)
    .map((item, order): SimpleWorkbenchLayoutItem => ({
      widgetKey: item.widgetKey,
      visible: item.visible,
      settings: cloneWorkbenchSettings(item.settings),
      order,
      columnOrder: order,
      span: simpleSpanFromClassicWidth(item.w),
      column: simpleColumnFromClassicItem(item),
    }));
}

export function createDefaultWorkbenchLayout(
  context: WorkbenchLayoutContext,
  template: WorkbenchTemplate,
): UserWorkbenchLayout {
  const classicItems = createClassicItems(template.widgets);
  return {
    version: WORKBENCH_LAYOUT_VERSION,
    templateRevision: template.revision,
    tenantId: context.tenant.id,
    userId: context.userId,
    profile: context.profile,
    mode: "classic",
    simpleLayoutType: "flow",
    simpleColumnRatio: "4:2",
    items: classicItems,
    simpleItems: createSimpleItems(classicItems),
  };
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function isValidWorkbenchSettings(
  value: unknown,
  definition: WorkbenchWidgetDefinition,
): value is WorkbenchWidgetSettings {
  if (!value || typeof value !== "object") return false;
  const settings = value as Record<string, unknown>;

  if (definition.kind === "trend") {
    return settings.kind === "trend" && (settings.range === "7d" || settings.range === "30d");
  }
  if (definition.kind === "list" || definition.kind === "schedule") {
    return settings.kind === "list" && (settings.limit === 5 || settings.limit === 10);
  }
  if (definition.kind === "quick-links") {
    return (
      settings.kind === "quick-links" &&
      (settings.menuIds === null ||
        (isStringArray(settings.menuIds) && settings.menuIds.length <= 8))
    );
  }
  return settings.kind === "none";
}

function isPositionInsideGrid(item: WorkbenchWidgetPosition) {
  return (
    isInteger(item.x) &&
    isInteger(item.y) &&
    isInteger(item.w) &&
    isInteger(item.h) &&
    item.x >= 0 &&
    item.y >= 0 &&
    item.w > 0 &&
    item.h > 0 &&
    item.x + item.w <= WORKBENCH_GRID_COLUMNS
  );
}

function isTemplateSizeAllowed(item: WorkbenchLayoutItem, definition: WorkbenchWidgetDefinition) {
  return (
    item.w >= definition.minSize.w &&
    item.h >= definition.minSize.h &&
    item.w <= definition.maxSize.w &&
    item.h <= definition.maxSize.h
  );
}

function isClassicSizeAllowed(item: WorkbenchLayoutItem, definition: WorkbenchWidgetDefinition) {
  return (
    item.w >= definition.minSize.w &&
    item.w <= definition.maxSize.w &&
    item.h >= 1 &&
    item.h <= CLASSIC_WORKBENCH_MAX_ROW_SPAN
  );
}

export function workbenchItemsOverlap(
  first: WorkbenchWidgetPosition,
  second: WorkbenchWidgetPosition,
) {
  return !(
    first.x + first.w <= second.x ||
    second.x + second.w <= first.x ||
    first.y + first.h <= second.y ||
    second.y + second.h <= first.y
  );
}

function hasVisibleOverlap(items: readonly WorkbenchLayoutItem[]) {
  const visible = items.filter((item) => item.visible);
  return visible.some((item, index) =>
    visible.slice(index + 1).some((other) => workbenchItemsOverlap(item, other)),
  );
}

function definitionForTemplateItem(
  item: WorkbenchLayoutItem,
  template: WorkbenchTemplate,
) {
  const definition = workbenchWidgetRegistry.get(item.widgetKey);
  if (!definition) return null;
  if (
    definition.tenantType !== template.tenantType ||
    definition.profile !== template.profile
  ) {
    return null;
  }
  return definition;
}

export function validateWorkbenchTemplate(template: WorkbenchTemplate) {
  const keys = new Set(template.widgets.map((item) => item.widgetKey));
  if (keys.size !== template.widgets.length || hasVisibleOverlap(template.widgets)) return false;
  return template.widgets.every((item) => {
    const definition = definitionForTemplateItem(item, template);
    return Boolean(
      definition &&
      item.visible &&
      isPositionInsideGrid(item) &&
      isTemplateSizeAllowed(item, definition) &&
      isValidWorkbenchSettings(item.settings, definition),
    );
  });
}

export function validateWorkbenchLayout(
  layout: UserWorkbenchLayout,
  context: WorkbenchLayoutContext,
  template: WorkbenchTemplate,
) {
  if (
    layout.version !== WORKBENCH_LAYOUT_VERSION ||
    layout.templateRevision !== template.revision ||
    layout.tenantId !== context.tenant.id ||
    layout.userId !== context.userId ||
    layout.profile !== context.profile ||
    (layout.mode !== "classic" && layout.mode !== "simple") ||
    (layout.simpleLayoutType !== "flow" && layout.simpleLayoutType !== "columns") ||
    (layout.simpleColumnRatio !== "4:2" && layout.simpleColumnRatio !== "6:2")
  ) {
    return false;
  }

  const templateKeys = new Set(template.widgets.map((item) => item.widgetKey));
  const layoutKeys = new Set(layout.items.map((item) => item.widgetKey));
  if (
    layout.items.length !== template.widgets.length ||
    layoutKeys.size !== layout.items.length ||
    layoutKeys.size !== templateKeys.size ||
    [...templateKeys].some((key) => !layoutKeys.has(key)) ||
    hasVisibleOverlap(layout.items) ||
    layout.simpleItems.length !== template.widgets.length
  ) {
    return false;
  }

  const classicValid = layout.items.every((item) => {
    const definition = definitionForTemplateItem(item, template);
    return Boolean(
      definition &&
      typeof item.visible === "boolean" &&
      isPositionInsideGrid(item) &&
      isClassicSizeAllowed(item, definition) &&
      isValidWorkbenchSettings(item.settings, definition),
    );
  });
  if (!classicValid) return false;

  const simpleKeys = new Set(layout.simpleItems.map((item) => item.widgetKey));
  if (
    simpleKeys.size !== layout.simpleItems.length ||
    simpleKeys.size !== templateKeys.size ||
    [...templateKeys].some((key) => !simpleKeys.has(key))
  ) {
    return false;
  }
  const orders = new Set(layout.simpleItems.map((item) => item.order));
  const columnOrdersValid = (["primary", "secondary"] as const).every((column) => {
    const columnItems = layout.simpleItems.filter((item) => item.column === column);
    const columnOrders = new Set(columnItems.map((item) => item.columnOrder));
    return columnOrders.size === columnItems.length;
  });
  return (
    orders.size === layout.simpleItems.length &&
    columnOrdersValid &&
    layout.simpleItems.every((item) => {
      const templateItem = templateByWidgetKey(template, item.widgetKey);
      const definition = templateItem ? definitionForTemplateItem(templateItem, template) : null;
      return Boolean(
        definition &&
        typeof item.visible === "boolean" &&
        isInteger(item.order) &&
        item.order >= 0 &&
        isInteger(item.columnOrder) &&
        item.columnOrder >= 0 &&
        FLOW_WORKBENCH_SPANS.includes(item.span as FlowWorkbenchSpan) &&
        (item.column === "primary" || item.column === "secondary") &&
        isValidWorkbenchSettings(item.settings, definition),
      );
    })
  );
}

function templateByWidgetKey(template: WorkbenchTemplate, widgetKey: string) {
  return template.widgets.find((item) => item.widgetKey === widgetKey) ?? null;
}

function isStoredItem(value: unknown): value is WorkbenchLayoutItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.widgetKey === "string" &&
    typeof item.visible === "boolean" &&
    isInteger(item.x) &&
    isInteger(item.y) &&
    isInteger(item.w) &&
    isInteger(item.h) &&
    Boolean(item.settings) &&
    typeof item.settings === "object"
  );
}

function isStoredLayoutEnvelope(
  value: unknown,
  context: WorkbenchLayoutContext,
): value is Record<string, unknown> & { items: WorkbenchLayoutItem[] } {
  if (!value || typeof value !== "object") return false;
  const layout = value as Record<string, unknown>;
  return (
    (layout.version === 1 ||
      layout.version === 2 ||
      layout.version === 3 ||
      layout.version === 4 ||
      layout.version === WORKBENCH_LAYOUT_VERSION) &&
    isInteger(layout.templateRevision) &&
    layout.tenantId === context.tenant.id &&
    layout.userId === context.userId &&
    layout.profile === context.profile &&
    Array.isArray(layout.items) &&
    layout.items.every(isStoredItem)
  );
}

function isStoredSimpleItem(value: unknown): value is SimpleWorkbenchLayoutItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.widgetKey === "string" &&
    typeof item.visible === "boolean" &&
    isInteger(item.order) &&
    isInteger(item.columnOrder) &&
    FLOW_WORKBENCH_SPANS.includes(item.span as FlowWorkbenchSpan) &&
    (item.column === "primary" || item.column === "secondary") &&
    Boolean(item.settings) &&
    typeof item.settings === "object"
  );
}

function isVersionThreeSimpleItem(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.widgetKey === "string" &&
    typeof item.visible === "boolean" &&
    isInteger(item.order) &&
    SIMPLE_WORKBENCH_SPANS.includes(item.span as SimpleWorkbenchSpan) &&
    (item.column === "primary" || item.column === "secondary") &&
    Boolean(item.settings) &&
    typeof item.settings === "object"
  );
}

function isVersionTwoSimpleItem(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.widgetKey === "string" &&
    typeof item.visible === "boolean" &&
    isInteger(item.order) &&
    SIMPLE_WORKBENCH_SPANS.includes(item.span as SimpleWorkbenchSpan) &&
    Boolean(item.settings) &&
    typeof item.settings === "object"
  );
}

function assignColumnOrders(items: SimpleWorkbenchLayoutItem[]) {
  for (const column of ["primary", "secondary"] as const) {
    items
      .filter((item) => item.column === column)
      .sort((first, second) => first.columnOrder - second.columnOrder || first.order - second.order)
      .forEach((item, columnOrder) => { item.columnOrder = columnOrder; });
  }
  return items;
}

function bottomY(items: readonly WorkbenchLayoutItem[]) {
  return items.reduce((max, item) => Math.max(max, item.y + item.h), 0);
}

function appendNewTemplateItems(
  existing: WorkbenchLayoutItem[],
  missing: readonly WorkbenchLayoutItem[],
) {
  const placed = [...existing];
  let cursorX = 0;
  let cursorY = bottomY(existing);
  let rowHeight = 0;

  for (const templateItem of missing) {
    const item = cloneWorkbenchItem(templateItem);
    if (cursorX + item.w > WORKBENCH_GRID_COLUMNS) {
      cursorX = 0;
      cursorY += rowHeight;
      rowHeight = 0;
    }
    item.x = cursorX;
    item.y = cursorY;
    item.visible = true;
    placed.push(item);
    cursorX += item.w;
    rowHeight = Math.max(rowHeight, item.h);
  }
  return placed;
}

export function reconcileStoredWorkbenchLayout(
  value: unknown,
  context: WorkbenchLayoutContext,
  template: WorkbenchTemplate,
): UserWorkbenchLayout | null {
  if (!isStoredLayoutEnvelope(value, context)) return null;
  const templateByKey = new Map(template.widgets.map((item) => [item.widgetKey, item]));
  const seen = new Set<string>();
  const retainedLegacy: WorkbenchLayoutItem[] = [];
  const isCurrentVersion = value.version === WORKBENCH_LAYOUT_VERSION;

  for (const item of value.items) {
    if (seen.has(item.widgetKey)) return null;
    seen.add(item.widgetKey);
    if (!templateByKey.has(item.widgetKey)) continue;
    const definition = definitionForTemplateItem(item, template);
    if (
      !definition ||
      !isPositionInsideGrid(item) ||
      !(isCurrentVersion
        ? isClassicSizeAllowed(item, definition)
        : isTemplateSizeAllowed(item, definition)) ||
      !isValidWorkbenchSettings(item.settings, definition)
    ) {
      return null;
    }
    retainedLegacy.push(cloneWorkbenchItem(item));
  }

  if (hasVisibleOverlap(retainedLegacy)) return null;
  const retained = isCurrentVersion
    ? retainedLegacy
    : createClassicItems(retainedLegacy);
  const missing = template.widgets.filter((item) => !seen.has(item.widgetKey));
  const classicItems = appendNewTemplateItems(retained, createClassicItems(missing));
  const classicByKey = new Map(classicItems.map((item) => [item.widgetKey, item]));
  let storedSimpleItems: SimpleWorkbenchLayoutItem[];
  if (value.version === WORKBENCH_LAYOUT_VERSION || value.version === 4) {
    if (value.mode !== "classic" && value.mode !== "simple") return null;
    if (value.simpleLayoutType !== "flow" && value.simpleLayoutType !== "columns") return null;
    if (value.simpleColumnRatio !== "4:2" && value.simpleColumnRatio !== "6:2") return null;
    if (!Array.isArray(value.simpleItems) || !value.simpleItems.every(isStoredSimpleItem)) {
      return null;
    }
    const simpleKeys = new Set<string>();
    for (const item of value.simpleItems) {
      if (simpleKeys.has(item.widgetKey)) return null;
      simpleKeys.add(item.widgetKey);
    }
    storedSimpleItems = value.simpleItems;
  } else if (value.version === 3) {
    if (value.mode !== "classic" && value.mode !== "simple") return null;
    if (value.simpleLayoutType !== "flow" && value.simpleLayoutType !== "columns") return null;
    if (value.simpleColumnRatio !== "4:2" && value.simpleColumnRatio !== "6:2") return null;
    if (!Array.isArray(value.simpleItems) || !value.simpleItems.every(isVersionThreeSimpleItem)) {
      return null;
    }
    storedSimpleItems = value.simpleItems.map((item) => {
      const legacy = item as Record<string, unknown>;
      return {
        widgetKey: legacy.widgetKey as string,
        visible: legacy.visible as boolean,
        settings: cloneWorkbenchSettings(legacy.settings as WorkbenchWidgetSettings),
        order: legacy.order as number,
        columnOrder: legacy.order as number,
        span: legacy.span === 6 ? 6 : 3,
        column: legacy.column as "primary" | "secondary",
      };
    });
    assignColumnOrders(storedSimpleItems);
  } else if (value.version === 2) {
    if (value.mode !== "classic" && value.mode !== "simple") return null;
    if (!Array.isArray(value.simpleItems) || !value.simpleItems.every(isVersionTwoSimpleItem)) {
      return null;
    }
    storedSimpleItems = value.simpleItems.map((item) => {
      const legacy = item as Record<string, unknown>;
      const classicItem = classicByKey.get(legacy.widgetKey as string);
      return {
        widgetKey: legacy.widgetKey as string,
        visible: legacy.visible as boolean,
        settings: cloneWorkbenchSettings(legacy.settings as WorkbenchWidgetSettings),
        order: legacy.order as number,
        columnOrder: legacy.order as number,
        span: legacy.span === 6 ? 6 : 3,
        column: classicItem ? simpleColumnFromClassicItem(classicItem) : "primary",
      };
    });
    assignColumnOrders(storedSimpleItems);
  } else {
    storedSimpleItems = createSimpleItems(classicItems);
  }
  const simpleByKey = new Map(storedSimpleItems.map((item) => [item.widgetKey, item]));
  const simpleItems = classicItems
    .map((item) => simpleByKey.get(item.widgetKey) ?? {
      widgetKey: item.widgetKey,
      visible: true,
      settings: cloneWorkbenchSettings(item.settings),
      order: Number.MAX_SAFE_INTEGER,
      columnOrder: Number.MAX_SAFE_INTEGER,
      span: simpleSpanFromClassicWidth(item.w),
      column: simpleColumnFromClassicItem(item),
    })
    .sort((first, second) => first.order - second.order)
    .map((item, order) => ({ ...cloneSimpleWorkbenchItem(item), order }));
  assignColumnOrders(simpleItems);
  const reconciled: UserWorkbenchLayout = {
    version: WORKBENCH_LAYOUT_VERSION,
    templateRevision: template.revision,
    tenantId: context.tenant.id,
    userId: context.userId,
    profile: context.profile,
    mode: (value.version === WORKBENCH_LAYOUT_VERSION || value.version === 4 || value.version === 3 || value.version === 2) &&
      value.mode === "simple"
      ? "simple"
      : "classic",
    simpleLayoutType: value.version === WORKBENCH_LAYOUT_VERSION || value.version === 4 || value.version === 3
      ? value.simpleLayoutType as "flow" | "columns"
      : "flow",
    simpleColumnRatio: value.version === WORKBENCH_LAYOUT_VERSION || value.version === 4 || value.version === 3
      ? value.simpleColumnRatio as "4:2" | "6:2"
      : "4:2",
    items: classicItems,
    simpleItems,
  };
  return validateWorkbenchLayout(reconciled, context, template) ? reconciled : null;
}

export function findAvailableWorkbenchPosition(
  preferred: WorkbenchWidgetPosition,
  visibleItems: readonly WorkbenchLayoutItem[],
) {
  const clampedX = Math.max(0, Math.min(preferred.x, WORKBENCH_GRID_COLUMNS - preferred.w));
  const maxY = Math.max(bottomY(visibleItems) + preferred.h, preferred.y + preferred.h);
  const candidates: WorkbenchWidgetPosition[] = [];

  for (let y = 0; y <= maxY; y += 1) {
    for (let x = 0; x <= WORKBENCH_GRID_COLUMNS - preferred.w; x += 1) {
      candidates.push({ ...preferred, x, y });
    }
  }

  candidates.sort((a, b) => {
    const aDistance = Math.abs(a.x - clampedX) + Math.abs(a.y - preferred.y);
    const bDistance = Math.abs(b.x - clampedX) + Math.abs(b.y - preferred.y);
    return aDistance - bDistance || a.y - b.y || a.x - b.x;
  });

  return candidates.find(
    (candidate) => !visibleItems.some((item) => workbenchItemsOverlap(candidate, item)),
  ) ?? { ...preferred, x: 0, y: bottomY(visibleItems) };
}
