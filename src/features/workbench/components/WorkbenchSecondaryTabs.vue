<template>
  <div class="secondary-tabs-viewport">
    <div class="secondary-tabs" role="tablist" :aria-label="ariaLabel">
      <button
        v-for="option in options"
        :key="option.value"
        class="secondary-tab"
        :class="{ 'is-active': model === option.value }"
        type="button"
        role="tab"
        :aria-selected="model === option.value"
        :data-state="model === option.value ? 'active' : 'inactive'"
        @click="model = option.value"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface WorkbenchSecondaryTabOption {
  label: string;
  value: string;
}

withDefaults(defineProps<{
  options: readonly WorkbenchSecondaryTabOption[];
  ariaLabel?: string;
}>(), {
  ariaLabel: "内容分类",
});

const model = defineModel<string>({ required: true });
</script>

<style scoped>
.secondary-tabs-viewport {
  max-width: 100%;
  padding: var(--spacing-2);
  margin: calc(-1 * var(--spacing-2));
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}

.secondary-tabs-viewport::-webkit-scrollbar { display: none; }

.secondary-tabs {
  display: inline-flex;
  align-items: center;
  min-width: max-content;
  gap: var(--spacing-8);
}

.secondary-tab {
  height: 32px;
  flex-shrink: 0;
  padding: var(--spacing-4) var(--spacing-16);
  color: var(--color-title);
  font: inherit;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-regular);
  line-height: var(--line-height-md);
  white-space: nowrap;
  background: var(--color-white);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.secondary-tab:hover {
  color: var(--color-primary);
  border-color: var(--color-primary-line-light);
  background: var(--color-bg-page);
}

.secondary-tab.is-active {
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
  background: var(--color-primary-light);
  border-color: var(--color-primary);
}

.secondary-tab:focus-visible {
  outline: 0;
  box-shadow: 0 0 0 2px var(--color-primary-line-light);
}
</style>
