<template>
  <div class="growth-summary">
    <WorkbenchSecondaryTabs v-model="period" :options="periodOptions" aria-label="成长周期" />
    <div class="growth-score">
      <strong>{{ score }}</strong>
      <div>
        <span>综合成长值</span>
        <small>{{ summary }}</small>
      </div>
    </div>

    <div class="growth-items">
      <div v-for="item in data.items" :key="item.label" class="growth-item">
        <div>
          <span>{{ item.label }}</span>
          <strong>{{ item.displayValue }}</strong>
        </div>
        <el-progress :percentage="adjustedValue(item.value)" :show-text="false" :stroke-width="6" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import WorkbenchSecondaryTabs from "@/features/workbench/components/WorkbenchSecondaryTabs.vue";
import type { WorkbenchGrowthData } from "@/features/workbench/types";

const props = defineProps<{ data: WorkbenchGrowthData }>();
const period = ref<"month" | "term">("month");
const periodOptions = [
  { label: "本月", value: "month" },
  { label: "本学期", value: "term" },
];
const score = computed(() => period.value === "month" ? props.data.score : "91");
const summary = computed(() => period.value === "month" ? props.data.summary : "本学期成长值 +27");

function adjustedValue(value: number) {
  return period.value === "month" ? value : Math.min(100, value + 9);
}
</script>

<style scoped>
.growth-summary {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: var(--spacing-16);
}

.growth-score {
  display: flex;
  align-items: center;
  gap: var(--spacing-12);
}

.growth-score > strong {
  color: var(--color-primary);
  font-size: 32px;
  line-height: 36px;
}

.growth-score > div {
  display: flex;
  flex-direction: column;
}

.growth-score span {
  color: var(--color-title);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.growth-score small {
  color: var(--color-success-dark-text);
  font-size: var(--font-size-xs);
}

.growth-items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-12);
}

.growth-item > div:first-child {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-4);
  color: var(--color-body);
  font-size: var(--font-size-xs);
}

.growth-item strong {
  color: var(--color-title);
  font-weight: var(--font-weight-medium);
}

</style>
