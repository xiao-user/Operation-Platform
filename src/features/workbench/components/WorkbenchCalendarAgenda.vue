<template>
  <div class="calendar-agenda">
    <el-calendar ref="calendarRef" v-model="selectedDate" class="agenda-calendar">
      <template #header>
        <div class="calendar-toolbar">
          <div class="calendar-period">
            <strong>{{ monthLabel }}</strong>
            <span>{{ monthEventSummary }}</span>
          </div>
          <el-button-group>
            <el-tooltip content="上个月" placement="top">
              <el-button aria-label="上个月" :icon="ArrowLeft" @click="selectDate('prev-month')" />
            </el-tooltip>
            <el-button @click="selectDate('today')">今天</el-button>
            <el-tooltip content="下个月" placement="top">
              <el-button aria-label="下个月" :icon="ArrowRight" @click="selectDate('next-month')" />
            </el-tooltip>
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
          <div
            v-if="eventCount(cell.day)"
            class="event-indicators"
            :aria-label="`${eventCount(cell.day)} 项日程`"
          >
            <i
              v-for="type in eventTypesForDate(cell.day)"
              :key="type"
              :class="`type-${type}`"
            />
            <small v-if="eventCount(cell.day) > 3">+{{ eventCount(cell.day) - 3 }}</small>
          </div>
        </div>
      </template>
    </el-calendar>

    <section class="agenda-panel" aria-label="所选日期日程">
      <div class="agenda-heading">
        <div>
          <strong>{{ selectedDateLabel }}</strong>
          <span>{{ selectedDateSummary }}</span>
        </div>
        <el-button type="primary" :icon="Plus" @click="openCreateDialog">新增日程</el-button>
      </div>

      <el-empty v-if="!selectedEvents.length" description="当天暂无日程" :image-size="52">
        <el-button type="primary" plain :icon="Plus" @click="openCreateDialog">添加日程</el-button>
      </el-empty>

      <ul v-else class="agenda-list">
        <li
          v-for="event in selectedEvents"
          :key="event.id"
          :class="[`type-${event.type}`, { 'is-completed': event.status === 'completed' }]"
        >
          <span class="agenda-marker" aria-hidden="true" />
          <button type="button" class="agenda-copy" @click="openEditDialog(event)">
            <span class="agenda-meta">
              <time>{{ event.time }}</time>
              <el-tag size="small" effect="plain" :type="eventMeta(event.type).tagType">
                {{ eventMeta(event.type).label }}
              </el-tag>
            </span>
            <strong>{{ event.title }}</strong>
          </button>
          <div class="agenda-actions">
            <el-checkbox
              :model-value="event.status === 'completed'"
              :aria-label="`${event.title}标记为完成`"
              @change="toggleEvent(event.id)"
            />
            <el-tooltip content="删除" placement="top">
              <el-button
                text
                circle
                :icon="Delete"
                :aria-label="`删除${event.title}`"
                @click="removeEvent(event)"
              />
            </el-tooltip>
          </div>
        </li>
      </ul>
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
        </div>
        <el-form-item label="类型" required>
          <el-select v-model="form.type" placeholder="选择类型">
            <el-option label="会议" value="meeting" />
            <el-option label="审核" value="review" />
            <el-option label="任务" value="task" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEvent">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { ArrowLeft, ArrowRight, Delete, Plus } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox, type CalendarDateType, type CalendarInstance } from "element-plus";
import type {
  WorkbenchCalendarData,
  WorkbenchCalendarEventData,
  WorkbenchCalendarEventType,
} from "@/features/workbench/types";

interface EventTypeMeta {
  label: string;
  tagType: "primary" | "warning" | "info";
}

const EVENT_TYPE_META: Record<WorkbenchCalendarEventType, EventTypeMeta> = {
  meeting: { label: "会议", tagType: "primary" },
  review: { label: "审核", tagType: "warning" },
  task: { label: "任务", tagType: "info" },
};

const props = defineProps<{ data: WorkbenchCalendarData }>();

const calendarRef = ref<CalendarInstance>();
const selectedDate = ref(new Date());
const events = ref(props.data.events.map((event) => ({ ...event })));
const dialogVisible = ref(false);
const editingEventId = ref<string | null>(null);
const form = reactive<{
  title: string;
  date: string;
  time: string;
  type: WorkbenchCalendarEventType;
}>({
  title: "",
  date: localIsoDate(selectedDate.value),
  time: "09:00",
  type: "meeting",
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
const pendingCount = computed(() => selectedEvents.value.filter((event) => event.status === "pending").length);
const monthEvents = computed(() => events.value.filter((event) => {
  const eventDate = new Date(`${event.date}T12:00:00`);
  return eventDate.getFullYear() === selectedDate.value.getFullYear()
    && eventDate.getMonth() === selectedDate.value.getMonth();
}));
const monthLabel = computed(() => `${selectedDate.value.getFullYear()} 年 ${selectedDate.value.getMonth() + 1} 月`);
const monthEventSummary = computed(() => `${monthEvents.value.length} 项日程`);
const selectedDateLabel = computed(() => new Intl.DateTimeFormat("zh-CN", {
  month: "long",
  day: "numeric",
  weekday: "short",
}).format(selectedDate.value));
const selectedDateSummary = computed(() => selectedEvents.value.length
  ? `${selectedEvents.value.length} 项日程 · ${pendingCount.value} 项待处理`
  : "暂无安排");

function localIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isToday(date: string) {
  return date === todayIsoDate;
}

function eventCount(date: string) {
  return eventsByDate.value.get(date)?.length ?? 0;
}

function eventTypesForDate(date: string) {
  return [...new Set((eventsByDate.value.get(date) ?? []).map((event) => event.type))].slice(0, 3);
}

function selectDate(type: CalendarDateType) {
  calendarRef.value?.selectDate(type);
}

function eventMeta(type: WorkbenchCalendarEventType) {
  return EVENT_TYPE_META[type];
}

function resetForm(event?: WorkbenchCalendarEventData) {
  form.title = event?.title ?? "";
  form.date = event?.date ?? selectedIsoDate.value;
  form.time = event?.time ?? "09:00";
  form.type = event?.type ?? "meeting";
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

function saveEvent() {
  if (!form.title.trim() || !form.date || !form.time) {
    ElMessage.warning("请完整填写日程信息");
    return;
  }
  if (editingEventId.value) {
    const index = events.value.findIndex((event) => event.id === editingEventId.value);
    if (index >= 0) {
      events.value[index] = { ...events.value[index]!, ...form, title: form.title.trim() };
    }
    ElMessage.success("日程已更新");
  } else {
    events.value.push({
      id: `agenda-${Date.now()}`,
      ...form,
      title: form.title.trim(),
      status: "pending",
    });
    ElMessage.success("日程已新增");
  }
  selectedDate.value = new Date(`${form.date}T12:00:00`);
  dialogVisible.value = false;
}

function toggleEvent(id: string) {
  const event = events.value.find((item) => item.id === id);
  if (!event) return;
  event.status = event.status === "completed" ? "pending" : "completed";
  ElMessage.success(event.status === "completed" ? "已标记为完成" : "已恢复为待处理");
}

async function removeEvent(event: WorkbenchCalendarEventData) {
  try {
    await ElMessageBox.confirm(`确定删除“${event.title}”吗？`, "删除日程", {
      confirmButtonText: "删除",
      cancelButtonText: "取消",
      type: "warning",
    });
    events.value = events.value.filter((item) => item.id !== event.id);
    ElMessage.success("日程已删除");
  } catch {
    // Cancellation leaves the schedule unchanged.
  }
}
</script>

<style scoped>
.calendar-agenda {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.65fr);
  height: 100%;
  min-height: 0;
  gap: var(--spacing-20);
}

.agenda-calendar {
  display: flex;
  min-width: 0;
  height: 100%;
  flex-direction: column;
}

.calendar-toolbar,
.calendar-period,
.agenda-heading,
.agenda-heading > div,
.agenda-copy,
.agenda-meta,
.agenda-actions,
.event-indicators {
  display: flex;
}

.calendar-toolbar,
.agenda-heading {
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-12);
}

.calendar-period,
.agenda-heading > div {
  min-width: 0;
  flex-direction: column;
  gap: var(--spacing-2);
}

.calendar-period strong,
.agenda-heading strong {
  color: var(--color-title);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
}

.calendar-period span,
.agenda-heading span {
  color: var(--color-secondary);
  font-size: var(--font-size-xs);
}

.agenda-calendar :deep(.el-calendar__header) {
  flex: none;
  padding: 0 0 var(--spacing-12);
  border-bottom: 0;
}

.agenda-calendar :deep(.el-calendar__body) {
  display: flex;
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
  color: var(--color-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-regular);
}

.agenda-calendar :deep(.el-calendar-table td) {
  border: 0;
}

.agenda-calendar :deep(.el-calendar-table .el-calendar-day) {
  height: 50px;
  padding: var(--spacing-2);
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
  min-height: 42px;
  color: var(--color-body);
  font-size: var(--font-size-xs);
}

.calendar-cell > span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
}

.calendar-cell:hover > span {
  color: var(--color-title);
  background: var(--color-bg-muted);
}

.calendar-cell.is-today > span {
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
  border-color: var(--color-primary-line-light);
}

.calendar-cell.is-outside-month {
  color: var(--color-placeholder);
}

.agenda-calendar :deep(td.is-selected .calendar-cell > span) {
  color: var(--color-white);
  font-weight: var(--font-weight-semibold);
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.event-indicators {
  position: absolute;
  right: var(--spacing-4);
  bottom: var(--spacing-4);
  align-items: center;
  gap: var(--spacing-2);
}

.event-indicators i,
.agenda-marker {
  width: 5px;
  height: 5px;
  flex: 0 0 5px;
  background: var(--color-primary);
  border-radius: var(--radius-full);
}

.event-indicators .type-review,
.type-review .agenda-marker { background: var(--color-warning); }
.event-indicators .type-task,
.type-task .agenda-marker { background: var(--color-secondary); }

.event-indicators small {
  color: var(--color-secondary);
  font-size: 9px;
  line-height: 10px;
}

.agenda-panel {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  padding-left: var(--spacing-20);
  border-left: 1px solid var(--color-border);
}

.agenda-heading {
  min-height: 36px;
  flex-shrink: 0;
  margin-bottom: var(--spacing-12);
}

.agenda-list {
  padding: 0;
  margin: 0;
  overflow: auto;
  list-style: none;
}

.agenda-list li {
  display: flex;
  align-items: center;
  min-height: 64px;
  gap: var(--spacing-10);
  border-bottom: 1px solid var(--color-border);
}

.agenda-list li:last-child { border-bottom: 0; }
.agenda-list li.is-completed .agenda-copy strong {
  color: var(--color-secondary);
  text-decoration: line-through;
}

.agenda-marker {
  width: 7px;
  height: 7px;
  flex-basis: 7px;
}

.agenda-copy {
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: var(--spacing-4);
  padding: var(--spacing-8) 0;
  font: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.agenda-meta,
.agenda-actions {
  align-items: center;
  gap: var(--spacing-6);
}

.agenda-copy time {
  min-width: 36px;
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.agenda-copy strong {
  overflow: hidden;
  color: var(--color-body);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agenda-actions {
  flex: 0 0 auto;
}

.agenda-actions :deep(.el-button) {
  opacity: 0;
  transition: opacity 120ms ease;
}

.agenda-list li:hover .agenda-actions :deep(.el-button),
.agenda-actions :deep(.el-button:focus-visible) {
  opacity: 1;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-12);
}

.form-row :deep(.el-date-editor),
.form-row :deep(.el-select) {
  width: 100%;
}

@container (max-width: 700px) {
  .calendar-agenda {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--spacing-12);
  }

  .agenda-calendar {
    min-height: 290px;
    padding-bottom: var(--spacing-12);
  }

  .agenda-calendar :deep(.el-calendar-table .el-calendar-day) {
    height: 38px;
  }

  .calendar-cell { min-height: 30px; }

  .agenda-panel {
    min-height: 170px;
    padding-top: var(--spacing-12);
    padding-left: 0;
    border-top: 1px solid var(--color-border);
    border-left: 0;
  }

  .agenda-actions :deep(.el-button) { opacity: 1; }
}

@container (max-width: 420px) {
  .calendar-toolbar {
    align-items: flex-start;
  }

  .calendar-toolbar :deep(.el-button) {
    padding-right: var(--spacing-10);
    padding-left: var(--spacing-10);
  }

  .agenda-heading {
    align-items: flex-start;
  }

  .agenda-heading :deep(.el-button) {
    padding-right: var(--spacing-10);
    padding-left: var(--spacing-10);
  }

  .form-row { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .agenda-actions :deep(.el-button) { transition: none; }
}
</style>
