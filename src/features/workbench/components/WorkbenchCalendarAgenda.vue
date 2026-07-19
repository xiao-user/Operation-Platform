<template>
  <div class="calendar-agenda">
    <section class="calendar-shell" aria-label="日历">
      <el-calendar ref="calendarRef" v-model="selectedDate" class="agenda-calendar">
        <template #header>
          <div class="calendar-toolbar">
            <div class="calendar-period">
              <strong>{{ monthLabel }}</strong>
            </div>
            <el-button-group class="calendar-navigation">
              <el-button aria-label="上个月" :icon="ArrowLeft" @click="selectDate('prev-month')" />
              <el-button @click="selectDate('today')">今日</el-button>
              <el-button aria-label="下个月" :icon="ArrowRight" @click="selectDate('next-month')" />
            </el-button-group>
          </div>
        </template>

        <template #date-cell="{ data: cell }">
          <div
            class="calendar-cell"
            :class="{
              'is-today': isToday(cell.day),
              'is-outside-month': cell.type !== 'current-month',
            }"
          >
            <span>{{ Number(cell.day.slice(-2)) }}</span>
            <i v-if="eventCount(cell.day)" aria-hidden="true" />
          </div>
        </template>
      </el-calendar>
      <div class="calendar-grabber" aria-hidden="true"><span /></div>
    </section>

    <section class="agenda-panel" aria-label="所选日期日程">
      <div class="agenda-heading">
        <strong class="agenda-date-number">{{ selectedDayNumber }}</strong>
        <div class="agenda-date-copy">
          <span>{{ selectedWeekday }}</span>
          <span>{{ lunarLabel }}</span>
        </div>
        <el-button
          class="agenda-add"
          circle
          :icon="Plus"
          aria-label="新增日程"
          @click="openCreateDialog"
        />
      </div>

      <div class="agenda-content">
        <div v-if="!selectedEvents.length" class="agenda-empty">
          <strong>今日无事项</strong>
          <p>把重要会议、审核和任务安排在这里，让接下来的工作更有条理。</p>
          <el-button text type="primary" :icon="Plus" @click="openCreateDialog">
            添加日程
          </el-button>
        </div>

        <ul v-else class="agenda-list">
          <li
            v-for="event in displayedEvents"
            :key="event.id"
            class="agenda-event-card"
            :class="`is-${displayStatus(event)}`"
          >
            <div class="agenda-card-header">
              <div class="event-tags">
                <span :class="`event-tag type-${event.type}`">{{ eventMeta(event.type).label }}</span>
                <span :class="`event-state state-${displayStatus(event)}`">
                  {{ statusLabel(event) }}
                </span>
                <span class="event-view-state" :class="{ 'is-unread': !event.viewedAt }">
                  {{ event.viewedAt ? "已查看" : "未查看" }}
                </span>
              </div>
              <time><el-icon><Clock /></el-icon>{{ eventTimeLabel(event) }}</time>
            </div>
            <button type="button" class="agenda-copy" @click="viewEvent(event)">
              <strong>{{ event.title }}</strong>
              <span v-if="event.location"><el-icon><Location /></el-icon>{{ event.location }}</span>
              <span v-if="event.audience"><el-icon><User /></el-icon>{{ event.audience }}</span>
            </button>
            <div class="agenda-actions">
              <el-checkbox
                :model-value="event.status === 'completed'"
                :disabled="event.status === 'cancelled'"
                :aria-label="`${event.title}标记为完成`"
                @change="toggleEvent(event.id)"
              >
                {{ event.status === "completed" ? "已完成" : "标记完成" }}
              </el-checkbox>
              <el-button
                v-if="event.status === 'pending'"
                text
                :aria-label="`取消${event.title}`"
                @click="cancelEvent(event.id)"
              >
                取消
              </el-button>
              <el-button
                v-else
                text
                :aria-label="`恢复${event.title}`"
                @click="restoreEvent(event.id)"
              >
                恢复
              </el-button>
              <el-button
                text
                :icon="Delete"
                :aria-label="`删除${event.title}`"
                @click="removeEvent(event)"
              >
                删除
              </el-button>
            </div>
          </li>
        </ul>
      </div>

      <button
        v-if="selectedEvents.length > 2"
        type="button"
        class="agenda-more"
        @click="showAllEvents = !showAllEvents"
      >
        {{ showAllEvents ? "收起事项" : "查看更多事项" }}
        <el-icon :class="{ 'is-expanded': showAllEvents }"><ArrowRight /></el-icon>
      </button>
      <div v-else class="agenda-more is-static">
        共 {{ selectedEvents.length }} 项日程
      </div>
    </section>

    <el-dialog
      v-model="dialogVisible"
      :title="editingEventId ? '编辑日程' : '新增日程'"
      width="min(440px, calc(100vw - 32px))"
      append-to-body
    >
      <el-form label-position="top" @submit.prevent="saveEvent">
        <el-form-item label="日程名称" required>
          <el-input v-model="form.title" maxlength="40" show-word-limit placeholder="请输入日程名称" />
        </el-form-item>
        <div class="form-row">
          <el-form-item label="日期" required>
            <el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" />
          </el-form-item>
          <el-form-item label="时间" required>
            <el-time-select v-model="form.time" start="08:00" step="00:30" end="20:00" placeholder="选择时间" />
          </el-form-item>
          <el-form-item label="结束时间" required>
            <el-time-select v-model="form.endTime" start="08:30" step="00:30" end="22:00" placeholder="选择结束时间" />
          </el-form-item>
        </div>
        <el-form-item label="类型" required>
          <el-select v-model="form.type" placeholder="选择类型">
            <el-option label="会议" value="meeting" />
            <el-option label="审核" value="review" />
            <el-option label="任务" value="task" />
          </el-select>
        </el-form-item>
        <el-form-item label="地点">
          <el-input v-model="form.location" maxlength="80" placeholder="请输入地点" />
        </el-form-item>
        <el-form-item label="参与人员">
          <el-input v-model="form.audience" maxlength="120" placeholder="请输入参与人员或范围" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveEvent">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Delete,
  Location,
  Plus,
  User,
} from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox, type CalendarDateType, type CalendarInstance } from "element-plus";
import type {
  WorkbenchCalendarEventData,
  WorkbenchCalendarData,
  WorkbenchCalendarEventDisplayStatus,
  WorkbenchCalendarEventType,
  WorkbenchDataContext,
} from "@/features/workbench/types";
import { useCalendarEventsStore } from "@/stores/calendar-events";

interface EventTypeMeta {
  label: string;
}

const EVENT_TYPE_META: Record<WorkbenchCalendarEventType, EventTypeMeta> = {
  meeting: { label: "会议日程" },
  review: { label: "审核事项" },
  task: { label: "工作任务" },
};

const props = defineProps<{
  data: WorkbenchCalendarData;
  context?: WorkbenchDataContext;
}>();

const calendarRef = ref<CalendarInstance>();
const selectedDate = ref(new Date());
const events = ref(props.data.events.map((event) => ({ ...event })));
const calendarEventsStore = props.context ? useCalendarEventsStore() : null;
const dialogVisible = ref(false);
const editingEventId = ref<string | null>(null);
const showAllEvents = ref(false);
const saving = ref(false);
const clock = ref(Date.now());
const loadedMonths = new Set<string>([monthKey(selectedDate.value)]);
let clockTimer: ReturnType<typeof setInterval> | undefined;
const form = reactive<{
  title: string;
  date: string;
  time: string;
  endTime: string;
  type: WorkbenchCalendarEventType;
  location: string;
  audience: string;
}>({
  title: "",
  date: localIsoDate(selectedDate.value),
  time: "09:00",
  endTime: "10:00",
  type: "meeting",
  location: "",
  audience: "",
});

const todayIsoDate = localIsoDate(new Date());
const selectedIsoDate = computed(() => localIsoDate(selectedDate.value));
const eventsByDate = computed(() => {
  const grouped = new Map<string, WorkbenchCalendarEventData[]>();
  for (const event of events.value) {
    const dateEvents = grouped.get(event.date) ?? [];
    dateEvents.push(event);
    grouped.set(event.date, dateEvents);
  }
  return grouped;
});
const selectedEvents = computed(() => [...(eventsByDate.value.get(selectedIsoDate.value) ?? [])]
  .sort((first, second) => first.time.localeCompare(second.time)));
const displayedEvents = computed(() => showAllEvents.value
  ? selectedEvents.value
  : selectedEvents.value.slice(0, 2));
const monthLabel = computed(() => `${selectedDate.value.getFullYear()}年 ${chineseMonth(selectedDate.value)}`);
const selectedDayNumber = computed(() => selectedDate.value.getDate());
const selectedWeekday = computed(() => new Intl.DateTimeFormat("zh-CN", {
  weekday: "long",
}).format(selectedDate.value));
const lunarLabel = computed(() => {
  try {
    return new Intl.DateTimeFormat("zh-CN-u-ca-chinese", {
      month: "long",
      day: "numeric",
    }).format(selectedDate.value);
  } catch {
    return "农历日期";
  }
});

watch(selectedIsoDate, () => {
  showAllEvents.value = false;
});

watch(
  () => props.data.events,
  (nextEvents) => {
    events.value = nextEvents.map((event) => ({ ...event }));
  },
);

watch(
  () => monthKey(selectedDate.value),
  (key) => void loadMonth(key),
);

onMounted(() => {
  clockTimer = setInterval(() => {
    clock.value = Date.now();
  }, 60_000);
});

onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer);
});

function chineseMonth(date: Date) {
  return ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"][date.getMonth()];
}

function localIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(key: string) {
  const [year, month] = key.split("-").map(Number);
  const start = new Date(year!, month! - 1, 1);
  const end = new Date(year!, month!, 1);
  return { start: localIsoDate(start), end: localIsoDate(end) };
}

const repositoryContext = computed(() => props.context ? {
  tenantId: props.context.tenant.id,
  userId: props.context.userId,
} : null);

async function loadMonth(key: string) {
  const context = repositoryContext.value;
  if (!calendarEventsStore || !context || loadedMonths.has(key)) return;
  try {
    const range = monthRange(key);
    const loaded = await calendarEventsStore.list(context, range);
    const retained = events.value.filter((event) => !event.date.startsWith(key));
    events.value = [...retained, ...loaded];
    loadedMonths.add(key);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "日程读取失败");
  }
}

function isToday(date: string) {
  return date === todayIsoDate;
}

function eventCount(date: string) {
  return eventsByDate.value.get(date)?.length ?? 0;
}

function selectDate(type: CalendarDateType) {
  calendarRef.value?.selectDate(type);
}

function eventMeta(type: WorkbenchCalendarEventType) {
  return EVENT_TYPE_META[type];
}

function eventTimeLabel(event: WorkbenchCalendarEventData) {
  return event.endTime ? `${event.time}～${event.endTime}` : event.time;
}

function displayStatus(event: WorkbenchCalendarEventData): WorkbenchCalendarEventDisplayStatus {
  if (event.status !== "pending") return event.status;
  const endsAt = new Date(`${event.date}T${event.endTime ?? event.time}:00`);
  return endsAt.getTime() < clock.value ? "overdue" : "pending";
}

function statusLabel(event: WorkbenchCalendarEventData) {
  return {
    pending: "待处理",
    completed: "已完成",
    cancelled: "已取消",
    overdue: "已过期",
  }[displayStatus(event)];
}

function resetForm(event?: WorkbenchCalendarEventData) {
  form.title = event?.title ?? "";
  form.date = event?.date ?? selectedIsoDate.value;
  form.time = event?.time ?? "09:00";
  form.endTime = event?.endTime ?? "10:00";
  form.type = event?.type ?? "meeting";
  form.location = event?.location ?? "";
  form.audience = event?.audience ?? "";
}

function openCreateDialog() {
  editingEventId.value = null;
  resetForm();
  dialogVisible.value = true;
}

function openEditDialog(event: WorkbenchCalendarEventData) {
  editingEventId.value = event.id;
  resetForm(event);
  dialogVisible.value = true;
}

function replaceEvent(saved: WorkbenchCalendarEventData) {
  const index = events.value.findIndex((event) => event.id === saved.id);
  if (index >= 0) events.value[index] = { ...saved };
  else events.value.push({ ...saved });
}

function viewEvent(event: WorkbenchCalendarEventData) {
  const context = repositoryContext.value;
  openEditDialog(event);
  if (event.viewedAt) return;
  if (!calendarEventsStore || !context) {
    event.viewedAt = new Date().toISOString();
    return;
  }
  void calendarEventsStore.markViewed(context, event.id)
    .then(replaceEvent)
    .catch((error: unknown) => {
      ElMessage.error(error instanceof Error ? error.message : "日程查看状态更新失败");
    });
}

async function saveEvent() {
  if (!form.title.trim() || !form.date || !form.time || !form.endTime) {
    ElMessage.warning("请完整填写日程信息");
    return;
  }
  const context = repositoryContext.value;
  saving.value = true;
  try {
    if (calendarEventsStore && context) {
      const saved = editingEventId.value
        ? await calendarEventsStore.update(context, editingEventId.value, form)
        : await calendarEventsStore.create(context, form);
      replaceEvent(saved);
    } else if (editingEventId.value) {
      const index = events.value.findIndex((event) => event.id === editingEventId.value);
      if (index >= 0) {
        events.value[index] = { ...events.value[index]!, ...form, title: form.title.trim() };
      }
    } else {
      events.value.push({
        id: `agenda-${Date.now()}`,
        ...form,
        title: form.title.trim(),
        status: "pending",
      });
    }
    ElMessage.success(editingEventId.value ? "日程已更新" : "日程已新增");
    selectedDate.value = new Date(`${form.date}T12:00:00`);
    loadedMonths.add(monthKey(selectedDate.value));
    dialogVisible.value = false;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "日程保存失败");
  } finally {
    saving.value = false;
  }
}

async function setEventStatus(id: string, status: "pending" | "completed" | "cancelled") {
  const event = events.value.find((item) => item.id === id);
  if (!event) return;
  const context = repositoryContext.value;
  try {
    if (calendarEventsStore && context) {
      replaceEvent(await calendarEventsStore.setStatus(context, id, status));
    } else {
      event.status = status;
    }
    ElMessage.success(status === "completed" ? "已标记为完成" : status === "cancelled" ? "日程已取消" : "已恢复为待处理");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "日程状态更新失败");
  }
}

function toggleEvent(id: string) {
  const event = events.value.find((item) => item.id === id);
  if (!event) return;
  return setEventStatus(id, event.status === "completed" ? "pending" : "completed");
}

function cancelEvent(id: string) {
  return setEventStatus(id, "cancelled");
}

function restoreEvent(id: string) {
  return setEventStatus(id, "pending");
}

async function removeEvent(event: WorkbenchCalendarEventData) {
  try {
    await ElMessageBox.confirm(`确定删除“${event.title}”吗？`, "删除日程", {
      confirmButtonText: "删除",
      cancelButtonText: "取消",
      type: "warning",
    });
    const context = repositoryContext.value;
    if (calendarEventsStore && context) {
      await calendarEventsStore.delete(context, event.id);
    }
    events.value = events.value.filter((item) => item.id !== event.id);
    ElMessage.success("日程已删除");
  } catch (error) {
    if (error !== "cancel" && error !== "close") {
      ElMessage.error(error instanceof Error ? error.message : "日程删除失败");
    }
  }
}
</script>

<style scoped>
.calendar-agenda {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(320px, 0.92fr);
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--color-white);
}

.calendar-shell,
.agenda-panel,
.agenda-calendar,
.agenda-content,
.agenda-list {
  min-width: 0;
  min-height: 0;
}

.calendar-shell,
.agenda-panel {
  display: flex;
  flex-direction: column;
}

.calendar-shell {
  padding-right: var(--spacing-24);
}

.agenda-calendar {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.calendar-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: var(--spacing-16);
}

.calendar-period strong {
  color: var(--color-title);
  font-size: 24px;
  font-weight: var(--font-weight-semibold);
  line-height: 32px;
}

.calendar-navigation :deep(.el-button) {
  min-width: 24px;
  height: 24px;
  padding: 0 var(--spacing-8);
  color: var(--color-title);
  font-size: var(--font-size-xs);
  border-color: color-mix(in srgb, var(--color-title) 10%, transparent);
}

.calendar-navigation :deep(.el-button:first-child),
.calendar-navigation :deep(.el-button:last-child) {
  width: 24px;
  padding: 0;
}

.calendar-navigation :deep(.el-icon) {
  width: 12px;
  height: 12px;
}

.agenda-calendar :deep(.el-calendar__header) {
  flex: none;
  padding: 0 0 var(--spacing-16);
  border-bottom: 0;
}

.agenda-calendar :deep(.el-calendar__body) {
  min-height: 0;
  flex: 1;
  padding: 0;
}

.agenda-calendar :deep(.el-calendar-table) {
  height: 100%;
  table-layout: fixed;
}

.agenda-calendar :deep(.el-calendar-table th) {
  height: 32px;
  padding: 0;
  color: var(--color-title);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-regular);
}

.agenda-calendar :deep(.el-calendar-table td) {
  border: 0;
}

.agenda-calendar :deep(.el-calendar-table .el-calendar-day) {
  height: 36px;
  padding: 0;
}

.agenda-calendar :deep(.el-calendar-table td.is-selected) {
  background: transparent;
}

.calendar-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--color-title);
  font-size: var(--font-size-md);
}

.calendar-cell > span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
}

.calendar-cell:hover > span {
  background: var(--color-bg-muted);
}

.calendar-cell.is-today > span {
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
}

.calendar-cell.is-outside-month {
  color: var(--color-placeholder);
}

.agenda-calendar :deep(td.is-selected .calendar-cell > span) {
  color: var(--color-white);
  font-weight: var(--font-weight-regular);
  background: var(--color-primary);
}

.calendar-cell > i {
  position: absolute;
  top: 3px;
  left: calc(50% + 11px);
  width: 6px;
  height: 6px;
  background: var(--color-primary);
  border: 1px solid var(--color-white);
  border-radius: var(--radius-full);
}

.calendar-grabber {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  flex: 0 0 20px;
}

.calendar-grabber span {
  width: 40px;
  height: 4px;
  background: var(--color-border-strong);
  border-radius: 1px;
}

.agenda-panel {
  border-left: 1px solid var(--color-border);
}

.agenda-heading {
  display: flex;
  align-items: center;
  min-height: 72px;
  padding: 0 0 var(--spacing-16) var(--spacing-24);
  gap: var(--spacing-10);
}

.agenda-date-number {
  color: var(--color-title);
  font-family: "DIN Alternate", "Arial Narrow", sans-serif;
  font-size: 48px;
  font-weight: 700;
  line-height: 48px;
}

.agenda-date-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  color: var(--color-body);
  font-size: var(--font-size-xs);
  line-height: var(--line-height-xs);
}

.agenda-add {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  color: var(--color-primary);
  background: var(--color-white);
  border-color: var(--color-primary);
  box-shadow: var(--shadow-s);
}

.agenda-content {
  flex: 1;
  padding: 0 0 0 var(--spacing-24);
  overflow: hidden;
}

.agenda-list {
  display: flex;
  height: 100%;
  padding: 0;
  margin: 0;
  overflow: auto;
  flex-direction: column;
  gap: var(--spacing-16);
  list-style: none;
}

.agenda-event-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-8);
  padding: var(--spacing-16);
  background: var(--color-white);
  border: 1px solid var(--color-border-strong);
  border-radius: 16px;
}

.agenda-card-header,
.agenda-actions,
.agenda-card-header time,
.agenda-copy span {
  display: flex;
  align-items: center;
}

.agenda-card-header {
  justify-content: space-between;
  gap: var(--spacing-12);
}

.event-tags {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--spacing-6);
}

.event-tag {
  padding: 0 var(--spacing-6);
  color: var(--color-error);
  font-size: var(--font-size-xs);
  line-height: var(--line-height-xs);
  background: var(--color-error-light);
  border-radius: var(--radius-md);
}

.event-tag.type-review {
  color: var(--color-warning-dark-text);
  background: var(--color-warning-light);
}

.event-tag.type-task {
  color: var(--color-primary);
  background: var(--color-primary-light);
}

.event-state,
.event-view-state {
  flex-shrink: 0;
  color: var(--color-secondary);
  font-size: var(--font-size-xs);
  line-height: var(--line-height-xs);
}

.event-state.state-completed {
  color: var(--color-success-dark-text);
}

.event-state.state-overdue,
.event-state.state-cancelled {
  color: var(--color-error-dark-text);
}

.event-view-state {
  color: var(--color-secondary);
}

.event-view-state.is-unread {
  position: relative;
  padding-left: var(--spacing-8);
  color: var(--color-primary);
}

.event-view-state.is-unread::before {
  position: absolute;
  top: 50%;
  left: 0;
  width: 5px;
  height: 5px;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  content: "";
  transform: translateY(-50%);
}

.agenda-card-header time {
  flex-shrink: 0;
  gap: var(--spacing-4);
  color: var(--color-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-md);
}

.agenda-card-header :deep(.el-icon),
.agenda-copy :deep(.el-icon) {
  width: 16px;
  height: 16px;
}

.agenda-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--spacing-4);
  padding: 0;
  font: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.agenda-copy strong {
  display: -webkit-box;
  overflow: hidden;
  color: var(--color-title);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-lg);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.agenda-copy span {
  min-width: 0;
  gap: var(--spacing-4);
  overflow: hidden;
  color: var(--color-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-md);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agenda-event-card.is-completed {
  background: var(--color-bg-subtle);
}

.agenda-event-card.is-completed .agenda-copy strong,
.agenda-event-card.is-cancelled .agenda-copy strong {
  color: var(--color-secondary);
  text-decoration: line-through;
}

.agenda-event-card.is-overdue {
  border-color: color-mix(in srgb, var(--color-error) 32%, var(--color-border-strong));
}

.agenda-event-card.is-cancelled {
  background: var(--color-bg-subtle);
  opacity: 0.78;
}

.agenda-actions {
  justify-content: flex-end;
  min-height: 24px;
  gap: var(--spacing-8);
  opacity: 0;
  transition: opacity 120ms ease;
}

.agenda-event-card:hover .agenda-actions,
.agenda-actions:focus-within {
  opacity: 1;
}

.agenda-actions :deep(.el-checkbox__label),
.agenda-actions :deep(.el-button) {
  font-size: var(--font-size-xs);
}

.agenda-empty {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-16);
  color: var(--color-body);
}

.agenda-empty strong {
  color: var(--color-title);
  font-size: var(--font-size-lg);
  line-height: var(--line-height-lg);
}

.agenda-empty p {
  color: var(--color-body);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-md);
}

.agenda-more {
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(100% - var(--spacing-24));
  height: 44px;
  flex: 0 0 44px;
  margin-left: var(--spacing-24);
  gap: var(--spacing-6);
  color: var(--color-secondary);
  font: inherit;
  font-size: var(--font-size-md);
  background: var(--color-white);
  border: 0;
  border-top: 1px solid var(--color-border);
  cursor: pointer;
}

.agenda-more.is-static {
  cursor: default;
}

.agenda-more :deep(.el-icon) {
  width: 20px;
  height: 20px;
  transition: transform 120ms ease;
}

.agenda-more :deep(.el-icon.is-expanded) {
  transform: rotate(-90deg);
}

.form-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--spacing-12);
}

.form-row :deep(.el-date-editor),
.form-row :deep(.el-select) {
  width: 100%;
}

@container (max-width: 700px) {
  .calendar-agenda {
    grid-template-columns: minmax(0, 1fr);
    overflow: auto;
  }

  .calendar-shell {
    min-height: 340px;
    padding-right: 0;
    padding-bottom: var(--spacing-16);
    border-bottom: 1px solid var(--color-border);
  }

  .agenda-panel {
    min-height: 320px;
    padding-top: var(--spacing-20);
    border-left: 0;
  }

  .agenda-heading,
  .agenda-content {
    padding-left: 0;
  }

  .agenda-more {
    width: 100%;
    margin-left: 0;
  }

  .agenda-actions { opacity: 1; }
}

@container (max-width: 420px) {
  .calendar-period strong { font-size: 20px; }
  .agenda-calendar :deep(.el-calendar-table .el-calendar-day) { height: 34px; }
  .agenda-date-number { font-size: 40px; line-height: 40px; }
  .form-row { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .agenda-actions,
  .agenda-more :deep(.el-icon) { transition: none; }
}
</style>
