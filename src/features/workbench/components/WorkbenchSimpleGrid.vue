<template>
  <div v-if="layoutType === 'flow'" class="simple-flow-grid" :class="{ 'is-editing': editable }">
    <template v-for="item in orderedItems" :key="item.widgetKey">
      <WorkbenchDropPlaceholder
        v-if="showPlaceholder(item.widgetKey, 'before')"
        variant="flow"
        :span="draggedItem?.span ?? 3"
        :height="placeholderHeight"
        @dragover.prevent.stop
        @drop.prevent.stop="handlePlaceholderDrop"
      />
      <article
        class="simple-grid-item flow-item"
        :class="dragStateClass(item.widgetKey)"
        :data-widget-key="item.widgetKey"
        :data-widget-span="item.span"
        @dragstart="handleDragStart($event, item.widgetKey)"
        @dragover.prevent="handleItemDragOver($event, item.widgetKey, item.column)"
        @drop.prevent="handleDrop(item.widgetKey, item.column, dropPlacement)"
        @dragend="resetDragState"
      >
        <WorkbenchWidgetCard
          :item="item"
          :editable="editable"
          layout-mode="simple"
          simple-layout-type="flow"
          @action="(action) => emit('widgetAction', item.widgetKey, action)"
          @open-settings="emit('openSettings', item.widgetKey)"
        />
      </article>
      <WorkbenchDropPlaceholder
        v-if="showPlaceholder(item.widgetKey, 'after')"
        variant="flow"
        :span="draggedItem?.span ?? 3"
        :height="placeholderHeight"
        @dragover.prevent.stop
        @drop.prevent.stop="handlePlaceholderDrop"
      />
    </template>
  </div>

  <div
    v-else
    class="simple-columns-grid"
    :class="[`ratio-${columnRatio.replace(':', '-')}`, { 'is-editing': editable }]"
  >
    <section
      v-for="column in columns"
      :key="column.key"
      class="simple-column"
      :class="{ 'is-column-target': dropTargetColumn === column.key && !dropTargetKey }"
      :aria-label="column.label"
    >
      <div class="column-heading">
        <span>{{ column.label }}</span>
        <small>{{ itemsByColumn[column.key].length }} 个组件</small>
      </div>
      <template v-for="item in itemsByColumn[column.key]" :key="item.widgetKey">
        <WorkbenchDropPlaceholder
          v-if="showPlaceholder(item.widgetKey, 'before', column.key)"
          variant="column"
          :height="placeholderHeight"
          @dragover.prevent.stop
          @drop.prevent.stop="handlePlaceholderDrop"
        />
        <article
          class="simple-grid-item column-item"
          :class="dragStateClass(item.widgetKey)"
          :data-widget-key="item.widgetKey"
          :data-widget-column="item.column"
          @dragstart="handleDragStart($event, item.widgetKey)"
          @dragover.stop.prevent="handleItemDragOver($event, item.widgetKey, column.key)"
          @drop.stop.prevent="handleDrop(item.widgetKey, column.key, dropPlacement)"
          @dragend="resetDragState"
        >
          <WorkbenchWidgetCard
            :item="item"
            :editable="editable"
            layout-mode="simple"
            simple-layout-type="columns"
            @action="(action) => emit('widgetAction', item.widgetKey, action)"
            @open-settings="emit('openSettings', item.widgetKey)"
          />
        </article>
        <WorkbenchDropPlaceholder
          v-if="showPlaceholder(item.widgetKey, 'after', column.key)"
          variant="column"
          :height="placeholderHeight"
          @dragover.prevent.stop
          @drop.prevent.stop="handlePlaceholderDrop"
        />
      </template>
      <div
        v-if="editable"
        class="column-tail-drop"
        :class="{ 'is-active': dropTargetColumn === column.key && dropPlacement === 'end' }"
        @dragover.stop.prevent="handleTailDragOver(column.key)"
        @drop.stop.prevent="handleDrop('', column.key, 'end')"
      >
        <WorkbenchDropPlaceholder
          v-if="dropTargetColumn === column.key && dropPlacement === 'end'"
          variant="column"
          :height="placeholderHeight"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import WorkbenchDropPlaceholder from "@/features/workbench/components/WorkbenchDropPlaceholder.vue";
import WorkbenchWidgetCard from "@/features/workbench/components/WorkbenchWidgetCard.vue";
import type {
  SimpleWorkbenchColumn,
  SimpleWorkbenchColumnRatio,
  SimpleWorkbenchDropPlacement,
  SimpleWorkbenchLayoutItem,
  SimpleWorkbenchLayoutType,
  WorkbenchWidgetAction,
} from "@/features/workbench/types";

const props = defineProps<{
  items: SimpleWorkbenchLayoutItem[];
  editable: boolean;
  layoutType: SimpleWorkbenchLayoutType;
  columnRatio: SimpleWorkbenchColumnRatio;
}>();

const emit = defineEmits<{
  reorder: [
    widgetKey: string,
    targetWidgetKey: string,
    targetColumn: SimpleWorkbenchColumn,
    placement: SimpleWorkbenchDropPlacement,
  ];
  widgetAction: [widgetKey: string, action: WorkbenchWidgetAction];
  openSettings: [widgetKey: string];
}>();

const columns: Array<{ key: SimpleWorkbenchColumn; label: string }> = [
  { key: "primary", label: "主列" },
  { key: "secondary", label: "辅列" },
];
const draggedWidgetKey = ref("");
const dropTargetKey = ref("");
const dropTargetColumn = ref<SimpleWorkbenchColumn | "">("");
const dropPlacement = ref<SimpleWorkbenchDropPlacement>("end");
const draggedHeight = ref(120);
const orderedItems = computed(() =>
  [...props.items].sort((first, second) => props.layoutType === "columns"
    ? first.columnOrder - second.columnOrder
    : first.order - second.order
  ),
);
const itemsByColumn = computed(() => ({
  primary: orderedItems.value.filter((item) => item.column === "primary"),
  secondary: orderedItems.value.filter((item) => item.column === "secondary"),
}));
const draggedItem = computed(() =>
  orderedItems.value.find((item) => item.widgetKey === draggedWidgetKey.value) ?? null,
);
const placeholderHeight = computed(() => Math.max(80, draggedHeight.value));

function dragStateClass(widgetKey: string) {
  return {
    "is-dragging": draggedWidgetKey.value === widgetKey,
  };
}

function showPlaceholder(
  widgetKey: string,
  placement: "before" | "after",
  column?: SimpleWorkbenchColumn,
) {
  return Boolean(
    draggedWidgetKey.value &&
    dropTargetKey.value === widgetKey &&
    dropPlacement.value === placement &&
    (!column || dropTargetColumn.value === column),
  );
}

function handleDragStart(event: DragEvent, widgetKey: string) {
  const target = event.target;
  if (!(target instanceof HTMLElement) || !target.closest(".widget-drag-handle")) {
    event.preventDefault();
    return;
  }
  draggedWidgetKey.value = widgetKey;
  const itemElement = (event.currentTarget as HTMLElement | null)?.closest(".simple-grid-item");
  draggedHeight.value = Math.round(itemElement?.getBoundingClientRect().height ?? 120);
  event.dataTransfer?.setData("text/plain", widgetKey);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
}

function handleItemDragOver(
  event: DragEvent,
  widgetKey: string,
  column: SimpleWorkbenchColumn,
) {
  if (!draggedWidgetKey.value || draggedWidgetKey.value === widgetKey) return;
  const element = event.currentTarget as HTMLElement;
  const bounds = element.getBoundingClientRect();
  dropTargetKey.value = widgetKey;
  dropTargetColumn.value = column;
  dropPlacement.value = event.clientY < bounds.top + bounds.height / 2 ? "before" : "after";
}

function handleTailDragOver(column: SimpleWorkbenchColumn) {
  if (!draggedWidgetKey.value) return;
  dropTargetKey.value = "";
  dropTargetColumn.value = column;
  dropPlacement.value = "end";
}

function handleDrop(
  targetWidgetKey: string,
  column: SimpleWorkbenchColumn,
  placement: SimpleWorkbenchDropPlacement,
) {
  if (draggedWidgetKey.value && draggedWidgetKey.value !== targetWidgetKey) {
    emit("reorder", draggedWidgetKey.value, targetWidgetKey, column, placement);
  }
  resetDragState();
}

function handlePlaceholderDrop() {
  if (!dropTargetColumn.value) return;
  handleDrop(dropTargetKey.value, dropTargetColumn.value, dropPlacement.value);
}

function resetDragState() {
  draggedWidgetKey.value = "";
  dropTargetKey.value = "";
  dropTargetColumn.value = "";
  dropPlacement.value = "end";
  draggedHeight.value = 120;
}
</script>

<style scoped>
.simple-flow-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-12);
}

.simple-grid-item {
  position: relative;
  min-width: 0;
  transition: opacity 160ms ease, transform 160ms ease;
}

.flow-item {
  display: flex;
  grid-column: span 1;
}

.flow-item[data-widget-span="6"] {
  grid-column: 1 / -1;
}

.flow-item :deep(.workbench-widget) {
  width: 100%;
  height: 100%;
}

.simple-columns-grid {
  display: grid;
  align-items: stretch;
  gap: var(--spacing-12);
}

.simple-columns-grid.ratio-4-2 {
  grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
}

.simple-columns-grid.ratio-6-2 {
  grid-template-columns: minmax(0, 3fr) minmax(240px, 1fr);
}

.simple-column {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 160px;
  gap: var(--spacing-12);
  border-radius: var(--radius-lg);
}

.column-tail-drop {
  display: flex;
  align-items: stretch;
  justify-content: flex-start;
  flex: 1;
  min-height: 44px;
}

.column-heading {
  display: none;
  align-items: center;
  justify-content: space-between;
  min-height: 32px;
  padding: 0 var(--spacing-4);
  color: var(--color-secondary);
  font-size: var(--font-size-xs);
}

.is-editing .column-heading {
  display: flex;
}

.column-heading small {
  color: var(--color-placeholder);
}

.drag-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  background: color-mix(in srgb, var(--color-primary-light) 72%, var(--color-white));
  border: 1px dashed var(--color-primary);
  border-radius: var(--radius-lg);
  box-shadow: inset 0 0 0 3px color-mix(in srgb, var(--color-primary) 5%, transparent);
}

.flow-placeholder {
  grid-column: span 1;
}

.flow-placeholder[data-widget-span="6"] {
  grid-column: 1 / -1;
}

.column-placeholder {
  width: 100%;
  flex: none;
}

.simple-grid-item.is-dragging {
  opacity: 0.42;
}

.simple-column.is-column-target {
  background: color-mix(in srgb, var(--color-primary-light) 45%, transparent);
  outline: 1px dashed var(--color-primary-line-light);
  outline-offset: var(--spacing-4);
}

@media (max-width: 899px) {
  .simple-columns-grid.ratio-4-2,
  .simple-columns-grid.ratio-6-2 {
    grid-template-columns: minmax(0, 1fr) minmax(220px, 0.72fr);
  }
}

@media (max-width: 767px) {
  .simple-flow-grid,
  .simple-columns-grid.ratio-4-2,
  .simple-columns-grid.ratio-6-2 {
    grid-template-columns: 1fr;
  }

  .flow-item,
  .flow-item[data-widget-span="6"] {
    grid-column: 1;
  }

  .simple-column {
    display: contents;
  }

  .column-heading {
    display: none;
  }
}
</style>
