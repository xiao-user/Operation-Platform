<template>
  <div class="education-chart" :class="`variant-${data.variant}`">
    <div v-if="data.summary || data.unit" class="chart-meta">
      <span>{{ data.unit }}</span>
      <span>{{ data.summary }}</span>
    </div>
    <div class="chart-content">
      <WorkbenchEChart
        class="chart-canvas"
        :option="chartOption"
        :ariaLabelText="chartAriaLabel"
      />
      <div v-if="data.metrics?.length" class="chart-metrics">
        <div
          v-for="metric in data.metrics"
          :key="metric.label"
          class="chart-metric"
          :class="`tone-${metric.tone ?? 'neutral'}`"
        >
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { EChartsCoreOption } from "echarts/core";
import WorkbenchEChart from "@/features/workbench/components/WorkbenchEChart.vue";
import type { WorkbenchEducationChartData } from "@/features/workbench/types";

const props = defineProps<{ data: WorkbenchEducationChartData }>();

function cssToken(name: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

const palette = computed(() => [
  cssToken("--color-primary", "#2d55eb"),
  cssToken("--color-primary-line", "#558bf0"),
  cssToken("--color-primary-hover", "#4a6ef0"),
  cssToken("--color-chart-violet", "#4f28e8"),
  cssToken("--color-chart-purple", "#6a1fe8"),
  cssToken("--color-chart-lilac", "#8f4fd8"),
  cssToken("--color-success", "#0ed57d"),
  cssToken("--color-chart-green", "#36d187"),
  cssToken("--color-chart-mint", "#65dc95"),
  cssToken("--color-chart-yellow-light", "#ffe8a3"),
  cssToken("--color-chart-yellow", "#ffb429"),
  cssToken("--color-warning", "#ff9c00"),
]);

const chartAriaLabel = computed(() => {
  const labels = props.data.labels.join("、");
  return `${labels}数据图表`;
});

const commonTextStyle = computed(() => ({
  color: cssToken("--color-body", "#575859"),
  fontFamily: "PingFang SC, Microsoft YaHei, sans-serif",
  fontSize: 12,
}));

function donutOption(): EChartsCoreOption {
  const primarySeries = props.data.series[0]?.values ?? [];
  const data = props.data.labels.map((name, index) => ({
    name,
    value: primarySeries[index] ?? 0,
  }));
  const isGrade = props.data.variant === "grade-applications";
  const series: EChartsCoreOption[] = [];
  if (isGrade) {
    const stageValues = [
      primarySeries.slice(0, 6).reduce((total, value) => total + value, 0),
      primarySeries.slice(6, 9).reduce((total, value) => total + value, 0),
      primarySeries.slice(9).reduce((total, value) => total + value, 0),
    ];
    series.push({
      name: "学段",
      type: "pie",
      radius: ["32%", "48%"],
      center: ["28%", "54%"],
      silent: true,
      label: { show: false },
      itemStyle: { borderColor: cssToken("--color-white", "#fff"), borderWidth: 2 },
      data: ["小学", "初中", "高中"].map((name, index) => ({ name, value: stageValues[index] })),
    });
  }
  series.push({
    name: "应用量",
    type: "pie",
    radius: isGrade ? ["52%", "72%"] : ["42%", "68%"],
    center: ["28%", "54%"],
    label: { show: false },
    itemStyle: { borderColor: cssToken("--color-white", "#fff"), borderWidth: 2 },
    data,
  });
  return {
    animationDuration: 280,
    color: palette.value,
    textStyle: commonTextStyle.value,
    tooltip: { trigger: "item", valueFormatter: (value: unknown) => Number(value).toLocaleString() },
    title: {
      text: props.data.centerLabel ?? props.data.labels[0] ?? "",
      subtext: props.data.centerValue ?? String(primarySeries[0] ?? ""),
      left: "28%",
      top: "42%",
      textAlign: "center",
      textStyle: { color: cssToken("--color-body", "#575859"), fontSize: 13, fontWeight: 400 },
      subtextStyle: { color: cssToken("--color-title", "#252526"), fontSize: 16, fontWeight: 600 },
      itemGap: 2,
    },
    legend: {
      type: "scroll",
      orient: "vertical",
      right: 0,
      top: "center",
      width: "44%",
      itemWidth: 10,
      itemHeight: 10,
      itemGap: isGrade ? 10 : 12,
      textStyle: commonTextStyle.value,
    },
    series,
  };
}

function axisOption(type: "line" | "bar"): EChartsCoreOption {
  const primary = cssToken("--color-primary", "#2d55eb");
  const success = cssToken("--color-success", "#0ed57d");
  const color = props.data.variant === "resource-contribution" ? success : primary;
  return {
    animationDuration: 280,
    color: [color],
    textStyle: commonTextStyle.value,
    grid: { top: 10, right: 8, bottom: 28, left: 42, containLabel: false },
    tooltip: { trigger: "axis", axisPointer: { type: type === "bar" ? "shadow" : "line" } },
    xAxis: {
      type: "category",
      data: props.data.labels,
      boundaryGap: type === "bar",
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { color: cssToken("--color-title", "#252526"), fontSize: 12, interval: 0 },
    },
    yAxis: {
      type: "value",
      splitNumber: 5,
      axisLabel: { color: cssToken("--color-body", "#575859"), fontSize: 12 },
      splitLine: { lineStyle: { color: cssToken("--color-border", "#ebecf0"), type: "dashed" } },
    },
    series: props.data.series.map((series) => ({
      name: series.name,
      type,
      data: series.values,
      showSymbol: false,
      smooth: false,
      barWidth: 16,
      itemStyle: { borderRadius: type === "bar" ? [2, 2, 0, 0] : 0 },
      lineStyle: { width: 2 },
      areaStyle: type === "line" ? { color: color, opacity: 0.08 } : undefined,
    })),
  };
}

const chartOption = computed<EChartsCoreOption>(() => {
  if (["grade-applications", "application-types", "resource-sharing"].includes(props.data.variant)) {
    return donutOption();
  }
  return axisOption(props.data.variant === "resource-growth" ? "line" : "bar");
});
</script>

<style scoped>
.education-chart {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.chart-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 22px;
  gap: var(--spacing-12);
  margin-bottom: var(--spacing-4);
  color: var(--color-body);
  font-size: var(--font-size-sm);
}

.chart-meta span:last-child {
  overflow: hidden;
  color: var(--color-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chart-content {
  display: flex;
  min-height: 0;
  flex: 1;
  gap: var(--spacing-16);
}

.chart-canvas {
  min-width: 0;
  flex: 1;
}

.variant-resource-sharing .chart-canvas { flex-basis: 58%; }

.chart-metrics {
  display: grid;
  min-width: 180px;
  flex: 0 1 38%;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-12);
}

.chart-metric {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  gap: var(--spacing-4);
  padding: var(--spacing-12) var(--spacing-16);
  color: var(--color-secondary);
  background: var(--color-bg-subtle);
  border-radius: var(--radius-lg);
}

.chart-metric:first-child { grid-column: 1 / -1; }

.chart-metric strong {
  color: var(--color-title);
  font-size: 22px;
  line-height: 24px;
}

.chart-metric.tone-primary {
  color: var(--color-primary);
  background: var(--color-primary-light);
}

.chart-metric.tone-primary strong { color: var(--color-primary); }

@container (max-width: 520px) {
  .chart-content { flex-direction: column; }
  .chart-metrics {
    min-width: 0;
    flex: none;
  }
}
</style>
