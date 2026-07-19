import { describe, expect, it } from "vitest";
import {
  localCalendarEventRepository,
  type CalendarEventContext,
} from "@/features/calendar/calendar-event-repository";

const context: CalendarEventContext = {
  tenantId: "calendar-tenant-a",
  userId: "calendar-user-a",
};

const input = {
  title: "区级项目进度确认",
  date: "2026-07-19",
  time: "09:30",
  endTime: "11:00",
  type: "meeting" as const,
  location: "第一会议室",
  audience: "项目负责人",
};

describe("local calendar event repository", () => {
  it("persists the complete create, view, status, edit and delete lifecycle", async () => {
    const created = await localCalendarEventRepository.create(context, input);
    expect(created).toMatchObject({ ...input, status: "pending" });
    expect(created.viewedAt).toBeUndefined();

    const viewed = await localCalendarEventRepository.markViewed(context, created.id);
    expect(viewed.viewedAt).toBeTruthy();

    const completed = await localCalendarEventRepository.setStatus(
      context,
      created.id,
      "completed",
    );
    expect(completed.status).toBe("completed");
    expect(completed.completedAt).toBeTruthy();

    const restored = await localCalendarEventRepository.setStatus(
      context,
      created.id,
      "pending",
    );
    expect(restored.completedAt).toBeUndefined();

    const updated = await localCalendarEventRepository.update(context, created.id, {
      ...input,
      title: "区级项目进度复核",
      endTime: "11:30",
    });
    expect(updated).toMatchObject({ title: "区级项目进度复核", endTime: "11:30" });

    await expect(localCalendarEventRepository.list(context, {
      start: "2026-07-01",
      end: "2026-08-01",
    })).resolves.toHaveLength(1);

    await localCalendarEventRepository.delete(context, created.id);
    await expect(localCalendarEventRepository.list(context, {
      start: "2026-07-01",
      end: "2026-08-01",
    })).resolves.toEqual([]);
  });

  it("isolates users and rejects invalid time ranges", async () => {
    await localCalendarEventRepository.create(context, { ...input, title: "用户 A 日程" });
    await expect(localCalendarEventRepository.list({ ...context, userId: "calendar-user-b" }, {
      start: "2026-07-01",
      end: "2026-08-01",
    })).resolves.toEqual([]);

    await expect(localCalendarEventRepository.create(context, {
      ...input,
      time: "11:00",
      endTime: "10:00",
    })).rejects.toThrow("结束时间必须晚于开始时间");
  });
});
