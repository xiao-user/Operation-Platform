import { defineStore } from "pinia";
import {
  calendarEventRepository,
  type CalendarEventContext,
  type CalendarEventInput,
  type CalendarEventRange,
} from "@/features/calendar/calendar-event-repository";
import type { WorkbenchCalendarEventStatus } from "@/features/workbench/types";

export const useCalendarEventsStore = defineStore("calendar-events", () => ({
  list: (context: CalendarEventContext, range: CalendarEventRange) =>
    calendarEventRepository.list(context, range),
  create: (context: CalendarEventContext, input: CalendarEventInput) =>
    calendarEventRepository.create(context, input),
  update: (context: CalendarEventContext, eventId: string, input: CalendarEventInput) =>
    calendarEventRepository.update(context, eventId, input),
  setStatus: (
    context: CalendarEventContext,
    eventId: string,
    status: WorkbenchCalendarEventStatus,
  ) => calendarEventRepository.setStatus(context, eventId, status),
  markViewed: (context: CalendarEventContext, eventId: string) =>
    calendarEventRepository.markViewed(context, eventId),
  delete: (context: CalendarEventContext, eventId: string) =>
    calendarEventRepository.delete(context, eventId),
}));
