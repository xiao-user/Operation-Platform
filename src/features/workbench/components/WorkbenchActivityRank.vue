<template>
  <div class="activity-rank">
    <div>
      <strong>{{ data.rank }}</strong>
      <span>当前排名</span>
    </div>
    <div class="activity-change" :class="{ 'is-down': data.change < 0 }">
      <span>{{ data.summary }}</span>
      <strong>{{ Math.abs(data.change) }}</strong>
      <span aria-hidden="true">{{ data.change < 0 ? "↓" : "↑" }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WorkbenchActivityRankData } from "@/features/workbench/types";

defineProps<{ data: WorkbenchActivityRankData }>();
</script>

<style scoped>
.activity-rank {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  min-height: 80px;
  gap: var(--spacing-24);
  padding: var(--spacing-8) var(--spacing-24);
  color: var(--color-warning-dark-text);
  background: var(--color-warning-light);
  border-radius: var(--radius-lg);
}

.activity-rank > div {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-8);
}

.activity-rank > div:first-child {
  align-items: flex-start;
  flex-direction: column;
  gap: var(--spacing-2);
}

.activity-rank strong {
  color: var(--color-warning-dark-text);
  font-size: 30px;
  line-height: 36px;
}

.activity-rank span {
  font-size: var(--font-size-md);
}

.activity-change strong { font-size: 24px; }
.activity-change.is-down { color: var(--color-error-dark-text); }
.activity-change.is-down strong { color: var(--color-error-dark-text); }
</style>
