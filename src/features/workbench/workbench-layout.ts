import { ADMIN_ROLE_ID } from "@/features/access-control/types";
import {
  WORKBENCH_GRID_COLUMNS,
  WORKBENCH_LAYOUT_VERSION,
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

export function cloneWorkbenchLayout(layout: UserWorkbenchLayout): UserWorkbenchLayout {
  return {
    ...layout,
    items: layout.items.map(cloneWorkbenchItem),
  };
}

export function createDefaultWorkbenchLayout(
  context: WorkbenchLayoutContext,
  template: WorkbenchTemplate,
): UserWorkbenchLayout {
  return {
    version: WORKBENCH_LAYOUT_VERSION,
    templateRevision: template.revision,
    tenantId: context.tenant.id,
    userId: context.userId,
    profile: context.profile,
    items: template.widgets.map(cloneWorkbenchItem),
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

function isSizeAllowed(item: WorkbenchLayoutItem, definition: WorkbenchWidgetDefinition) {
  return (
    item.w >= definition.minSize.w &&
    item.h >= definition.minSize.h &&
    item.w <= definition.maxSize.w &&
    item.h <= definition.maxSize.h
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
      isSizeAllowed(item, definition) &&
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
    layout.profile !== context.profile
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
    hasVisibleOverlap(layout.items)
  ) {
    return false;
  }

  return layout.items.every((item) => {
    const definition = definitionForTemplateItem(item, template);
    return Boolean(
      definition &&
      typeof item.visible === "boolean" &&
      isPositionInsideGrid(item) &&
      isSizeAllowed(item, definition) &&
      isValidWorkbenchSettings(item.settings, definition),
    );
  });
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
): value is UserWorkbenchLayout {
  if (!value || typeof value !== "object") return false;
  const layout = value as Record<string, unknown>;
  return (
    layout.version === WORKBENCH_LAYOUT_VERSION &&
    isInteger(layout.templateRevision) &&
    layout.tenantId === context.tenant.id &&
    layout.userId === context.userId &&
    layout.profile === context.profile &&
    Array.isArray(layout.items) &&
    layout.items.every(isStoredItem)
  );
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
  const retained: WorkbenchLayoutItem[] = [];

  for (const item of value.items) {
    if (seen.has(item.widgetKey)) return null;
    seen.add(item.widgetKey);
    if (!templateByKey.has(item.widgetKey)) continue;
    const definition = definitionForTemplateItem(item, template);
    if (
      !definition ||
      !isPositionInsideGrid(item) ||
      !isSizeAllowed(item, definition) ||
      !isValidWorkbenchSettings(item.settings, definition)
    ) {
      return null;
    }
    retained.push(cloneWorkbenchItem(item));
  }

  if (hasVisibleOverlap(retained)) return null;
  const missing = template.widgets.filter((item) => !seen.has(item.widgetKey));
  const reconciled: UserWorkbenchLayout = {
    version: WORKBENCH_LAYOUT_VERSION,
    templateRevision: template.revision,
    tenantId: context.tenant.id,
    userId: context.userId,
    profile: context.profile,
    items: appendNewTemplateItems(retained, missing),
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
