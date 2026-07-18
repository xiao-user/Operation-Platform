import { workbenchWidgetRegistry } from "@/features/workbench/workbench-templates";
import type { WorkbenchLayoutItem } from "@/features/workbench/types";

export const MEDIUM_WORKBENCH_COLUMNS = 6;

function isPrimaryPanel(item: WorkbenchLayoutItem) {
  const kind = workbenchWidgetRegistry.get(item.widgetKey)?.kind;
  return kind === "trend"
    || kind === "schedule"
    || kind === "calendar"
    || item.widgetKey.endsWith(".quick-apps");
}

function responsiveWidths(items: readonly WorkbenchLayoutItem[]) {
  const widths = new Map<WorkbenchLayoutItem, number>();
  let index = 0;

  while (index < items.length) {
    const item = items[index]!;
    if (isPrimaryPanel(item)) {
      widths.set(item, MEDIUM_WORKBENCH_COLUMNS);
      index += 1;
      continue;
    }

    const group: WorkbenchLayoutItem[] = [];
    while (index < items.length && !isPrimaryPanel(items[index]!)) {
      group.push(items[index]!);
      index += 1;
    }
    group.forEach((item, groupIndex) => {
      const isUnpairedLastItem = group.length % 2 === 1 && groupIndex === group.length - 1;
      widths.set(item, isUnpairedLastItem ? MEDIUM_WORKBENCH_COLUMNS : 3);
    });
  }

  return widths;
}

export function projectWorkbenchItemsToMediumGrid(items: readonly WorkbenchLayoutItem[]) {
  const ordered = [...items].sort((first, second) =>
    (first.y ?? 0) - (second.y ?? 0) || (first.x ?? 0) - (second.x ?? 0),
  );
  const widths = responsiveWidths(ordered);
  let x = 0;
  let y = 0;
  let rowHeight = 0;

  return ordered.map((item) => {
    const width = widths.get(item) ?? MEDIUM_WORKBENCH_COLUMNS;
    if (x > 0 && x + width > MEDIUM_WORKBENCH_COLUMNS) {
      x = 0;
      y += rowHeight;
      rowHeight = 0;
    }
    const projected = { ...item, x, y, w: width };
    rowHeight = Math.max(rowHeight, item.h);
    x += width;
    if (x === MEDIUM_WORKBENCH_COLUMNS) {
      x = 0;
      y += rowHeight;
      rowHeight = 0;
    }
    return projected;
  });
}
