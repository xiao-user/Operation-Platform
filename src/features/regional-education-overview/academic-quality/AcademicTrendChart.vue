<script setup lang="ts">
import { computed } from "vue";
import type { DigitalTwinChartPalette } from "../map-themes";
import EChartCanvas from "../components/dashboard/EChartCanvas.vue";
import {
  academicTrendData,
  createAcademicTrendChartOption,
} from "./academic-trend-chart";

const props = defineProps<{
  palette: DigitalTwinChartPalette;
}>();

const option = computed(() => createAcademicTrendChartOption(
  academicTrendData,
  props.palette,
));
</script>

<template>
  <EChartCanvas
    class="academic-trend-chart"
    :option="option"
    :ariaLabelText="'学业趋势对比：历次考试平均分、优秀率和合格率'"
  />
</template>

<style scoped>
.academic-trend-chart {
  min-height: 0;
}
</style>
