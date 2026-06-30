<template>
  <span class="status-tag" :class="colorClass">
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";

export type StatusTagColor = "green" | "blue" | "red" | "orange" | "gray";

const props = withDefaults(
  defineProps<{
    /** 颜色主题 */
    color?: StatusTagColor;
  }>(),
  { color: "blue" },
);

const colorClass = computed(() => `tag-${props.color}`);
</script>

<style scoped>
.status-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-md);
  line-height: var(--line-height-md);
  white-space: nowrap;
  border: 1px solid;
}

.tag-green {
  background: var(--color-success-light);
  border-color: var(--color-success);
  color: var(--color-success-dark-text);
}

.tag-blue {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.tag-red {
  background: var(--color-error-light);
  border-color: var(--color-error);
  color: var(--color-error-dark-text);
}

.tag-orange {
  background: var(--color-warning-light);
  border-color: var(--color-warning);
  color: var(--color-warning-dark-text);
}

.tag-gray {
  background: var(--color-bg-soft);
  border-color: var(--color-border-strong);
  color: var(--color-secondary);
}
</style>
