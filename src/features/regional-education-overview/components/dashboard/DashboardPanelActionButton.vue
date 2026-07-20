<script setup lang="ts">
withDefaults(defineProps<{
  label: string;
  disabled?: boolean;
}>(), {
  disabled: false,
});

const emit = defineEmits<{
  click: [];
}>();
</script>

<template>
  <ElButton
    class="dashboard-panel-action-button"
    :disabled="disabled"
    @click="emit('click')"
  >
    <slot name="icon" />
    <span>{{ label }}</span>
  </ElButton>
</template>

<style scoped>
.dashboard-panel-action-button.el-button {
  height: 30px;
  border: var(--dt-border-width) solid var(--charts--2-50);
  border-radius: var(--dt-radius-xs);
  padding: 0 var(--dt-space-4);
  background: var(--charts--2-10);
  color: var(--dt-chart-series-secondary);
  font-family: var(--dt-font-family);
  font-size: var(--dt-font-size-xs);
  letter-spacing: 0.08em;
  box-shadow: inset 0 0 12px var(--charts--2-10);
  transition: color var(--dt-transition-fast), border-color var(--dt-transition-fast), background var(--dt-transition-fast);
}

.dashboard-panel-action-button.el-button:hover,
.dashboard-panel-action-button.el-button:focus-visible {
  border-color: var(--dt-chart-series-secondary);
  background: color-mix(in srgb, var(--dt-chart-series-secondary) 16%, transparent);
  color: var(--dt-color-text-strong);
}
</style>
