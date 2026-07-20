import type { DigitalTwinChartPalette } from "./map-themes";

export interface DigitalTwinChartCanvasTheme {
  series: readonly [string, string, string];
  seriesMedium: readonly [string, string, string];
  seriesSubtle: readonly [string, string, string];
  axisText: string;
  axisLine: string;
  gridLine: string;
  tooltipText: string;
  tooltipBackground: string;
}

const visualizationNeutrals = {
  white90: "rgba(255,255,255,0.9)",
  white50: "rgba(255,255,255,0.5)",
  white30: "rgba(255,255,255,0.3)",
  white10: "rgba(255,255,255,0.1)",
  black80: "rgba(0,0,0,0.8)",
} as const;

export function createDigitalTwinChartCanvasTheme(
  palette: DigitalTwinChartPalette,
): DigitalTwinChartCanvasTheme {
  return {
    series: [
      palette.series1.strong,
      palette.series2.strong,
      palette.series3.strong,
    ],
    seriesMedium: [
      palette.series1.medium,
      palette.series2.medium,
      palette.series3.medium,
    ],
    seriesSubtle: [
      palette.series1.subtle,
      palette.series2.subtle,
      palette.series3.subtle,
    ],
    axisText: visualizationNeutrals.white50,
    axisLine: visualizationNeutrals.white30,
    gridLine: visualizationNeutrals.white10,
    tooltipText: visualizationNeutrals.white90,
    tooltipBackground: visualizationNeutrals.black80,
  };
}
