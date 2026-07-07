<template>
  <div class="workbench-page">
    <section v-if="!isEditing" class="workbench-actions" aria-label="工作台操作">
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
        <span>拖动标题调整位置，拖动右下角调整大小。</span>
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
      <WorkbenchGrid
        :key="gridRenderKey"
        :items="visibleItems"
        :editable="isEditing && canEdit"
        @positions-change="handlePositionsChange"
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
      :items="draftLayout.items"
      @visibility-change="handleVisibilityChange"
    />

    <WorkbenchWidgetSettingsDialog
      v-model="settingsVisible"
      :item="settingsItem"
      :definition="settingsDefinition"
      :quick-links="quickLinks"
      @save="saveWidgetSettings"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import { storeToRefs } from "pinia";
import { ElMessage, ElMessageBox } from "element-plus";
import { Edit, RefreshLeft } from "@element-plus/icons-vue";
import WorkbenchGrid, {
  type WorkbenchWidgetAction,
} from "@/features/workbench/components/WorkbenchGrid.vue";
import WorkbenchWidgetManager from "@/features/workbench/components/WorkbenchWidgetManager.vue";
import WorkbenchWidgetSettingsDialog from "@/features/workbench/components/WorkbenchWidgetSettingsDialog.vue";
import type {
  WorkbenchLayoutItem,
  WorkbenchWidgetSettings,
  WorkbenchWidgetSizePreset,
} from "@/features/workbench/types";
import { useNavigationStore } from "@/stores/navigation";
import { useUserStore } from "@/stores/user";
import { useWorkbenchStore } from "@/stores/workbench";

const userStore = useUserStore();
const navigationStore = useNavigationStore();
const workbenchStore = useWorkbenchStore();
const { currentTenant, role, userInfo } = storeToRefs(userStore);
const { tree } = storeToRefs(navigationStore);
const {
  draftLayout,
  visibleItems,
  visibleCount,
  totalCount,
  recoveryNotice,
  isEditing,
  hasUnsavedChanges,
  quickLinks,
} = storeToRefs(workbenchStore);

const managerVisible = ref(false);
const settingsVisible = ref(false);
const settingsWidgetKey = ref("");
const viewportWidth = ref(window.innerWidth);
const gridRenderVersion = ref(0);
const canEdit = computed(() => viewportWidth.value >= 1200);
const gridRenderKey = computed(() =>
  `${currentTenant.value.id}:${workbenchStore.profile}:${gridRenderVersion.value}`,
);
const settingsItem = computed(() =>
  draftLayout.value?.items.find((item) => item.widgetKey === settingsWidgetKey.value) ?? null,
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
  );
  gridRenderVersion.value += 1;
}

watch(
  () => [currentTenant.value.id, userInfo.value.id, role.value] as const,
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
    gridRenderVersion.value += 1;
    ElMessage.warning("窗口宽度不足，已退出工作台编辑模式");
  }
});

function startEditing() {
  if (!canEdit.value) return;
  workbenchStore.beginEditing();
  gridRenderVersion.value += 1;
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
  gridRenderVersion.value += 1;
}

function saveEditing() {
  try {
    workbenchStore.saveEditing();
    managerVisible.value = false;
    settingsVisible.value = false;
    gridRenderVersion.value += 1;
    ElMessage.success("工作台布局已保存");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "工作台布局保存失败");
  }
}

async function restoreDefault() {
  try {
    await ElMessageBox.confirm(
      "将恢复当前组织和角色的默认组件显隐、位置、尺寸及设置，保存后生效。",
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
  gridRenderVersion.value += 1;
  ElMessage.success("已恢复默认草稿，请保存后生效");
}

function handlePositionsChange(
  changes: Array<Pick<WorkbenchLayoutItem, "widgetKey" | "x" | "y" | "w" | "h">>,
) {
  workbenchStore.updatePositions(changes);
}

function handleVisibilityChange(widgetKey: string, visible: boolean) {
  workbenchStore.setVisible(widgetKey, visible);
  gridRenderVersion.value += 1;
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
  if (action === "hide") {
    handleVisibilityChange(widgetKey, false);
    return;
  }
  const moveMap: Partial<Record<WorkbenchWidgetAction, [number, number]>> = {
    "move-left": [-1, 0],
    "move-right": [1, 0],
    "move-up": [0, -1],
    "move-down": [0, 1],
  };
  const move = moveMap[action];
  if (move) {
    if (!workbenchStore.moveWidget(widgetKey, move[0], move[1])) {
      ElMessage.warning("目标位置不可用");
      return;
    }
    gridRenderVersion.value += 1;
    return;
  }
  const preset = action.replace("size-", "") as WorkbenchWidgetSizePreset;
  if (workbenchStore.resizeWidget(widgetKey, preset)) gridRenderVersion.value += 1;
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
  justify-content: flex-end;
  margin-bottom: var(--spacing-12);
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
    margin-bottom: var(--spacing-8);
  }
}
</style>
