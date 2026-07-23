import type { EChartsCoreOption } from "echarts/core";
import type { DigitalTwinChartPalette } from "@/features/digital-twin/map-themes";
import { createDigitalTwinChartCanvasTheme } from "@/features/digital-twin/digital-twin-chart-theme";

export interface AcademicTrendDatum {
  label: string;
  averageScore: number;
  excellentRate: number;
  passRate: number;
}

export const academicTrendData: readonly AcademicTrendDatum[] = [
  { label: "2024入学统考", averageScore: 472, excellentRate: 39, passRate: 72 },
  { label: "2025上学期期中", averageScore: 528, excellentRate: 48, passRate: 81 },
  { label: "2025上学期期末", averageScore: 506, excellentRate: 42, passRate: 74 },
  { label: "2026上学期期中", averageScore: 556, excellentRate: 35, passRate: 67 },
  { label: "2026上学期期末", averageScore: 603, excellentRate: 44, passRate: 86 },
] as const;

export const academicTrendLegendItems = [
  { key: "average", label: "平均分", kind: "bar" },
  { key: "excellent", label: "优秀率", kind: "dot" },
  { key: "pass", label: "合格率", kind: "ring" },
] as const;

export function createAcademicTrendChartOption(
  data: readonly AcademicTrendDatum[],
  palette: DigitalTwinChartPalette,
): EChartsCoreOption {
  const theme = createDigitalTwinChartCanvasTheme(palette);
  const labels = data.map((item) => item.label);
  const needsHorizontalNavigation = data.length > 7;
  const initialVisiblePercent = needsHorizontalNavigation
    ? Math.max(28, Math.round((7 / data.length) * 100))
    : 100;
  return {
    animation: true,
    animationDuration: 360,
    animationEasing: "cubicOut",
    color: [...theme.series],
    grid: {
      top: 34,
      right: 44,
      bottom: needsHorizontalNavigation ? 48 : 32,
      left: 38,
      containLabel: false,
    },
    legend: {
      show: true,
      selectedMode: true,
      top: 0,
      left: "center",
      itemWidth: 10,
      itemHeight: 7,
      itemGap: 8,
      textStyle: {
        color: theme.axisText,
        fontSize: 10,
      },
      data: academicTrendLegendItems.map((item) => item.label),
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: theme.tooltipBackground,
      borderColor: theme.axisLine,
      borderWidth: 1,
      padding: [8, 10],
      textStyle: {
        color: theme.tooltipText,
        fontSize: 12,
      },
      axisPointer: {
        type: "line",
        lineStyle: { color: theme.axisLine, width: 1 },
      },
    },
    xAxis: {
      type: "category",
      data: labels,
      boundaryGap: true,
      axisTick: { show: false },
      axisLine: {
        show: true,
        lineStyle: { color: theme.axisLine, width: 1 },
      },
      axisLabel: {
        color: theme.axisText,
        fontSize: 12,
        interval: needsHorizontalNavigation ? "auto" : 0,
        hideOverlap: true,
        overflow: "truncate",
        width: 64,
        margin: 10,
        lineHeight: 12,
        formatter: (label: string) => label
          .replace(/^20/, "")
          .replace("入学统考", "入")
          .replace("上学期期中", "中")
          .replace("上学期期末", "末"),
      },
    },
    dataZoom: [
      {
        type: "inside",
        xAxisIndex: 0,
        start: 0,
        end: initialVisiblePercent,
        filterMode: "none",
        zoomOnMouseWheel: "shift",
        moveOnMouseWheel: true,
        moveOnMouseMove: true,
      },
      ...(needsHorizontalNavigation
        ? [{
            type: "slider",
            xAxisIndex: 0,
            start: 0,
            end: initialVisiblePercent,
            height: 8,
            bottom: 4,
            borderColor: theme.gridLine,
            backgroundColor: theme.gridLine,
            fillerColor: palette.series2.subtle,
            handleSize: 0,
            showDetail: false,
            showDataShadow: false,
            brushSelect: false,
          }]
        : []),
    ],
    yAxis: [
      {
        type: "value",
        name: "率",
        min: 0,
        max: 100,
        interval: 25,
        nameGap: 8,
        nameTextStyle: { color: theme.axisText, fontSize: 12, align: "right" },
        axisTick: { show: false },
        axisLine: {
          show: true,
          lineStyle: { color: theme.axisLine, width: 1 },
        },
        axisLabel: { color: theme.axisText, fontSize: 12 },
        splitLine: {
          show: true,
          lineStyle: { color: theme.gridLine, width: 1, type: "solid" },
        },
      },
      {
        type: "value",
        name: "平均分",
        min: 0,
        max: 750,
        interval: 250,
        nameGap: 8,
        nameTextStyle: { color: theme.axisText, fontSize: 12, align: "left" },
        axisTick: { show: false },
        axisLine: {
          show: true,
          lineStyle: { color: theme.axisLine, width: 1 },
        },
        axisLabel: { color: theme.axisText, fontSize: 12 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: "平均分",
        type: "bar",
        yAxisIndex: 1,
        data: data.map((item) => item.averageScore),
        barWidth: 6,
        itemStyle: { color: theme.series[0] },
        emphasis: { disabled: false },
        z: 2,
      },
      {
        name: "优秀率",
        type: "line",
        yAxisIndex: 0,
        data: data.map((item) => item.excellentRate),
        symbol: "circle",
        symbolSize: 7,
        showSymbol: true,
        lineStyle: { color: theme.series[1], width: 1.5 },
        itemStyle: { color: theme.series[1] },
        z: 4,
      },
      {
        name: "合格率",
        type: "line",
        yAxisIndex: 0,
        data: data.map((item) => item.passRate),
        symbol: "emptyCircle",
        symbolSize: 8,
        showSymbol: true,
        lineStyle: { color: theme.series[2], width: 1.5 },
        itemStyle: { color: theme.series[2], borderWidth: 1.5 },
        z: 3,
      },
    ],
  };
}
