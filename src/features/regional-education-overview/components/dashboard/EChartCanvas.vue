<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { BarChart, LineChart } from "echarts/charts";
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import { init, use, type ECharts, type EChartsCoreOption } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";

use([
  BarChart,
  LineChart,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
]);

const props = withDefaults(defineProps<{
  option: EChartsCoreOption;
  ariaLabelText: string;
  maxDevicePixelRatio?: number;
}>(), {
  maxDevicePixelRatio: 2,
});

const chartElement = ref<HTMLElement | null>(null);
const chart = shallowRef<ECharts | null>(null);
let resizeObserver: ResizeObserver | null = null;
let resizeFrame: number | undefined;

function renderChart(option = props.option) {
  chart.value?.setOption(option, {
    notMerge: true,
    lazyUpdate: true,
  });
}

function scheduleResize() {
  if (resizeFrame !== undefined) return;
  resizeFrame = window.requestAnimationFrame(() => {
    resizeFrame = undefined;
    chart.value?.resize({ animation: { duration: 0 } });
  });
}

onMounted(() => {
  if (!chartElement.value) return;
  const devicePixelRatio = Math.min(
    Math.max(window.devicePixelRatio || 1, 1),
    props.maxDevicePixelRatio,
  );
  chart.value = init(chartElement.value, undefined, {
    renderer: "canvas",
    devicePixelRatio,
  });
  renderChart();
  resizeObserver = new ResizeObserver(scheduleResize);
  resizeObserver.observe(chartElement.value);
});

watch(() => props.option, renderChart, { flush: "post" });

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  if (resizeFrame !== undefined) window.cancelAnimationFrame(resizeFrame);
  resizeFrame = undefined;
  chart.value?.dispose();
  chart.value = null;
});
</script>

<template>
  <div
    ref="chartElement"
    class="dashboard-echart"
    role="img"
    :aria-label="ariaLabelText"
  />
</template>

<style scoped>
.dashboard-echart {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 110px;
}
</style>
