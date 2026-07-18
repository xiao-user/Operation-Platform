import { describe, expect, it } from "vitest";
import { projectWorkbenchItemsToMediumGrid } from "@/features/workbench/workbench-responsive-layout";
import type { WorkbenchLayoutItem } from "@/features/workbench/types";

function node(widgetKey: string, x: number, y: number, w: number, h: number): WorkbenchLayoutItem {
  return { widgetKey, x, y, w, h, visible: true, settings: { kind: "none" } };
}

describe("workbench responsive layout", () => {
  it("fills medium rows while keeping the primary panel full width", () => {
    const projected = projectWorkbenchItemsToMediumGrid([
      node("school.admin.student-count", 0, 0, 3, 2),
      node("school.admin.arrival-rate", 3, 0, 3, 2),
      node("school.admin.pending-approvals", 6, 0, 3, 2),
      node("school.admin.device-online-rate", 9, 0, 3, 2),
      node("school.admin.attendance-trend", 0, 2, 8, 4),
      node("school.admin.operational-alerts", 8, 2, 4, 4),
      node("school.admin.notices", 0, 6, 4, 3),
      node("school.admin.student-distribution", 4, 6, 4, 3),
      node("school.admin.quick-links", 8, 6, 4, 3),
    ]);

    expect(projected.map(({ x, y, w }) => ({ x, y, w }))).toEqual([
      { x: 0, y: 0, w: 3 },
      { x: 3, y: 0, w: 3 },
      { x: 0, y: 2, w: 3 },
      { x: 3, y: 2, w: 3 },
      { x: 0, y: 4, w: 6 },
      { x: 0, y: 8, w: 3 },
      { x: 3, y: 8, w: 3 },
      { x: 0, y: 12, w: 3 },
      { x: 3, y: 12, w: 3 },
    ]);
  });

  it("expands the last unpaired card instead of leaving a half row empty", () => {
    const projected = projectWorkbenchItemsToMediumGrid([
      node("bureau.business.my-reviews", 0, 0, 4, 2),
      node("bureau.business.due-today", 4, 0, 4, 2),
      node("bureau.business.weekly-completed", 8, 0, 4, 2),
    ]);

    expect(projected.map(({ x, y, w }) => ({ x, y, w }))).toEqual([
      { x: 0, y: 0, w: 3 },
      { x: 3, y: 0, w: 3 },
      { x: 0, y: 2, w: 6 },
    ]);
  });

  it("keeps quick applications full width and pairs the following bureau widgets", () => {
    const projected = projectWorkbenchItemsToMediumGrid([
      node("bureau.business.quick-apps", 0, 2, 12, 3),
      node("bureau.business.bureau-news", 0, 5, 6, 4),
      node("bureau.business.information-disclosure", 6, 5, 6, 4),
    ]);

    expect(projected.map(({ x, y, w }) => ({ x, y, w }))).toEqual([
      { x: 0, y: 0, w: 6 },
      { x: 0, y: 3, w: 3 },
      { x: 3, y: 3, w: 3 },
    ]);
  });

  it("keeps the bureau calendar and adjacent task center usable at medium width", () => {
    const projected = projectWorkbenchItemsToMediumGrid([
      node("bureau.business.calendar-tasks", 0, 2, 8, 7),
      node("bureau.business.message-todo-center", 8, 2, 4, 7),
    ]);

    expect(projected.map(({ x, y, w }) => ({ x, y, w }))).toEqual([
      { x: 0, y: 0, w: 6 },
      { x: 0, y: 7, w: 6 },
    ]);
  });
});
