<template>
  <div
    ref="gridElement"
    class="workbench-grid"
    :class="[`mode-${responsiveMode}`, { 'is-editing': editable, 'is-dragging': draggedWidgetKey }]"
    :style="gridStyle"
    @dragover.prevent="handleGridDragOver"
    @drop.prevent="handleGridDrop"
  >
    <article
      v-for="item in displayItems"
      :key="item.widgetKey"
      class="grid-stack-item classic-grid-item"
      :class="{
        'is-being-dragged': draggedWidgetKey === item.widgetKey,
        'is-spanning': item.h > 1,
        'is-width-resizing': widthResizeState?.widgetKey === item.widgetKey,
      }"
      :style="itemStyle(item)"
      :gs-id="item.widgetKey"
      :gs-x="item.x"
      :gs-y="item.y"
      :gs-w="resolvedItemWidth(item)"
      :gs-h="item.h"
      :data-widget-key="item.widgetKey"
      :data-row-span="item.h"
    >
      <div class="grid-stack-item-content">
        <WorkbenchWidgetCard
          :item="item"
          :editable="editable"
          @action="(action) => emit('widgetAction', item.widgetKey, action)"
          @open-settings="emit('openSettings', item.widgetKey)"
          @height-change="(height) => updateMeasuredHeight(item.widgetKey, height)"
          @drag-start="(event) => handleDragStart(event, item.widgetKey)"
          @drag-end="resetDragState"
        />
      </div>

      <button
        v-if="editable && responsiveMode === 'desktop'"
        class="classic-width-handle"
        type="button"
        aria-label="调整组件宽度"
        title="左右拖动调整组件宽度"
        @pointerdown="startWidthResize($event, item)"
      >
        <span aria-hidden="true" />
      </button>
      <span
        v-if="widthResizeState?.widgetKey === item.widgetKey"
        class="width-resize-label"
      >
        {{ resolvedItemWidth(item) }} / 12 格
      </span>
    </article>

    <div
      v-if="dropPreview"
      class="classic-drop-placeholder"
      :style="placementStyle(dropPreview)"
      aria-hidden="true"
    >
      <span>松开放置</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import WorkbenchWidgetCard from "@/features/workbench/components/WorkbenchWidgetCard.vue";
import {
  MEDIUM_WORKBENCH_COLUMNS,
  projectWorkbenchItemsToMediumGrid,
} from "@/features/workbench/workbench-responsive-layout";
import type {
  WorkbenchLayoutItem,
  WorkbenchWidgetAction,
} from "@/features/workbench/types";
import { WORKBENCH_GRID_COLUMNS } from "@/features/workbench/types";
import { useWorkbenchStore } from "@/stores/workbench";

const props = defineProps<{
  items: WorkbenchLayoutItem[];
  editable: boolean;
}>();

const emit = defineEmits<{
  move: [widgetKey: string, x: number, y: number];
  widthChange: [widgetKey: string, width: number];
  widgetAction: [widgetKey: string, action: WorkbenchWidgetAction];
  openSettings: [widgetKey: string];
}>();

type ResponsiveMode = "desktop" | "medium" | "mobile";
interface WidthResizeState {
  widgetKey: string;
  startClientX: number;
  startWidth: number;
  previewWidth: number;
  minWidth: number;
  maxWidth: number;
}

const GRID_GAP = 12;
const EMPTY_ROW_HEIGHT = 160;
const gridElement = ref<HTMLElement | null>(null);
const containerWidth = ref(0);
const measuredHeights = ref<Record<string, number>>({});
const draggedWidgetKey = ref("");
const dropPreview = ref<WorkbenchLayoutItem | null>(null);
const widthResizeState = ref<WidthResizeState | null>(null);
const workbenchStore = useWorkbenchStore();
let gridResizeObserver: ResizeObserver | null = null;

const responsiveMode = computed<ResponsiveMode>(() => {
  if (containerWidth.value >= 1200) return "desktop";
  if (containerWidth.value >= 768) return "medium";
  return "mobile";
});
const columnCount = computed(() => responsiveMode.value === "desktop"
  ? WORKBENCH_GRID_COLUMNS
  : responsiveMode.value === "medium"
    ? MEDIUM_WORKBENCH_COLUMNS
    : 1,
);

const displayItems = computed<WorkbenchLayoutItem[]>(() => {
  const ordered = [...props.items].sort((first, second) =>
    first.y - second.y || first.x - second.x,
  );
  if (responsiveMode.value === "desktop") return ordered;
  if (responsiveMode.value === "medium") {
    return projectWorkbenchItemsToMediumGrid(
      ordered.map((item) => ({ ...item, h: 1 })),
    ).map((item) => ({ ...item, h: 1 }));
  }
  return ordered.map((item, row) => ({ ...item, x: 0, y: row, w: 1, h: 1 }));
});

function desiredHeight(item: WorkbenchLayoutItem) {
  const policy = workbenchStore.definitionFor(item.widgetKey)?.heightPolicy;
  if (!policy) return EMPTY_ROW_HEIGHT;
  if (policy.mode !== "intrinsic") return policy.preferredHeight;
  const measured = measuredHeights.value[item.widgetKey] ?? policy.preferredHeight;
  return Math.max(policy.minHeight, Math.min(policy.maxContentHeight, measured));
}

const rowCount = computed(() => displayItems.value.reduce(
  (count, item) => Math.max(count, item.y + item.h),
  0,
));
const rowHeights = computed(() => {
  const heights = Array.from({ length: rowCount.value }, () => EMPTY_ROW_HEIGHT);
  const anchoredRows = new Set<number>();
  for (const item of displayItems.value) {
    if (item.h !== 1) continue;
    const height = desiredHeight(item);
    heights[item.y] = anchoredRows.has(item.y)
      ? Math.max(heights[item.y] ?? EMPTY_ROW_HEIGHT, height)
      : height;
    anchoredRows.add(item.y);
  }
  return heights;
});
const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${columnCount.value}, minmax(0, 1fr))`,
  gridTemplateRows: rowHeights.value.map((height) => `${Math.round(height)}px`).join(" "),
}));

function resolvedItemWidth(item: WorkbenchLayoutItem) {
  return widthResizeState.value?.widgetKey === item.widgetKey
    ? widthResizeState.value.previewWidth
    : item.w;
}

function placementStyle(item: Pick<WorkbenchLayoutItem, "x" | "y" | "w" | "h">) {
  return {
    gridColumn: `${item.x + 1} / span ${item.w}`,
    gridRow: `${item.y + 1} / span ${item.h}`,
  };
}

function itemStyle(item: WorkbenchLayoutItem) {
  return placementStyle({ ...item, w: resolvedItemWidth(item) });
}

function updateMeasuredHeight(widgetKey: string, height: number) {
  if (!Number.isFinite(height) || Math.abs((measuredHeights.value[widgetKey] ?? 0) - height) < 2) {
    return;
  }
  measuredHeights.value = { ...measuredHeights.value, [widgetKey]: height };
}

function handleDragStart(event: DragEvent, widgetKey: string) {
  if (!props.editable || responsiveMode.value !== "desktop") {
    event.preventDefault();
    return;
  }
  draggedWidgetKey.value = widgetKey;
  event.dataTransfer?.setData("text/plain", widgetKey);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
}

function pointerPlacement(event: DragEvent, item: WorkbenchLayoutItem) {
  const grid = gridElement.value;
  if (!grid) return null;
  const bounds = grid.getBoundingClientRect();
  const columnWidth = (bounds.width - GRID_GAP * (columnCount.value - 1)) / columnCount.value;
  const rawColumn = Math.floor((event.clientX - bounds.left) / (columnWidth + GRID_GAP));
  const x = Math.max(0, Math.min(columnCount.value - item.w, rawColumn));
  const offsetY = Math.max(0, event.clientY - bounds.top);
  let cursor = 0;
  let y = rowHeights.value.length;
  for (let row = 0; row < rowHeights.value.length; row += 1) {
    const height = rowHeights.value[row] ?? EMPTY_ROW_HEIGHT;
    if (offsetY < cursor + height + GRID_GAP / 2) {
      y = row;
      break;
    }
    cursor += height + GRID_GAP;
  }
  return { ...item, x, y };
}

function handleGridDragOver(event: DragEvent) {
  if (!draggedWidgetKey.value || responsiveMode.value !== "desktop") return;
  const item = props.items.find((entry) => entry.widgetKey === draggedWidgetKey.value);
  if (!item) return;
  dropPreview.value = pointerPlacement(event, item);
  if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
}

function handleGridDrop(event: DragEvent) {
  const dragged = props.items.find((item) => item.widgetKey === draggedWidgetKey.value);
  const preview = dropPreview.value ?? (dragged ? pointerPlacement(event, dragged) : null);
  if (draggedWidgetKey.value && preview) {
    emit("move", draggedWidgetKey.value, preview.x, preview.y);
  }
  resetDragState();
}

function resetDragState() {
  draggedWidgetKey.value = "";
  dropPreview.value = null;
}

function startWidthResize(event: PointerEvent, item: WorkbenchLayoutItem) {
  const definition = workbenchStore.definitionFor(item.widgetKey);
  if (!definition) return;
  event.preventDefault();
  event.stopPropagation();
  widthResizeState.value = {
    widgetKey: item.widgetKey,
    startClientX: event.clientX,
    startWidth: item.w,
    previewWidth: item.w,
    minWidth: definition.minSize.w,
    maxWidth: Math.min(definition.maxSize.w, WORKBENCH_GRID_COLUMNS - item.x),
  };
  window.addEventListener("pointermove", handleWidthResize);
  window.addEventListener("pointerup", finishWidthResize, { once: true });
}

function handleWidthResize(event: PointerEvent) {
  const state = widthResizeState.value;
  const grid = gridElement.value;
  if (!state || !grid) return;
  const columnWidth = (grid.clientWidth - GRID_GAP * (WORKBENCH_GRID_COLUMNS - 1)) /
    WORKBENCH_GRID_COLUMNS;
  const delta = Math.round((event.clientX - state.startClientX) / (columnWidth + GRID_GAP));
  state.previewWidth = Math.max(
    state.minWidth,
    Math.min(state.maxWidth, state.startWidth + delta),
  );
}

function finishWidthResize() {
  const state = widthResizeState.value;
  window.removeEventListener("pointermove", handleWidthResize);
  if (state && state.previewWidth !== state.startWidth) {
    emit("widthChange", state.widgetKey, state.previewWidth);
  }
  widthResizeState.value = null;
}

onMounted(() => {
  if (!gridElement.value) return;
  gridResizeObserver = new ResizeObserver(([entry]) => {
    containerWidth.value = entry?.contentRect.width ?? gridElement.value?.clientWidth ?? 0;
  });
  gridResizeObserver.observe(gridElement.value);
  containerWidth.value = gridElement.value.clientWidth;
});

onBeforeUnmount(() => {
  gridResizeObserver?.disconnect();
  window.removeEventListener("pointermove", handleWidthResize);
  window.removeEventListener("pointerup", finishWidthResize);
});
</script>

<style scoped>
.workbench-grid {
  --classic-grid-gap: 12px;
  position: relative;
  display: grid;
  min-height: 120px;
  align-items: stretch;
  gap: var(--classic-grid-gap);
  transition: grid-template-rows 180ms ease;
}

.classic-grid-item {
  position: relative;
  min-width: 0;
  min-height: 0;
  transition: opacity 160ms ease, transform 160ms ease;
}

.grid-stack-item-content {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.classic-grid-item.is-being-dragged {
  opacity: 0.28;
}

.workbench-grid.is-editing {
  padding: var(--spacing-8);
  background-color: color-mix(in srgb, var(--color-primary-light) 26%, transparent);
  background-image: linear-gradient(
    to right,
    color-mix(in srgb, var(--color-primary) 7%, transparent) 1px,
    transparent 1px
  );
  background-size: calc(100% / 12) 100%;
  border: 1px solid color-mix(in srgb, var(--color-primary-line) 45%, transparent);
  border-radius: var(--radius-lg);
}

.classic-drop-placeholder {
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 96px;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  background: color-mix(in srgb, var(--color-primary-light) 82%, var(--color-white));
  border: 1px dashed var(--color-primary-line);
  border-radius: var(--radius-lg);
  pointer-events: none;
}

.classic-width-handle {
  position: absolute;
  z-index: 5;
  top: 50%;
  right: -6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 52px;
  padding: 0;
  background: transparent;
  border: 0;
  transform: translateY(-50%);
  cursor: ew-resize;
}

.classic-width-handle span {
  width: 4px;
  height: 28px;
  background: var(--color-white);
  border: 1px solid var(--color-primary-line);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-sm);
  transition: height 160ms ease, background-color 160ms ease;
}

.classic-width-handle:hover span,
.classic-grid-item.is-width-resizing .classic-width-handle span {
  height: 36px;
  background: var(--color-primary-light);
}

.width-resize-label {
  position: absolute;
  z-index: 6;
  right: var(--spacing-12);
  bottom: var(--spacing-12);
  padding: var(--spacing-4) var(--spacing-8);
  color: var(--color-white);
  font-size: var(--font-size-xs);
  line-height: 20px;
  background: color-mix(in srgb, var(--color-title) 88%, transparent);
  border-radius: var(--radius-md);
  pointer-events: none;
}

.workbench-grid.mode-medium,
.workbench-grid.mode-mobile {
  background-image: none;
}

@media (prefers-reduced-motion: reduce) {
  .workbench-grid,
  .classic-grid-item {
    transition: none;
  }
}
</style>
