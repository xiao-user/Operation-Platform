<template>
  <article
    class="workbench-widget"
    :class="[
      `tone-${definition?.tone ?? 'neutral'}`,
      {
        'is-editing': editable,
        'is-simple': layoutMode === 'simple',
        'is-simple-flow': simpleLayoutType === 'flow',
      },
    ]"
  >
    <header class="widget-header">
      <div
        class="widget-title-block"
        :class="{ 'widget-drag-handle': editable }"
        :draggable="editable && layoutMode === 'simple'"
      >
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
            <el-dropdown-menu v-if="layoutMode === 'simple' && simpleLayoutType === 'columns'">
              <el-dropdown-item command="move-backward">向前移动</el-dropdown-item>
              <el-dropdown-item command="move-forward">向后移动</el-dropdown-item>
              <el-dropdown-item divided command="move-primary">移到主列</el-dropdown-item>
              <el-dropdown-item command="move-secondary">移到辅列</el-dropdown-item>
              <el-dropdown-item divided command="hide">隐藏组件</el-dropdown-item>
            </el-dropdown-menu>
            <el-dropdown-menu v-else-if="layoutMode === 'simple'">
              <el-dropdown-item command="move-backward">向前移动</el-dropdown-item>
              <el-dropdown-item command="move-forward">向后移动</el-dropdown-item>
              <el-dropdown-item divided command="span-3">半行 · 双列</el-dropdown-item>
              <el-dropdown-item command="span-6">整行 · 单列</el-dropdown-item>
              <el-dropdown-item divided command="hide">隐藏组件</el-dropdown-item>
            </el-dropdown-menu>
            <el-dropdown-menu v-else>
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
        <el-button link type="primary" @click="retryLoadData">重新加载</el-button>
      </div>
      <WorkbenchWidgetContent
        v-else-if="data"
        :data="data"
        :calendar-context="calendarContext"
      />
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { MoreFilled, Rank, Setting } from "@element-plus/icons-vue";
import WorkbenchWidgetContent from "@/features/workbench/components/WorkbenchWidgetContent.vue";
import type {
  SimpleWorkbenchLayoutType,
  WorkbenchLayoutMode,
  WorkbenchWidgetAction,
  WorkbenchWidgetData,
  WorkbenchWidgetItem,
} from "@/features/workbench/types";
import { useWorkbenchStore } from "@/stores/workbench";

const props = defineProps<{
  item: WorkbenchWidgetItem;
  editable: boolean;
  layoutMode?: WorkbenchLayoutMode;
  simpleLayoutType?: SimpleWorkbenchLayoutType;
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
const calendarContext = computed(() => workbenchStore.context ? {
  tenant: { ...workbenchStore.context.tenant },
  userId: workbenchStore.context.userId,
  profile: workbenchStore.context.profile,
} : undefined);
const hasSettings = computed(() => props.item.settings.kind !== "none");
let loadRequestId = 0;

async function loadData(force = false) {
  const requestId = ++loadRequestId;
  loading.value = true;
  errorMessage.value = "";
  try {
    const nextData = await workbenchStore.loadWidgetData(props.item, { force });
    if (requestId !== loadRequestId) return;
    data.value = nextData;
  } catch (error) {
    if (requestId !== loadRequestId) return;
    errorMessage.value = error instanceof Error ? error.message : "组件数据加载失败";
  } finally {
    if (requestId === loadRequestId) loading.value = false;
  }
}

function retryLoadData() {
  void loadData(true);
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
  () => void loadData(),
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
  transition: border-color 160ms ease, background-color 160ms ease;
}

.workbench-widget.is-editing {
  background: color-mix(in srgb, var(--color-primary-light) 18%, var(--color-white));
  border-color: var(--color-primary-line-light);
}

.workbench-widget.is-simple {
  height: auto;
}

.workbench-widget.is-simple-flow {
  height: 100%;
}

.workbench-widget.is-simple .widget-body {
  overflow: visible;
}

.widget-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  min-height: 44px;
  gap: var(--spacing-12);
  padding: var(--spacing-16) var(--spacing-20) 0;
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
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-lg);
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
  container-type: inline-size;
  flex: 1;
  min-height: 0;
  padding: var(--spacing-12) var(--spacing-20) var(--spacing-20);
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
