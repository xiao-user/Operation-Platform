<template>
  <section class="system-entry-card">
    <div class="system-entry-heading">
      <div>
        <h2>系统入口配置</h2>
        <p>工作台是固定系统入口，不参与普通菜单层级拖拽。</p>
      </div>
      <el-tag type="primary" effect="plain">租户独立配置</el-tag>
    </div>

    <div class="system-entry-row">
      <div class="entry-name">
        <strong>{{ workbench.label }}</strong>
        <span class="entry-icon-line">
          <component :is="resolveMenuIcon(workbench.icon)" />
          系统入口 · /workbench
        </span>
      </div>
      <div class="entry-field entry-icon-field">
        <label>入口图标</label>
        <MenuIconSelect
          :model-value="workbench.icon"
          :disabled="disabled"
          :clearable="false"
          aria-label="工作台图标"
          @update:model-value="handleIconChange"
        />
      </div>
      <div class="entry-field">
        <label>入口名称</label>
        <el-input
          :model-value="workbench.label"
          :disabled="disabled"
          maxlength="12"
          @change="handleLabelChange"
        />
      </div>
      <div class="entry-field entry-sort">
        <label>排序</label>
        <el-input-number
          :model-value="workbench.sort"
          :disabled="disabled"
          :min="-999"
          :max="999"
          :step="10"
          controls-position="right"
          @change="handleSortChange"
        />
      </div>
      <div class="entry-visible">
        <label>显示</label>
        <el-switch
          :model-value="workbench.enabled"
          :disabled="disabled"
          @change="(value: boolean | string | number) => emit('update', { enabled: Boolean(value) })"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import MenuIconSelect from "@/components/MenuIconSelect.vue";
import { resolveMenuIcon } from "@/components/menu-icons";
import type { WorkbenchConfig } from "@/features/shell-config/types";

defineProps<{
  workbench: WorkbenchConfig;
  disabled: boolean;
}>();

const emit = defineEmits<{
  update: [input: Partial<WorkbenchConfig>];
}>();

function handleLabelChange(value: string) {
  const label = value.trim();
  if (!label) {
    ElMessage.warning("工作台名称不能为空");
    return;
  }
  emit("update", { label });
}

function handleIconChange(value: string | null) {
  if (value) emit("update", { icon: value });
}

function handleSortChange(value: number | undefined) {
  const sort = Number(value);
  if (!Number.isFinite(sort)) {
    ElMessage.warning("请输入有效排序值");
    return;
  }
  emit("update", { sort });
}
</script>

<style scoped>
.system-entry-card {
  padding: var(--spacing-16) var(--spacing-24);
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.system-entry-heading,
.system-entry-row {
  display: flex;
  align-items: center;
}

.system-entry-heading {
  justify-content: space-between;
  gap: var(--spacing-16);
  margin-bottom: var(--spacing-16);
}

.system-entry-heading h2 {
  margin: 0;
  color: var(--color-title);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.system-entry-heading p {
  margin: var(--spacing-4) 0 0;
  color: var(--color-secondary);
  font-size: var(--font-size-sm);
}

.system-entry-row {
  min-height: 72px;
  gap: var(--spacing-24);
  padding: var(--spacing-16);
  background: var(--color-bg-page);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.entry-name {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  min-width: 220px;
}

.entry-name strong {
  color: var(--color-title);
  font-weight: var(--font-weight-semibold);
}

.entry-name span,
.entry-field label,
.entry-visible label {
  color: var(--color-secondary);
  font-size: var(--font-size-sm);
}

.entry-icon-line {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-6);
}

.entry-icon-line svg {
  width: 15px;
  height: 15px;
  stroke-width: 2;
}

.entry-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-8);
  width: 220px;
}

.entry-field :deep(.el-select) {
  width: 100%;
}

.entry-icon-field {
  width: 240px;
}

.entry-sort {
  width: 160px;
}

.entry-visible {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-8);
  margin-left: auto;
}
</style>
