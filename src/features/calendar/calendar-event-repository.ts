import { dataBackend } from "@/config/runtime-providers";
import { getSupabaseClient } from "@/lib/supabase";
import type {
  WorkbenchCalendarEventData,
  WorkbenchCalendarEventStatus,
  WorkbenchCalendarEventType,
} from "@/features/workbench/types";

export interface CalendarEventContext {
  tenantId: string;
  userId: string;
}

export interface CalendarEventRange {
  start: string;
  end: string;
}

export interface CalendarEventInput {
  title: string;
  date: string;
  time: string;
  endTime: string;
  type: WorkbenchCalendarEventType;
  location?: string;
  audience?: string;
}

export interface CalendarEventRepository {
  list(context: CalendarEventContext, range: CalendarEventRange): Promise<WorkbenchCalendarEventData[]>;
  create(context: CalendarEventContext, input: CalendarEventInput): Promise<WorkbenchCalendarEventData>;
  update(context: CalendarEventContext, eventId: string, input: CalendarEventInput): Promise<WorkbenchCalendarEventData>;
  setStatus(
    context: CalendarEventContext,
    eventId: string,
    status: WorkbenchCalendarEventStatus,
  ): Promise<WorkbenchCalendarEventData>;
  markViewed(context: CalendarEventContext, eventId: string): Promise<WorkbenchCalendarEventData>;
  delete(context: CalendarEventContext, eventId: string): Promise<void>;
}

interface CalendarEventRow {
  id: string;
  title: string;
  event_type: WorkbenchCalendarEventType;
  status: WorkbenchCalendarEventStatus;
  starts_at: string;
  ends_at: string;
  location: string;
  audience: string;
  viewed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

const calendarColumns = [
  "id",
  "title",
  "event_type",
  "status",
  "starts_at",
  "ends_at",
  "location",
  "audience",
  "viewed_at",
  "completed_at",
  "cancelled_at",
  "created_at",
  "updated_at",
].join(",");

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function localDateTime(date: string, time: string) {
  const value = new Date(`${date}T${time}:00`);
  if (Number.isNaN(value.getTime())) throw new Error("日程日期或时间格式无效");
  return value;
}

function localIsoDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function localTime(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function validateInput(input: CalendarEventInput) {
  if (!input.title.trim()) throw new Error("请输入日程名称");
  const startsAt = localDateTime(input.date, input.time);
  const endsAt = localDateTime(input.date, input.endTime);
  if (endsAt <= startsAt) throw new Error("结束时间必须晚于开始时间");
  return { startsAt, endsAt };
}

function toEvent(row: CalendarEventRow): WorkbenchCalendarEventData {
  const startsAt = new Date(row.starts_at);
  const endsAt = new Date(row.ends_at);
  return {
    id: row.id,
    date: localIsoDate(startsAt),
    time: localTime(startsAt),
    endTime: localTime(endsAt),
    title: row.title,
    type: row.event_type,
    status: row.status,
    location: row.location || undefined,
    audience: row.audience || undefined,
    viewedAt: row.viewed_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    cancelledAt: row.cancelled_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toWriteRow(context: CalendarEventContext, input: CalendarEventInput) {
  const { startsAt, endsAt } = validateInput(input);
  return {
    tenant_id: context.tenantId,
    auth_user_id: context.userId,
    title: input.title.trim(),
    event_type: input.type,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    location: input.location?.trim() ?? "",
    audience: input.audience?.trim() ?? "",
  };
}

function contextKey(context: CalendarEventContext) {
  return `${context.tenantId}:${context.userId}`;
}

function cloneEvent(event: WorkbenchCalendarEventData) {
  return { ...event };
}

const localEvents = new Map<string, WorkbenchCalendarEventData[]>();

function localSnapshot(context: CalendarEventContext) {
  const key = contextKey(context);
  const stored = localEvents.get(key);
  if (stored) return stored;
  const events: WorkbenchCalendarEventData[] = [];
  localEvents.set(key, events);
  return events;
}

function eventStartsAt(event: WorkbenchCalendarEventData) {
  return localDateTime(event.date, event.time).getTime();
}

function localEvent(input: CalendarEventInput, existing?: WorkbenchCalendarEventData) {
  validateInput(input);
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? crypto.randomUUID(),
    ...input,
    title: input.title.trim(),
    location: input.location?.trim() || undefined,
    audience: input.audience?.trim() || undefined,
    status: existing?.status ?? "pending",
    viewedAt: existing?.viewedAt,
    completedAt: existing?.completedAt,
    cancelledAt: existing?.cancelledAt,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  } satisfies WorkbenchCalendarEventData;
}

function requireLocalEvent(context: CalendarEventContext, eventId: string) {
  const event = localSnapshot(context).find((item) => item.id === eventId);
  if (!event) throw new Error("日程不存在或已被删除");
  return event;
}

export const localCalendarEventRepository: CalendarEventRepository = {
  async list(context, range) {
    const start = localDateTime(range.start, "00:00").getTime();
    const end = localDateTime(range.end, "00:00").getTime();
    return localSnapshot(context)
      .filter((event) => {
        const startsAt = eventStartsAt(event);
        return startsAt >= start && startsAt < end;
      })
      .sort((first, second) => eventStartsAt(first) - eventStartsAt(second))
      .map(cloneEvent);
  },
  async create(context, input) {
    const event = localEvent(input);
    localSnapshot(context).push(event);
    return cloneEvent(event);
  },
  async update(context, eventId, input) {
    const events = localSnapshot(context);
    const index = events.findIndex((item) => item.id === eventId);
    if (index < 0) throw new Error("日程不存在或已被删除");
    const event = localEvent(input, events[index]);
    events[index] = event;
    return cloneEvent(event);
  },
  async setStatus(context, eventId, status) {
    const event = requireLocalEvent(context, eventId);
    const now = new Date().toISOString();
    event.status = status;
    event.completedAt = status === "completed" ? now : undefined;
    event.cancelledAt = status === "cancelled" ? now : undefined;
    event.updatedAt = now;
    return cloneEvent(event);
  },
  async markViewed(context, eventId) {
    const event = requireLocalEvent(context, eventId);
    if (!event.viewedAt) {
      event.viewedAt = new Date().toISOString();
      event.updatedAt = event.viewedAt;
    }
    return cloneEvent(event);
  },
  async delete(context, eventId) {
    const events = localSnapshot(context);
    const next = events.filter((item) => item.id !== eventId);
    if (next.length === events.length) throw new Error("日程不存在或已被删除");
    localEvents.set(contextKey(context), next);
  },
};

const supabaseCalendarEventRepository: CalendarEventRepository = {
  async list(context, range) {
    const startsAt = localDateTime(range.start, "00:00").toISOString();
    const endsAt = localDateTime(range.end, "00:00").toISOString();
    const { data, error } = await getSupabaseClient()
      .from("calendar_events")
      .select(calendarColumns)
      .eq("tenant_id", context.tenantId)
      .eq("auth_user_id", context.userId)
      .gte("starts_at", startsAt)
      .lt("starts_at", endsAt)
      .order("starts_at")
      .order("id");
    if (error) throw new Error(error.message || "日程读取失败");
    return (data as unknown as CalendarEventRow[]).map(toEvent);
  },
  async create(context, input) {
    const { data, error } = await getSupabaseClient()
      .from("calendar_events")
      .insert(toWriteRow(context, input))
      .select(calendarColumns)
      .single();
    if (error) throw new Error(error.message || "日程创建失败");
    return toEvent(data as unknown as CalendarEventRow);
  },
  async update(context, eventId, input) {
    const { tenant_id: _tenantId, auth_user_id: _userId, ...values } = toWriteRow(context, input);
    const { data, error } = await getSupabaseClient()
      .from("calendar_events")
      .update(values)
      .eq("tenant_id", context.tenantId)
      .eq("auth_user_id", context.userId)
      .eq("id", eventId)
      .select(calendarColumns)
      .single();
    if (error) throw new Error(error.message || "日程更新失败");
    return toEvent(data as unknown as CalendarEventRow);
  },
  async setStatus(context, eventId, status) {
    const now = new Date().toISOString();
    const { data, error } = await getSupabaseClient()
      .from("calendar_events")
      .update({
        status,
        completed_at: status === "completed" ? now : null,
        cancelled_at: status === "cancelled" ? now : null,
      })
      .eq("tenant_id", context.tenantId)
      .eq("auth_user_id", context.userId)
      .eq("id", eventId)
      .select(calendarColumns)
      .single();
    if (error) throw new Error(error.message || "日程状态更新失败");
    return toEvent(data as unknown as CalendarEventRow);
  },
  async markViewed(context, eventId) {
    const { data, error } = await getSupabaseClient()
      .from("calendar_events")
      .update({ viewed_at: new Date().toISOString() })
      .eq("tenant_id", context.tenantId)
      .eq("auth_user_id", context.userId)
      .eq("id", eventId)
      .is("viewed_at", null)
      .select(calendarColumns)
      .maybeSingle();
    if (error) throw new Error(error.message || "日程查看状态更新失败");
    if (data) return toEvent(data as unknown as CalendarEventRow);
    const { data: existing, error: existingError } = await getSupabaseClient()
      .from("calendar_events")
      .select(calendarColumns)
      .eq("tenant_id", context.tenantId)
      .eq("auth_user_id", context.userId)
      .eq("id", eventId)
      .single();
    if (existingError) throw new Error(existingError.message || "日程读取失败");
    return toEvent(existing as unknown as CalendarEventRow);
  },
  async delete(context, eventId) {
    const { data, error } = await getSupabaseClient()
      .from("calendar_events")
      .delete()
      .eq("tenant_id", context.tenantId)
      .eq("auth_user_id", context.userId)
      .eq("id", eventId)
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message || "日程删除失败");
  },
};

export const calendarEventRepository: CalendarEventRepository = dataBackend === "supabase"
  ? supabaseCalendarEventRepository
  : localCalendarEventRepository;
