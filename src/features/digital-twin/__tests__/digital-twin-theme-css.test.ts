import { describe, expect, it } from "vitest";
import { createDigitalTwinThemeCssVariables } from "../digital-twin-theme-css";
import {
  cloneDigitalTwinMapTheme,
  digitalTwinMapThemes,
  getDigitalTwinMapTheme,
} from "../map-themes";

const chartVariableNames = [
  "--charts--1-100",
  "--charts--1-50",
  "--charts--1-10",
  "--charts--2-100",
  "--charts--2-50",
  "--charts--2-10",
  "--charts--3-100",
  "--charts--3-50",
  "--charts--3-10",
  "--background---ray-charts",
  "--background---e-charts",
] as const;

describe("digital twin chart theme variables", () => {
  it("provides every chart variable for all five visualization themes", () => {
    expect(digitalTwinMapThemes).toHaveLength(5);

    for (const theme of digitalTwinMapThemes) {
      const variables = createDigitalTwinThemeCssVariables(theme);
      for (const variableName of chartVariableNames) {
        expect(variables[variableName], `${theme.id} ${variableName}`).toBeTruthy();
      }
    }
  });

  it("keeps the supplied deep-sea chart palette values intact", () => {
    const variables = createDigitalTwinThemeCssVariables(getDigitalTwinMapTheme("cyan"));

    expect(variables).toMatchObject({
      "--charts--1-100": "rgba(218,244,255,1)",
      "--charts--1-50": "rgba(212,222,236,0.5)",
      "--charts--2-100": "rgba(95,227,255,1)",
      "--charts--3-100": "rgba(198,255,170,1)",
      "--background---ray-charts": "rgba(28,30,35,1)",
      "--background---e-charts": "rgba(15,13,40,1)",
    });
  });

  it("defensively clones the nested chart palette", () => {
    const source = getDigitalTwinMapTheme("cyan");
    const clone = cloneDigitalTwinMapTheme(source);

    expect(clone.chartPalette).not.toBe(source.chartPalette);
    expect(clone.chartPalette.series1).not.toBe(source.chartPalette.series1);
    clone.chartPalette.series1.strong = "#123456";
    expect(source.chartPalette.series1.strong).toBe("rgba(218,244,255,1)");
  });
});
