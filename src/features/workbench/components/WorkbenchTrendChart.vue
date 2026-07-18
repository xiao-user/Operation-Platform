<template>
  <div class="trend-chart">
    <WorkbenchEChart :option="option" :ariaLabelText="data.summary" />
    <div class="trend-footer">
      <span>{{ data.labels[0] }}</span>
      <strong>{{ data.summary }}</strong>
      <span>{{ data.labels[data.labels.length - 1] }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { EChartsCoreOption } from "echarts/core";
import WorkbenchEChart from "@/features/workbench/components/WorkbenchEChart.vue";
import type { WorkbenchTrendData } from "@/features/workbench/types";

const props = defineProps<{ data: WorkbenchTrendData }>();

function token(name: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

const option = computed<EChartsCoreOption>(() => ({
  animationDuration: 280,
  grid: { top: 12, right: 8, bottom: 12, left: 8 },
  tooltip: { trigger: "axis" },
  xAxis: { type: "category", data: props.data.labels, show: false, boundaryGap: false },
  yAxis: { type: "value", show: false, min: "dataMin", max: "dataMax" },
  series: [{
    type: "line",
    data: props.data.values,
    smooth: false,
    showSymbol: false,
    lineStyle: { width: 3, color: token("--color-primary", "#2d55eb") },
    areaStyle: { color: token("--color-primary", "#2d55eb"), opacity: 0.1 },
  }],
}));
</script>

<style scoped>
.trend-chart {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
}

.trend-chart :deep(.workbench-echart) {
  min-height: 120px;
  flex: 1;
}

.trend-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-12);
  color: var(--color-secondary);
  font-size: var(--font-size-xs);
}

.trend-footer strong {
  color: var(--color-body);
  font-weight: var(--font-weight-medium);
}
</style>
