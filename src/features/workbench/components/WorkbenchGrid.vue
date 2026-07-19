<template>
  <div
    ref="gridElement"
    class="grid-stack workbench-grid"
    :class="{ 'is-editing': editable }"
  >
    <div
      v-for="item in items"
      :key="item.widgetKey"
      class="grid-stack-item"
      :gs-id="item.widgetKey"
      :gs-x="item.x"
      :gs-y="item.y"
      :gs-w="item.w"
      :gs-h="item.h"
      :gs-min-w="definitionFor(item.widgetKey)?.minSize.w"
      :gs-min-h="definitionFor(item.widgetKey)?.minSize.h"
      :gs-max-w="definitionFor(item.widgetKey)?.maxSize.w"
      :gs-max-h="definitionFor(item.widgetKey)?.maxSize.h"
      :data-widget-key="item.widgetKey"
    >
      <div class="grid-stack-item-content">
        <WorkbenchWidgetCard
          :item="item"
          :editable="editable"
          @action="(action) => emit('widgetAction', item.widgetKey, action)"
          @open-settings="emit('openSettings', item.widgetKey)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { GridStack, type GridStackNode } from "gridstack";
import "gridstack/dist/gridstack.min.css";
import WorkbenchWidgetCard from "@/features/workbench/components/WorkbenchWidgetCard.vue";
import {
  MEDIUM_WORKBENCH_COLUMNS,
  projectWorkbenchItemsToMediumGrid,
} from "@/features/workbench/workbench-responsive-layout";
import type {
  WorkbenchLayoutItem,
  WorkbenchWidgetDefinition,
  WorkbenchWidgetAction,
} from "@/features/workbench/types";
import { useWorkbenchStore } from "@/stores/workbench";

const props = defineProps<{
  items: WorkbenchLayoutItem[];
  editable: boolean;
}>();

const emit = defineEmits<{
  positionsChange: [changes: Array<Pick<WorkbenchLayoutItem, "widgetKey" | "x" | "y" | "w" | "h">>];
  widgetAction: [widgetKey: string, action: WorkbenchWidgetAction];
  openSettings: [widgetKey: string];
}>();

const workbenchStore = useWorkbenchStore();
const gridElement = ref<HTMLElement | null>(null);
let grid: GridStack | null = null;
let gridResizeObserver: ResizeObserver | null = null;
let gridResizeFrame = 0;
let appliedResponsiveColumn = 0;

function definitionFor(widgetKey: string): WorkbenchWidgetDefinition | null {
  return workbenchStore.definitionFor(widgetKey);
}

function emitChanges(nodes: GridStackNode[] = []) {
  if (!props.editable) return;
  const changes = nodes.flatMap((node) => {
    if (!node.id) return [];
    return [{
      widgetKey: node.id,
      x: node.x ?? 0,
      y: node.y ?? 0,
      w: node.w ?? 1,
      h: node.h ?? 1,
    }];
  });
  if (changes.length) emit("positionsChange", changes);
}

async function initializeGrid() {
  await nextTick();
  if (!gridElement.value) return;
  grid = GridStack.init(
    {
      column: 12,
      cellHeight: 88,
      margin: 6,
      animate: true,
      alwaysShowResizeHandle: true,
      float: false,
      disableDrag: !props.editable,
      disableResize: !props.editable,
      handle: ".widget-drag-handle",
      draggable: { handle: ".widget-drag-handle", scroll: true },
      resizable: { handles: "se" },
      columnOpts: {
        layout: "moveScale",
        breakpoints: [
          { w: 1199, c: 6, layout: "compact" },
          { w: 767, c: 1, layout: "list" },
        ],
      },
    },
    gridElement.value,
  );
  grid.on("change", (_event, nodes) => emitChanges(nodes));
  gridResizeObserver = new ResizeObserver(() => {
    cancelAnimationFrame(gridResizeFrame);
    gridResizeFrame = requestAnimationFrame(applyResponsiveLayout);
  });
  gridResizeObserver.observe(gridElement.value);
  applyResponsiveLayout();
}

function applyResponsiveLayout() {
  if (!grid || !gridElement.value) return;
  grid.setAnimation(false);
  grid.onResize(gridElement.value.clientWidth);
  const column = grid.getColumn();
  if (column === appliedResponsiveColumn) {
    grid.setAnimation(true);
    return;
  }
  appliedResponsiveColumn = column;
  const isMediumLayout = column === MEDIUM_WORKBENCH_COLUMNS;
  grid.float(isMediumLayout);
  if (isMediumLayout) {
    const projected = projectWorkbenchItemsToMediumGrid(props.items).map((item) => ({
      id: item.widgetKey,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
    }));
    grid.load(projected, false);
  }
  requestAnimationFrame(() => grid?.setAnimation(true));
}

function destroyGrid() {
  gridResizeObserver?.disconnect();
  gridResizeObserver = null;
  cancelAnimationFrame(gridResizeFrame);
  appliedResponsiveColumn = 0;
  grid?.offAll();
  grid?.destroy(false);
  grid = null;
}

watch(
  () => props.editable,
  (editable) => {
    grid?.enableMove(editable);
    grid?.enableResize(editable);
  },
);

onMounted(initializeGrid);
onBeforeUnmount(destroyGrid);
</script>

<style scoped>
.workbench-grid {
  min-height: 120px;
  --workbench-grid-inset: 6px;
  margin: calc(-1 * var(--workbench-grid-inset));
}

.grid-stack-item-content {
  inset: var(--workbench-grid-inset);
  overflow: visible;
  background: transparent;
}

.workbench-grid.is-editing {
  background-image: linear-gradient(
    to right,
    color-mix(in srgb, var(--color-primary) 5%, transparent) 1px,
    transparent 1px
  );
  background-size: calc(100% / 12) 100%;
  border-radius: var(--radius-lg);
}

.workbench-grid :deep(.grid-stack-placeholder > .placeholder-content) {
  background: var(--color-primary-light);
  border: 1px dashed var(--color-primary-line);
  border-radius: var(--radius-lg);
}

.workbench-grid :deep(.ui-resizable-se) {
  right: calc(var(--workbench-grid-inset) + 2px);
  bottom: calc(var(--workbench-grid-inset) + 2px);
  width: 18px;
  height: 18px;
  opacity: 0.72;
}

@media (prefers-reduced-motion: reduce) {
  .workbench-grid :deep(.grid-stack-item) {
    transition: none !important;
  }
}
</style>
