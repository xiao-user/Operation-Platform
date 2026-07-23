<template>
  <section class="dashboard-filter-bar" aria-label="学业质量筛选条件">
    <div class="dashboard-filter-bar__fields">
      <slot />
    </div>
    <div v-if="$slots.actions" class="dashboard-filter-bar__actions">
      <slot name="actions" />
    </div>
  </section>
</template>

<style scoped>
.dashboard-filter-bar {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
  gap: var(--dt-space-4);
}

.dashboard-filter-bar__fields,
.dashboard-filter-bar__actions {
  display: flex;
  min-width: 0;
  align-items: center;
}

.dashboard-filter-bar__fields {
  overflow: visible;
  flex: 1;
  gap: var(--dt-space-3);
}

.dashboard-filter-bar__actions {
  flex: none;
  justify-content: flex-end;
}

@media (max-width: 1180px) {
  .dashboard-filter-bar {
    gap: var(--dt-space-2);
  }

  .dashboard-filter-bar__fields {
    gap: var(--dt-space-2);
  }
}
</style>
