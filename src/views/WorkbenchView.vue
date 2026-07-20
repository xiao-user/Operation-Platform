<template>
  <div class="workbench-page">
    <section v-if="!isEditing" class="workbench-actions" aria-label="工作台操作">
      <div class="workbench-version">
        <span class="version-label">{{ layoutMode === "simple" ? "新版工作台" : "经典工作台" }}</span>
        <span class="version-description">
          {{ versionDescription }}
        </span>
      </div>
      <el-button :icon="Switch" :loading="switchingMode" @click="switchVersion">
        {{ layoutMode === "simple" ? "回到经典版" : "切换为新版" }}
      </el-button>
      <el-button
        :icon="Edit"
        :disabled="!canEdit"
        @click="startEditing"
      >
        调整工作台
      </el-button>
    </section>

    <el-alert
      v-if="recoveryNotice"
      :title="recoveryNotice"
      type="warning"
      show-icon
      :closable="false"
    />

    <section v-if="isEditing" class="editor-toolbar" aria-label="工作台编辑工具栏">
      <div class="editor-summary">
        <strong>正在调整工作台</strong>
        <span>{{ editorDescription }}</span>
      </div>
      <div v-if="layoutMode === 'simple'" class="simple-layout-controls">
        <el-radio-group
          :model-value="simpleLayoutType"
          size="small"
          aria-label="新版布局方式"
          @change="changeSimpleLayoutType"
        >
          <el-radio-button value="flow">完整流式</el-radio-button>
          <el-radio-button value="columns">分两列</el-radio-button>
        </el-radio-group>
        <el-radio-group
          v-if="simpleLayoutType === 'columns'"
          :model-value="simpleColumnRatio"
          size="small"
          aria-label="双列宽度比例"
          @change="changeSimpleColumnRatio"
        >
          <el-radio-button value="4:2">4 : 2</el-radio-button>
          <el-radio-button value="6:2">6 : 2</el-radio-button>
        </el-radio-group>
      </div>
      <div class="editor-actions">
        <el-button @click="managerVisible = true">
          组件管理（显示 {{ visibleCount }}/{{ totalCount }}）
        </el-button>
        <el-button :icon="RefreshLeft" @click="restoreDefault">恢复默认</el-button>
        <el-button @click="cancelEditing">取消</el-button>
        <el-button type="primary" :disabled="!hasUnsavedChanges" @click="saveEditing">
          保存
        </el-button>
      </div>
    </section>

    <section v-if="visibleItems.length" class="workbench-canvas">
      <WorkbenchSimpleGrid
        v-if="layoutMode === 'simple'"
        :items="simpleVisibleItems"
        :editable="isEditing && canEdit"
        :layout-type="simpleLayoutType"
        :column-ratio="simpleColumnRatio"
        @reorder="handleSimpleReorder"
        @widget-action="handleWidgetAction"
        @open-settings="openSettings"
      />
      <WorkbenchGrid
        v-else
        :key="gridRenderKey"
        :items="classicVisibleItems"
        :editable="isEditing && canEdit"
        @move="handleClassicMove"
        @width-change="handleClassicWidthChange"
        @widget-action="handleWidgetAction"
        @open-settings="openSettings"
      />
    </section>

    <section v-else class="workbench-empty">
      <el-empty description="当前工作台组件均已隐藏">
        <el-button v-if="isEditing" type="primary" @click="managerVisible = true">
          打开组件管理
        </el-button>
        <el-button v-else type="primary" :disabled="!canEdit" @click="startEditing">
          调整工作台
        </el-button>
      </el-empty>
    </section>

    <p v-if="!canEdit && !isEditing" class="desktop-edit-hint">
      当前宽度下工作台自动适配为只读布局；请在桌面端调整组件。
    </p>

    <WorkbenchWidgetManager
      v-if="draftLayout"
      v-model="managerVisible"
      :items="managerItems"
      @visibility-change="handleVisibilityChange"
    />

    <WorkbenchWidgetSettingsDialog
      v-model="settingsVisible"
      :item="settingsItem"
      :definition="settingsDefinition"
      @save="saveWidgetSettings"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import { storeToRefs } from "pinia";
import { ElMessage, ElMessageBox } from "element-plus";
import { Edit, RefreshLeft, Switch } from "@element-plus/icons-vue";
import WorkbenchGrid from "@/features/workbench/components/WorkbenchGrid.vue";
import WorkbenchSimpleGrid from "@/features/workbench/components/WorkbenchSimpleGrid.vue";
import WorkbenchWidgetManager from "@/features/workbench/components/WorkbenchWidgetManager.vue";
import WorkbenchWidgetSettingsDialog from "@/features/workbench/components/WorkbenchWidgetSettingsDialog.vue";
import type {
  WorkbenchLayoutItem,
  SimpleWorkbenchLayoutItem,
  FlowWorkbenchSpan,
  SimpleWorkbenchColumn,
  SimpleWorkbenchColumnRatio,
  SimpleWorkbenchDropPlacement,
  SimpleWorkbenchLayoutType,
  WorkbenchWidgetAction,
  WorkbenchWidgetSettings,
} from "@/features/workbench/types";
import { useNavigationStore } from "@/stores/navigation";
import { useUserStore } from "@/stores/user";
import { useWorkbenchStore } from "@/stores/workbench";

const userStore = useUserStore();
const navigationStore = useNavigationStore();
const workbenchStore = useWorkbenchStore();
const { currentTenant, role, userInfo } = storeToRefs(userStore);
const { activeRoleRecord, tree } = storeToRefs(navigationStore);
const {
  draftLayout,
  visibleItems,
  visibleCount,
  totalCount,
  recoveryNotice,
  isEditing,
  hasUnsavedChanges,
  layoutMode,
} = storeToRefs(workbenchStore);

const managerVisible = ref(false);
const settingsVisible = ref(false);
const settingsWidgetKey = ref("");
const viewportWidth = ref(window.innerWidth);
const gridLayoutVersion = ref(0);
const switchingMode = ref(false);
const canEdit = computed(() => viewportWidth.value >= 1200);
const gridRenderKey = computed(() =>
  `${currentTenant.value.id}:${workbenchStore.profile}:${layoutMode.value}:${gridLayoutVersion.value}`,
);
const classicVisibleItems = computed(() =>
  visibleItems.value.filter((item): item is WorkbenchLayoutItem => "x" in item),
);
const simpleVisibleItems = computed(() =>
  visibleItems.value.filter((item): item is SimpleWorkbenchLayoutItem => "order" in item),
);
const managerItems = computed(() => {
  if (!draftLayout.value) return [];
  return draftLayout.value.mode === "simple"
    ? draftLayout.value.simpleItems
    : draftLayout.value.items;
});
const editorDescription = computed(() => layoutMode.value === "simple"
  ? simpleLayoutType.value === "flow"
    ? "每行展示一个或两个组件；双列时自动等高填满，拖动标题调整先后顺序。"
    : "主列和辅列各自从上到下排列，组件可在两列之间拖动，彼此高度互不影响。"
  : "拖动标题调整位置，左右拖动组件边缘调整宽度；高度由内容自动生成，跨行通过组件菜单设置。",
);
const simpleLayoutType = computed(() =>
  workbenchStore.activeLayout?.simpleLayoutType ?? "flow",
);
const simpleColumnRatio = computed(() =>
  workbenchStore.activeLayout?.simpleColumnRatio ?? "4:2",
);
const versionDescription = computed(() => {
  if (layoutMode.value === "classic") return "内容自适应网格";
  return simpleLayoutType.value === "flow"
    ? "完整流式 · 单/双列等高"
    : `双列瀑布 · ${simpleColumnRatio.value}`;
});

function resetGridLayout() {
  gridLayoutVersion.value += 1;
}
const settingsItem = computed(() =>
  managerItems.value.find((item) => item.widgetKey === settingsWidgetKey.value) ?? null,
);
const settingsDefinition = computed(() =>
  settingsItem.value ? workbenchStore.definitionFor(settingsItem.value.widgetKey) : null,
);

function loadWorkbench() {
  if (navigationStore.currentTenant?.id !== currentTenant.value.id) {
    navigationStore.loadTenant(currentTenant.value);
  }
  workbenchStore.load(
    currentTenant.value,
    userInfo.value.id,
    role.value,
    navigationStore.tree,
    {
      name: userInfo.value.name,
      initials: userInfo.value.initials,
      account: userInfo.value.email ?? userInfo.value.id,
      roleName: activeRoleRecord.value?.name ?? "暂无角色",
    },
  );
  resetGridLayout();
}

watch(
  () => [
    currentTenant.value.id,
    userInfo.value.id,
    userInfo.value.name,
    userInfo.value.initials,
    userInfo.value.email,
    role.value,
    activeRoleRecord.value?.id,
    activeRoleRecord.value?.name,
  ] as const,
  loadWorkbench,
  { immediate: true },
);

watch(
  tree,
  (nextTree) => workbenchStore.updateQuickLinks(nextTree),
  { deep: true },
);

watch(canEdit, (editable) => {
  if (!editable && isEditing.value) {
    workbenchStore.cancelEditing();
    managerVisible.value = false;
    settingsVisible.value = false;
    resetGridLayout();
    ElMessage.warning("窗口宽度不足，已退出工作台编辑模式");
  }
});

function startEditing() {
  if (!canEdit.value) return;
  workbenchStore.beginEditing();
}

async function switchVersion() {
  switchingMode.value = true;
  try {
    await workbenchStore.switchLayoutMode(layoutMode.value === "simple" ? "classic" : "simple");
    resetGridLayout();
    ElMessage.success(layoutMode.value === "simple" ? "已切换为新版工作台" : "已回到经典工作台");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "工作台版本切换失败");
  } finally {
    switchingMode.value = false;
  }
}

async function cancelEditing() {
  if (hasUnsavedChanges.value) {
    try {
      await ElMessageBox.confirm("尚未保存的工作台调整将被放弃。", "取消调整", {
        type: "warning",
        confirmButtonText: "放弃修改",
        cancelButtonText: "继续调整",
      });
    } catch {
      return;
    }
  }
  workbenchStore.cancelEditing();
  managerVisible.value = false;
  settingsVisible.value = false;
  resetGridLayout();
}

async function saveEditing() {
  try {
    await workbenchStore.saveEditing();
    managerVisible.value = false;
    settingsVisible.value = false;
    ElMessage.success("工作台布局已保存");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "工作台布局保存失败");
  }
}

async function restoreDefault() {
  try {
    await ElMessageBox.confirm(
      layoutMode.value === "simple"
        ? "将恢复新版工作台的默认布局方式、组件显隐、顺序、分列及宽度，保存后生效。"
        : "将恢复经典工作台的默认组件显隐、位置、宽度、跨行及设置，保存后生效。",
      "恢复默认工作台",
      {
        type: "warning",
        confirmButtonText: "恢复默认",
        cancelButtonText: "取消",
      },
    );
  } catch {
    return;
  }
  workbenchStore.restoreDefaultDraft();
  resetGridLayout();
  ElMessage.success("已恢复默认草稿，请保存后生效");
}

function handleClassicMove(widgetKey: string, x: number, y: number) {
  workbenchStore.placeClassicWidget(widgetKey, x, y);
}

function handleClassicWidthChange(widgetKey: string, width: number) {
  workbenchStore.resizeClassicWidgetWidth(widgetKey, width);
}

function handleVisibilityChange(widgetKey: string, visible: boolean) {
  workbenchStore.setVisible(widgetKey, visible);
  resetGridLayout();
}

function openSettings(widgetKey: string) {
  settingsWidgetKey.value = widgetKey;
  settingsVisible.value = true;
}

function saveWidgetSettings(settings: WorkbenchWidgetSettings) {
  if (!settingsWidgetKey.value) return;
  workbenchStore.updateSettings(settingsWidgetKey.value, settings);
  ElMessage.success("组件设置已更新");
}

function handleWidgetAction(widgetKey: string, action: WorkbenchWidgetAction) {
  switch (action) {
    case "hide":
      handleVisibilityChange(widgetKey, false);
      return;
    case "move-backward":
    case "move-forward":
      if (!workbenchStore.moveSimpleWidget(widgetKey, action === "move-backward" ? -1 : 1)) {
        ElMessage.warning(action === "move-backward" ? "已经是第一个组件" : "已经是最后一个组件");
      }
      return;
    case "move-primary":
    case "move-secondary":
      if (!workbenchStore.moveSimpleWidgetToColumn(
        widgetKey,
        action === "move-primary" ? "primary" : "secondary",
      )) {
        ElMessage.warning(action === "move-primary" ? "组件已在主列" : "组件已在辅列");
      }
      return;
    case "span-3":
    case "span-6":
      workbenchStore.resizeSimpleWidget(widgetKey, Number(action.slice(5)) as FlowWorkbenchSpan);
      return;
    case "row-span-1":
    case "row-span-2":
    case "row-span-3":
    case "row-span-4":
      workbenchStore.setClassicRowSpan(widgetKey, Number(action.slice(-1)));
      return;
    case "move-left":
    case "move-right":
    case "move-up":
    case "move-down": {
      const move = {
        "move-left": [-1, 0],
        "move-right": [1, 0],
        "move-up": [0, -1],
        "move-down": [0, 1],
      }[action] as [number, number];
      if (!workbenchStore.moveWidget(widgetKey, move[0], move[1])) {
        ElMessage.warning("目标位置不可用");
        return;
      }
      resetGridLayout();
      return;
    }
    case "size-small":
      if (workbenchStore.resizeWidget(widgetKey, "small")) resetGridLayout();
      return;
    case "size-medium":
      if (workbenchStore.resizeWidget(widgetKey, "medium")) resetGridLayout();
      return;
    case "size-large":
      if (workbenchStore.resizeWidget(widgetKey, "large")) resetGridLayout();
  }
}

function handleSimpleReorder(
  widgetKey: string,
  targetWidgetKey: string,
  targetColumn: SimpleWorkbenchColumn,
  placement: SimpleWorkbenchDropPlacement,
) {
  workbenchStore.reorderSimpleWidget(
    widgetKey,
    targetWidgetKey,
    targetColumn,
    placement,
    simpleLayoutType.value === "flow",
  );
}

function changeSimpleLayoutType(value: string | number | boolean | undefined) {
  workbenchStore.setSimpleLayoutType(value as SimpleWorkbenchLayoutType);
}

function changeSimpleColumnRatio(value: string | number | boolean | undefined) {
  workbenchStore.setSimpleColumnRatio(value as SimpleWorkbenchColumnRatio);
}

function updateViewportWidth() {
  viewportWidth.value = window.innerWidth;
}

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!hasUnsavedChanges.value) return;
  event.preventDefault();
  event.returnValue = "";
}

onBeforeRouteLeave(async () => {
  if (!hasUnsavedChanges.value) return true;
  try {
    await ElMessageBox.confirm("离开后尚未保存的工作台调整将丢失。", "离开工作台", {
      type: "warning",
      confirmButtonText: "离开",
      cancelButtonText: "继续调整",
    });
    workbenchStore.cancelEditing();
    return true;
  } catch {
    return false;
  }
});

onMounted(() => {
  window.addEventListener("resize", updateViewportWidth);
  window.addEventListener("beforeunload", handleBeforeUnload);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateViewportWidth);
  window.removeEventListener("beforeunload", handleBeforeUnload);
});
</script>

<style scoped>
.workbench-page {
  width: min(100%, 1440px);
  min-height: 100%;
  margin: 0 auto;
}

.workbench-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-8);
  margin-bottom: var(--spacing-12);
}

.workbench-version {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-8);
  margin-right: auto;
}

.version-label {
  color: var(--color-title);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.version-description {
  color: var(--color-secondary);
  font-size: var(--font-size-xs);
}

.editor-toolbar {
  position: sticky;
  top: 0;
  z-index: 8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-24);
  min-height: 64px;
  padding: var(--spacing-12) var(--spacing-16);
  margin: var(--spacing-16) 0;
  background: color-mix(in srgb, var(--color-white) 94%, transparent);
  border: 1px solid var(--color-primary-line-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-m);
  backdrop-filter: blur(10px);
}

.editor-summary {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.simple-layout-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-8);
  margin-left: auto;
}

.editor-summary strong {
  color: var(--color-title);
  font-size: var(--font-size-md);
}

.editor-summary span {
  color: var(--color-secondary);
  font-size: var(--font-size-sm);
}

.editor-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-8);
}

.workbench-canvas {
  min-height: 300px;
}

.workbench-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 420px;
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.desktop-edit-hint {
  margin: var(--spacing-12) 0 0;
  color: var(--color-secondary);
  font-size: var(--font-size-xs);
  text-align: center;
}

@media (max-width: 1199px) {
  .workbench-actions {
    flex-wrap: wrap;
    margin-bottom: var(--spacing-8);
  }
}

@media (max-width: 1399px) {
  .editor-toolbar {
    flex-wrap: wrap;
  }

  .simple-layout-controls {
    order: 3;
    width: 100%;
    margin-left: 0;
  }
}

@media (max-width: 767px) {
  .workbench-version {
    width: 100%;
  }
}
</style>
