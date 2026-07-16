import { describe, expect, it } from "vitest";
import { buildEnergyTowerData, townshipEnergyGridCellSizeDegrees } from "../energy-tower-data";
import { rongchengEducationLocations } from "../education-locations";
import { filterLocationsForMapState, initialMapState, loadMapLevel } from "../map-data-adapter";

describe("energy tower data", () => {
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
    expect(towers.length).toBeGreaterThan(1);
    expect(towers.reduce((sum, tower) => sum + tower.value, 0)).toBe(schoolCount);
    expect(towers.every((tower) => tower.feature && !tower.location)).toBe(true);
    expect(towers.every((tower) => tower.schoolNames?.length === tower.value)).toBe(true);
    expect(townshipEnergyGridCellSizeDegrees).toBe(0.025);
  });
});
