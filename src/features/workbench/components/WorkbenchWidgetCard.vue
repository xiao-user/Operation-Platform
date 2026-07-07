<template>
  <article
    class="workbench-widget"
    :class="[`tone-${definition?.tone ?? 'neutral'}`, { 'is-editing': editable }]"
  >
    <header class="widget-header">
      <div class="widget-title-block" :class="{ 'widget-drag-handle': editable }">
        <span v-if="editable" class="drag-indicator" aria-hidden="true">
          <el-icon><Rank /></el-icon>
        </span>
        <div>
          <h2>{{ definition?.title ?? "工作台组件" }}</h2>
          <p v-if="editable">{{ definition?.description }}</p>
        </div>
      </div>

      <div v-if="editable" class="widget-actions">
        <el-button
          v-if="hasSettings"
          text
          circle
          aria-label="组件设置"
          @click="emit('openSettings')"
        >
          <el-icon><Setting /></el-icon>
        </el-button>
        <el-dropdown trigger="click" @command="handleCommand">
          <el-button text circle aria-label="组件操作">
            <el-icon><MoreFilled /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="move-left">向左移动</el-dropdown-item>
              <el-dropdown-item command="move-right">向右移动</el-dropdown-item>
              <el-dropdown-item command="move-up">向上移动</el-dropdown-item>
              <el-dropdown-item command="move-down">向下移动</el-dropdown-item>
              <el-dropdown-item divided command="size-small">小尺寸</el-dropdown-item>
              <el-dropdown-item command="size-medium">中尺寸</el-dropdown-item>
              <el-dropdown-item command="size-large">大尺寸</el-dropdown-item>
              <el-dropdown-item divided command="hide">隐藏组件</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <div class="widget-body">
      <el-skeleton v-if="loading" :rows="3" animated />
      <div v-else-if="errorMessage" class="widget-error">
        <span>{{ errorMessage }}</span>
        <el-button link type="primary" @click="loadData">重新加载</el-button>
      </div>
      <WorkbenchWidgetContent v-else-if="data" :data="data" />
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { MoreFilled, Rank, Setting } from "@element-plus/icons-vue";
import WorkbenchWidgetContent from "@/features/workbench/components/WorkbenchWidgetContent.vue";
import type { WorkbenchWidgetAction } from "@/features/workbench/components/WorkbenchGrid.vue";
import type { WorkbenchLayoutItem, WorkbenchWidgetData } from "@/features/workbench/types";
import { useWorkbenchStore } from "@/stores/workbench";

const props = defineProps<{
  item: WorkbenchLayoutItem;
  editable: boolean;
}>();

const emit = defineEmits<{
  action: [action: WorkbenchWidgetAction];
  openSettings: [];
}>();

const workbenchStore = useWorkbenchStore();
const loading = ref(true);
const errorMessage = ref("");
const data = ref<WorkbenchWidgetData | null>(null);
const definition = computed(() => workbenchStore.definitionFor(props.item.widgetKey));
const hasSettings = computed(() => props.item.settings.kind !== "none");

async function loadData() {
  loading.value = true;
  errorMessage.value = "";
  try {
    data.value = await workbenchStore.loadWidgetData(props.item);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "组件数据加载失败";
  } finally {
    loading.value = false;
  }
}

function handleCommand(command: WorkbenchWidgetAction) {
  emit("action", command);
}

watch(
  () => [
    props.item.widgetKey,
    JSON.stringify(props.item.settings),
    workbenchStore.context?.tenant.id,
    JSON.stringify(workbenchStore.quickLinks),
  ],
  loadData,
  { immediate: true },
);
</script>

<style scoped>
.workbench-widget {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-s);
}

.workbench-widget::before {
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
  content: "";
  background: var(--widget-accent, var(--color-border-strong));
  opacity: 0.75;
}

.workbench-widget.tone-primary { --widget-accent: var(--color-primary); }
.workbench-widget.tone-success { --widget-accent: var(--color-success-dark-text); }
.workbench-widget.tone-warning { --widget-accent: var(--color-warning); }
.workbench-widget.tone-danger { --widget-accent: var(--color-error); }
.workbench-widget.tone-neutral { --widget-accent: var(--color-secondary); }

.workbench-widget.is-editing {
  border-color: var(--color-primary-line-light);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-primary) 8%, transparent);
}

.widget-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  min-height: 44px;
  gap: var(--spacing-12);
  padding: var(--spacing-14) var(--spacing-16) 0 var(--spacing-20);
}

.widget-title-block {
  display: flex;
  align-items: flex-start;
  min-width: 0;
  gap: var(--spacing-8);
}

.widget-title-block.widget-drag-handle {
  cursor: grab;
}

.widget-title-block.widget-drag-handle:active {
  cursor: grabbing;
}

.widget-title-block h2 {
  margin: 0;
  color: var(--color-title);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-md);
}

.widget-title-block p {
  display: -webkit-box;
  margin: var(--spacing-2) 0 0;
  overflow: hidden;
  color: var(--color-secondary);
  font-size: var(--font-size-xs);
  line-height: var(--line-height-xs);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.drag-indicator {
  display: inline-flex;
  margin-top: 1px;
  color: var(--color-secondary);
}

.widget-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-top: -8px;
  margin-right: -8px;
}

.widget-body {
  flex: 1;
  min-height: 0;
  padding: var(--spacing-10) var(--spacing-16) var(--spacing-16) var(--spacing-20);
  overflow: auto;
}

.widget-error {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  height: 100%;
  gap: var(--spacing-8);
  color: var(--color-secondary);
  font-size: var(--font-size-sm);
}
</style>
