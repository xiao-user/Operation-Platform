import { describe, expect, it } from "vitest";
import {
  academicTrendData,
  createAcademicTrendChartOption,
} from "../academic-quality/academic-trend-chart";
import { getDigitalTwinMapTheme } from "../map-themes";

describe("academic trend chart", () => {
  it("builds the Figma-aligned dual-axis bar and line chart", () => {
    const palette = getDigitalTwinMapTheme("cyan").chartPalette;
    const option = createAcademicTrendChartOption(academicTrendData, palette);
    const grid = option.grid as { top: number; right: number; bottom: number; left: number };
    const legend = option.legend as {
      selectedMode: boolean;
      left: string;
      data: string[];
    };
    const dataZoom = option.dataZoom as Array<{ type: string; end: number }>;
    const xAxis = option.xAxis as {
      axisLabel: { interval: string | number; hideOverlap: boolean; overflow: string; width: number };
    };
    const yAxes = option.yAxis as Array<{
      max: number;
      axisLine: { lineStyle: { width: number } };
      splitLine: { lineStyle?: { width: number; type: string } };
    }>;
    const series = option.series as Array<{
      name: string;
      type: string;
      yAxisIndex: number;
      barWidth?: number;
      lineStyle?: { width: number };
    }>;

    expect(grid).toEqual({ top: 34, right: 44, bottom: 32, left: 38, containLabel: false });
    expect(legend).toMatchObject({
      selectedMode: true,
      left: "center",
      data: ["平均分", "优秀率", "合格率"],
    });
    expect(dataZoom).toEqual([expect.objectContaining({ type: "inside", end: 100 })]);
    expect(xAxis.axisLabel).toMatchObject({
      interval: 0,
      hideOverlap: true,
      overflow: "truncate",
      width: 64,
    });
    expect(yAxes.map((axis) => axis.max)).toEqual([100, 750]);
    expect(yAxes[0]?.axisLine.lineStyle.width).toBe(1);
    expect(yAxes[0]?.splitLine.lineStyle).toMatchObject({ width: 1, type: "solid" });
    expect(series.map((item) => [item.name, item.type, item.yAxisIndex])).toEqual([
      ["平均分", "bar", 1],
      ["优秀率", "line", 0],
      ["合格率", "line", 0],
    ]);
    expect(series[0]?.barWidth).toBe(6);
    expect(series[1]?.lineStyle?.width).toBe(1.5);
    expect(series[2]?.lineStyle?.width).toBe(1.5);
  });

  it("adds a horizontal slider when the x-axis contains more than seven categories", () => {
    const palette = getDigitalTwinMapTheme("cyan").chartPalette;
    const longData = Array.from({ length: 12 }, (_, index) => ({
      ...academicTrendData[index % academicTrendData.length]!,
      label: `第${index + 1}次考试`,
    }));
    const option = createAcademicTrendChartOption(longData, palette);
    const grid = option.grid as { bottom: number };
    const dataZoom = option.dataZoom as Array<{ type: string; end: number }>;
    const xAxis = option.xAxis as { axisLabel: { interval: string | number } };

    expect(grid.bottom).toBe(48);
    expect(dataZoom.map((item) => item.type)).toEqual(["inside", "slider"]);
    expect(dataZoom[0]?.end).toBeLessThan(100);
    expect(xAxis.axisLabel.interval).toBe("auto");
  });

  it("uses the active visualization theme palette for canvas colors", () => {
    const cyan = getDigitalTwinMapTheme("cyan").chartPalette;
    const amber = getDigitalTwinMapTheme("amber").chartPalette;
    const cyanOption = createAcademicTrendChartOption(academicTrendData, cyan);
    const amberOption = createAcademicTrendChartOption(academicTrendData, amber);

    expect(cyanOption.color).toEqual([
      cyan.series1.strong,
      cyan.series2.strong,
      cyan.series3.strong,
    ]);
    expect(amberOption.color).toEqual([
      amber.series1.strong,
      amber.series2.strong,
      amber.series3.strong,
    ]);
  });
});
