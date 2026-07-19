import { calendarEventRepository } from "@/features/calendar/calendar-event-repository";
import { MockWorkbenchDataSource } from "@/features/workbench/mock-workbench-data-source";
import type {
  WorkbenchDataContext,
  WorkbenchDataSource,
  WorkbenchQuickLinkData,
  WorkbenchWidgetDefinition,
  WorkbenchWidgetSettings,
} from "@/features/workbench/types";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function localIsoDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function currentMonthRange() {
  const now = new Date();
  return {
    start: localIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: localIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 1)),
  };
}

class RuntimeWorkbenchDataSource implements WorkbenchDataSource {
  private readonly fallback = new MockWorkbenchDataSource();

  async load(
    definition: WorkbenchWidgetDefinition,
    settings: WorkbenchWidgetSettings,
    context: WorkbenchDataContext,
    quickLinks: readonly WorkbenchQuickLinkData[],
  ) {
    if (definition.kind !== "calendar") {
      return this.fallback.load(definition, settings, context, quickLinks);
    }
    return {
      kind: "calendar" as const,
      events: await calendarEventRepository.list({
        tenantId: context.tenant.id,
        userId: context.userId,
      }, currentMonthRange()),
    };
  }
}

export const workbenchDataSource = new RuntimeWorkbenchDataSource();
