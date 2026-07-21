import type { EChartsCoreOption } from "echarts/core";
import { regionalTrend } from "./mock-data";
import type { TopicChartDefinition } from "./types";

const chartColors = ["#2d55eb", "#36d187", "#ff9c00", "#8f4fd8", "#558bf0", "#898a8c"];

const sharedAxis = {
  axisLine: { lineStyle: { color: "#e1e2e6" } },
  axisTick: { show: false },
  axisLabel: { color: "#898a8c", fontSize: 12 },
};

export function createRegionalTrendOption(): EChartsCoreOption {
  return {
    color: chartColors,
    animationDuration: 420,
    tooltip: { trigger: "axis" },
    legend: { top: 0, left: 0, itemWidth: 16, itemHeight: 8, textStyle: { color: "#575859" } },
    grid: { top: 48, right: 24, bottom: 32, left: 42, containLabel: true },
    xAxis: { type: "category", data: regionalTrend.categories, boundaryGap: false, ...sharedAxis },
    yAxis: {
      type: "value",
      min: 40,
      max: 100,
      splitLine: { lineStyle: { color: "#ebecf0", type: "dashed" } },
      ...sharedAxis,
    },
    series: regionalTrend.series.map((series) => ({
      name: series.name,
      type: "line",
      data: series.values,
      smooth: true,
      symbolSize: 7,
      lineStyle: { width: 2 },
      emphasis: { focus: "series" },
    })),
  };
}

export function createFiveEducationOption(): EChartsCoreOption {
  return {
    color: chartColors,
    animationDuration: 420,
    tooltip: { trigger: "item" },
    legend: { bottom: 0, itemWidth: 16, itemHeight: 8, textStyle: { color: "#575859" } },
    radar: {
      center: ["50%", "46%"],
      radius: "62%",
      indicator: ["德育", "智育", "体育", "美育", "劳育"].map((name) => ({ name, max: 100 })),
      splitNumber: 4,
      axisName: { color: "#575859", fontSize: 13 },
      splitArea: { areaStyle: { color: ["#ffffff", "#fafbff"] } },
      splitLine: { lineStyle: { color: "#e1e2e6" } },
      axisLine: { lineStyle: { color: "#e1e2e6" } },
    },
    series: [{
      type: "radar",
      data: [
        { name: "本区域", value: [84.2, 88.6, 91.3, 82.1, 73.6], areaStyle: { opacity: 0.12 } },
        { name: "区域基准", value: [80, 82, 84, 78, 76], lineStyle: { type: "dashed" }, symbol: "none" },
      ],
    }],
  };
}

export function createTopicChartOption(chart: TopicChartDefinition): EChartsCoreOption {
  if (chart.type === "radar") {
    return {
      color: chartColors,
      animationDuration: 420,
      tooltip: { trigger: "item" },
      legend: { bottom: 0, textStyle: { color: "#575859" } },
      radar: {
        center: ["50%", "46%"],
        radius: "62%",
        indicator: chart.categories.map((name) => ({ name, max: chart.max ?? 100 })),
        splitNumber: 4,
        axisName: { color: "#575859" },
        splitArea: { areaStyle: { color: ["#ffffff", "#fafbff"] } },
        splitLine: { lineStyle: { color: "#e1e2e6" } },
        axisLine: { lineStyle: { color: "#e1e2e6" } },
      },
      series: [{
        type: "radar",
        data: chart.series.map((series, index) => ({
          name: series.name,
          value: series.values,
          areaStyle: index === 0 ? { opacity: 0.12 } : undefined,
          lineStyle: index > 0 ? { type: "dashed" } : undefined,
        })),
      }],
    };
  }

  if (chart.type === "pie") {
    const values = chart.series[0]?.values ?? [];
    return {
      color: chartColors,
      animationDuration: 420,
      tooltip: { trigger: "item", formatter: "{b}<br/>{c}%（{d}%）" },
      legend: { orient: "vertical", right: 12, top: "center", textStyle: { color: "#575859" } },
      series: [{
        name: chart.series[0]?.name,
        type: "pie",
        radius: ["46%", "68%"],
        center: ["38%", "50%"],
        avoidLabelOverlap: true,
        label: { formatter: "{b} {c}%", color: "#575859" },
        data: chart.categories.map((name, index) => ({ name, value: values[index] ?? 0 })),
      }],
    };
  }

  return {
    color: chartColors,
    animationDuration: 420,
    tooltip: { trigger: "axis" },
    legend: { top: 0, left: 0, textStyle: { color: "#575859" } },
    grid: { top: 48, right: 24, bottom: 28, left: 24, containLabel: true },
    xAxis: { type: "category", data: chart.categories, boundaryGap: chart.type === "bar", ...sharedAxis },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#ebecf0", type: "dashed" } },
      ...sharedAxis,
    },
    series: chart.series.map((series) => ({
      name: series.name,
      type: chart.type,
      data: series.values,
      smooth: chart.type === "line",
      symbolSize: chart.type === "line" ? 7 : undefined,
      barMaxWidth: chart.type === "bar" ? 38 : undefined,
      itemStyle: chart.type === "bar" ? { borderRadius: [4, 4, 0, 0] } : undefined,
      lineStyle: chart.type === "line" ? { width: 2 } : undefined,
      emphasis: { focus: "series" },
    })),
  };
}
