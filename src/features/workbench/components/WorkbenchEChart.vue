<template>
  <div ref="chartElement" class="workbench-echart" role="img" :aria-label="ariaLabelText" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { BarChart, LineChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components";
import { init, use, type ECharts, type EChartsCoreOption } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";

use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  CanvasRenderer,
]);

const props = defineProps<{
  option: EChartsCoreOption;
  ariaLabelText: string;
}>();

const chartElement = ref<HTMLElement | null>(null);
const chart = shallowRef<ECharts | null>(null);
let resizeObserver: ResizeObserver | null = null;

function renderChart() {
  chart.value?.setOption(props.option, { notMerge: true });
}

onMounted(() => {
  if (!chartElement.value) return;
  chart.value = init(chartElement.value, undefined, { renderer: "canvas" });
  renderChart();
  resizeObserver = new ResizeObserver(() => chart.value?.resize());
  resizeObserver.observe(chartElement.value);
});

watch(() => props.option, renderChart, { deep: true });

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  chart.value?.dispose();
  chart.value = null;
});
</script>

<style scoped>
.workbench-echart {
  width: 100%;
  height: 100%;
  min-height: 160px;
}
</style>
