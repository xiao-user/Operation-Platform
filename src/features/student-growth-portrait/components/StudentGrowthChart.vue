<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { BarChart, LineChart, PieChart, RadarChart } from "echarts/charts";
import {
  AriaComponent,
  GridComponent,
  LegendComponent,
  RadarComponent,
  TooltipComponent,
} from "echarts/components";
import { init, use, type ECharts, type EChartsCoreOption } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";

use([
  BarChart,
  LineChart,
  PieChart,
  RadarChart,
  AriaComponent,
  GridComponent,
  LegendComponent,
  RadarComponent,
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
let resizeFrame: number | null = null;

function renderChart() {
  chart.value?.setOption({ ...props.option, aria: { enabled: true, description: props.ariaLabelText } }, {
    notMerge: true,
    lazyUpdate: true,
  });
}

function resizeChart() {
  if (resizeFrame !== null) return;
  resizeFrame = window.requestAnimationFrame(() => {
    resizeFrame = null;
    chart.value?.resize({ animation: { duration: 0 } });
  });
}

onMounted(() => {
  if (!chartElement.value) return;
  chart.value = init(chartElement.value, undefined, {
    renderer: "canvas",
    devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
  });
  renderChart();
  resizeObserver = new ResizeObserver(resizeChart);
  resizeObserver.observe(chartElement.value);
});

watch(() => [props.option, props.ariaLabelText], renderChart, { flush: "post" });

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
  chart.value?.dispose();
});
</script>

<template>
  <div ref="chartElement" class="student-growth-chart" role="img" :aria-label="ariaLabelText" />
</template>

<style scoped>
.student-growth-chart {
  width: 100%;
  height: 100%;
  min-height: 260px;
}
</style>
