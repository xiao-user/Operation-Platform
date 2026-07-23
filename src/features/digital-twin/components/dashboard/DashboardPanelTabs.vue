<script setup lang="ts">
export interface DashboardPanelTabItem {
  value: string;
  label: string;
  disabled?: boolean;
}

defineProps<{
  modelValue: string;
  items: readonly DashboardPanelTabItem[];
  label: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();
</script>

<template>
  <div class="dashboard-panel-tabs" role="tablist" :aria-label="label">
    <button
      v-for="item in items"
      :key="item.value"
      type="button"
      role="tab"
      :aria-selected="modelValue === item.value"
      :disabled="item.disabled"
      @click="emit('update:modelValue', item.value)"
    >
      {{ item.label }}
    </button>
  </div>
</template>

<style scoped>
.dashboard-panel-tabs {
  display: inline-flex;
  min-width: 0;
  border: var(--dt-border-width) solid var(--dt-panel-border);
  background: var(--normal--black--20);
}

.dashboard-panel-tabs button {
  min-width: 44px;
  height: 24px;
  border: 0;
  border-right: var(--dt-border-width) solid var(--dt-panel-border);
  padding: 0 var(--dt-space-2);
  background: transparent;
  color: var(--dt-panel-description);
  font-size: var(--dt-font-size-2xs);
  cursor: pointer;
  transition: color var(--dt-transition-fast), background var(--dt-transition-fast);
}

.dashboard-panel-tabs button:last-child {
  border-right: 0;
}

.dashboard-panel-tabs button[aria-selected="true"] {
  background: var(--charts--2-10);
  color: var(--dt-chart-series-secondary);
}

.dashboard-panel-tabs button:disabled {
  cursor: default;
  opacity: 0.4;
}
</style>
