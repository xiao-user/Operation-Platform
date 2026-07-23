<script setup lang="ts">
import { InfoFilled } from "@element-plus/icons-vue";

defineProps<{
  label: string;
  content: string;
}>();
</script>

<template>
  <ElTooltip
    :content="content"
    placement="top"
    effect="light"
    popper-class="student-growth-explanation-tooltip"
  >
    <button class="chart-explanation-tooltip" type="button" :aria-label="label">
      <ElIcon><InfoFilled /></ElIcon>
    </button>
  </ElTooltip>
</template>

<style scoped>
.chart-explanation-tooltip {
  display: inline-flex;
  width: 20px;
  height: 20px;
  flex: none;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: var(--color-secondary);
  font-size: var(--font-size-md);
  background: transparent;
  border: 0;
  border-radius: var(--radius-md);
  cursor: help;
}

.chart-explanation-tooltip:hover {
  color: var(--color-primary);
  background: var(--color-primary-light);
}

.chart-explanation-tooltip:focus-visible {
  outline: 2px solid var(--color-primary-line-light);
  outline-offset: 2px;
}

:global(.student-growth-explanation-tooltip) {
  max-width: 360px;
  line-height: var(--line-height-md);
  white-space: normal;
}
</style>
