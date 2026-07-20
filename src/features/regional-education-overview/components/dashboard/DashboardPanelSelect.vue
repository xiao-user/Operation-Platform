<script setup lang="ts">
import { useId } from "vue";

export interface DashboardPanelSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

withDefaults(defineProps<{
  modelValue: string;
  label: string;
  options: readonly DashboardPanelSelectOption[];
  width?: string;
}>(), {
  width: "156px",
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const controlId = `dashboard-filter-${useId().replace(/:/g, "")}`;
</script>

<template>
  <div class="dashboard-panel-select" :style="{ '--dashboard-filter-width': width }">
    <label :for="controlId">{{ label }}</label>
    <ElSelect
      :id="controlId"
      :model-value="modelValue"
      :aria-label="label"
      :teleported="false"
      fit-input-width
      popper-class="dt-dashboard-select-popper"
      @update:model-value="emit('update:modelValue', String($event))"
    >
      <ElOption
        v-for="option in options"
        :key="option.value"
        :label="option.label"
        :value="option.value"
        :disabled="option.disabled"
      />
    </ElSelect>
  </div>
</template>

<style scoped>
.dashboard-panel-select {
  display: flex;
  min-width: 0;
  width: var(--dashboard-filter-width);
  align-items: center;
  gap: var(--dt-space-2);
  --el-color-primary: var(--dt-chart-series-secondary);
  --el-text-color-regular: var(--dt-color-text);
  --el-text-color-placeholder: var(--dt-color-text-muted);
  --el-border-color: var(--dt-panel-border);
  --el-border-color-hover: var(--charts--2-50);
  --el-fill-color-blank: transparent;
  --el-bg-color-overlay: var(--background---ray-charts);
}

.dashboard-panel-select label {
  flex: none;
  color: var(--dt-color-text-secondary);
  font-size: var(--dt-font-size-xs);
  line-height: var(--dt-line-height-xs);
  white-space: nowrap;
}

.dashboard-panel-select :deep(.el-select) {
  min-width: 0;
  flex: 1;
}

.dashboard-panel-select :deep(.el-select__wrapper) {
  min-height: 30px;
  border-radius: var(--dt-radius-xs);
  padding: 0 var(--dt-space-2);
  background: var(--normal--black--20);
  box-shadow: inset 0 0 0 var(--dt-border-width) var(--dt-panel-border);
  transition: box-shadow var(--dt-transition-fast), background var(--dt-transition-fast);
}

.dashboard-panel-select :deep(.el-select__wrapper:hover),
.dashboard-panel-select :deep(.el-select__wrapper.is-focused) {
  background: var(--charts--2-10);
  box-shadow: inset 0 0 0 var(--dt-border-width) var(--charts--2-50);
}

.dashboard-panel-select :deep(.el-select__selected-item) {
  overflow: hidden;
  color: var(--dt-color-text);
  font-size: var(--dt-font-size-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-panel-select :deep(.el-select__caret) {
  color: var(--dt-color-text-muted);
}

.dashboard-panel-select :deep(.dt-dashboard-select-popper.el-popper) {
  border: var(--dt-border-width) solid var(--dt-panel-border);
  background: var(--background---ray-charts);
  box-shadow: var(--dt-panel-shadow);
}

.dashboard-panel-select :deep(.dt-dashboard-select-popper .el-select-dropdown__item) {
  color: var(--dt-color-text-secondary);
  font-size: var(--dt-font-size-xs);
}

.dashboard-panel-select :deep(.dt-dashboard-select-popper .el-select-dropdown__item.is-hovering) {
  background: var(--charts--2-10);
}

.dashboard-panel-select :deep(.dt-dashboard-select-popper .el-select-dropdown__item.is-selected) {
  color: var(--dt-chart-series-secondary);
}

@media (max-width: 1180px) {
  .dashboard-panel-select {
    width: min(var(--dashboard-filter-width), 142px);
    gap: var(--dt-space-1);
  }
}
</style>
