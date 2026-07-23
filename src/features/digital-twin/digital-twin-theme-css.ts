import type { DigitalTwinMapTheme } from "./map-themes";

export type DigitalTwinThemeCssVariables = Record<`--${string}`, string>;

export function createDigitalTwinThemeCssVariables(
  theme: DigitalTwinMapTheme,
): DigitalTwinThemeCssVariables {
  return {
    "--hud-primary": theme.primary,
    "--hud-accent-strong": theme.outline,
    "--hud-line": theme.pageLine,
    "--hud-text": theme.pageText,
    "--hud-muted": theme.pageMuted,
    "--page-background": theme.pageBackground,
    "--charts--1-100": theme.chartPalette.series1.strong,
    "--charts--1-50": theme.chartPalette.series1.medium,
    "--charts--1-10": theme.chartPalette.series1.subtle,
    "--charts--2-100": theme.chartPalette.series2.strong,
    "--charts--2-50": theme.chartPalette.series2.medium,
    "--charts--2-10": theme.chartPalette.series2.subtle,
    "--charts--3-100": theme.chartPalette.series3.strong,
    "--charts--3-50": theme.chartPalette.series3.medium,
    "--charts--3-10": theme.chartPalette.series3.subtle,
    "--background---ray-charts": theme.chartPalette.rayBackground,
    "--background---e-charts": theme.chartPalette.echartsBackground,
  };
}
