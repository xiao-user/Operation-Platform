<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { BarChart, GaugeChart, LineChart, PieChart, RadarChart } from "echarts/charts";
import {
  DataZoomComponent,
  GraphicComponent,
  GridComponent,
  LegendComponent,
  RadarComponent,
  TooltipComponent,
} from "echarts/components";
import { init, use, type ECharts, type EChartsCoreOption } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";

use([
  BarChart,
  GaugeChart,
  LineChart,
  PieChart,
  RadarChart,
  DataZoomComponent,
  GraphicComponent,
  GridComponent,
  LegendComponent,
  RadarComponent,
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

const emit = defineEmits<{
  legendSelectionChange: [selected: Record<string, boolean>];
}>();

const chartElement = ref<HTMLElement | null>(null);
const chart = shallowRef<ECharts | null>(null);
let resizeObserver: ResizeObserver | null = null;
let resizeFrame: number | undefined;

function renderChart(option = props.option) {
  if (document.hidden) return;
  chart.value?.setOption(option, {
    notMerge: true,
    lazyUpdate: true,
  });
}

function handleVisibilityChange() {
  const animation = chart.value?.getZr().animation;
  if (document.hidden) {
    animation?.stop();
    return;
  }
  animation?.start();
  renderChart();
  scheduleResize();
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
  chart.value.on("legendselectchanged", (...args: unknown[]) => {
    const event = args[0] as { selected?: Record<string, boolean> };
    if (event.selected) emit("legendSelectionChange", event.selected);
  });
  renderChart();
  resizeObserver = new ResizeObserver(scheduleResize);
  resizeObserver.observe(chartElement.value);
  document.addEventListener("visibilitychange", handleVisibilityChange);
});

watch(() => props.option, renderChart, { flush: "post" });

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  if (resizeFrame !== undefined) window.cancelAnimationFrame(resizeFrame);
  resizeFrame = undefined;
  chart.value?.off("legendselectchanged");
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
