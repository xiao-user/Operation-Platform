import { describe, expect, it } from "vitest";
import {
  buildEnergyTowerData,
  formatCoveragePopulation,
  townshipEnergyGridCellSizeDegrees,
} from "../energy-tower-data";
import { rongchengEducationLocations } from "../education-locations";
import {
  filterLocationsForMapState,
  initialMapState,
  loadMapLevel,
} from "./rongcheng-map-fixture";
import { smartSportsMapDataSource } from "@/features/smart-sports-dashboard/smart-sports-map-data-source";

describe("energy tower data", () => {
  it("formats coverage population with stable thousand and ten-thousand units", () => {
    expect(formatCoveragePopulation(680)).toBe("680 人");
    expect(formatCoveragePopulation(8_600)).toBe("8.6 千人");
    expect(formatCoveragePopulation(326_000)).toBe("32.6 万人");
    expect(formatCoveragePopulation(20_000_000)).toBe("2,000 万人");
  });

  it("uses configured coverage values without requiring school locations", () => {
    const feature = initialMapState.geoData.features[0]!;
    const code = String(feature.properties.code);
    const towers = buildEnergyTowerData({
      ...initialMapState,
      energyTowerMetric: "coverage-population",
      energyTowerValues: { [code]: 326_000 },
      energyTowerTotal: 326_000,
      energyTowerMetricSource: "virtual-prototype",
    }, []);

    expect(towers).toHaveLength(1);
    expect(towers[0]).toMatchObject({
      id: code,
      value: 326_000,
      valueLabel: "覆盖人数 32.6 万人",
      metric: "coverage-population",
    });
  });

  it("accepts an injected metric label for coverage-population towers", () => {
    const feature = initialMapState.geoData.features[0]!;
    const code = String(feature.properties.code);
    const towers = buildEnergyTowerData({
      ...initialMapState,
      energyTowerMetric: "coverage-population",
      energyTowerValues: { [code]: 8_600 },
      energyTowerTotal: 8_600,
      energyTowerMetricLabel: "运动人数",
    }, []);

    expect(towers[0]?.valueLabel).toBe("运动人数 8.6 千人");
  });

  it("renders Guangdong coverage atoms whose province sum is 20 million", () => {
    const towers = buildEnergyTowerData(smartSportsMapDataSource.initialState, []);

    expect(towers).toHaveLength(21);
    expect(towers.reduce((sum, tower) => sum + tower.value, 0)).toBe(20_000_000);
    expect(towers.every((tower) => (
      tower.metric === "coverage-population"
      && tower.valueLabel.startsWith("覆盖人数 ")
    ))).toBe(true);
  });

  it("aggregates real schools into child townships without inventing metrics", () => {
    const towers = buildEnergyTowerData(initialMapState, rongchengEducationLocations);
    expect(towers.length).toBeGreaterThan(0);
    expect(towers.every((tower) => tower.feature && tower.value > 0)).toBe(true);
    expect(towers.reduce((sum, tower) => sum + tower.value, 0)).toBeLessThanOrEqual(43);
    expect(towers.every((tower) => tower.valueLabel.endsWith("所学校"))).toBe(true);
  });

  it("aggregates a focused township into fixed logical grid regions", () => {
    const state = loadMapLevel("445202013");
    const locations = filterLocationsForMapState(rongchengEducationLocations, state);
    const towers = buildEnergyTowerData(state, locations);
    const schoolCount = locations.filter((location) => location.type !== "bureau").length;
    expect(towers.length).toBeGreaterThan(0);
    expect(towers.reduce((sum, tower) => sum + tower.value, 0)).toBe(schoolCount);
    expect(towers.every((tower) => tower.feature && !tower.location)).toBe(true);
    expect(towers.every((tower) => tower.schoolNames?.length === tower.value)).toBe(true);
    expect(townshipEnergyGridCellSizeDegrees).toBe(0.025);
  });
});
