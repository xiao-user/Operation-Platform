import { describe, expect, it } from "vitest";
import { buildEnergyTowerData } from "@/features/digital-twin/energy-tower-data";
import { smartSportsMapDataSource } from "../smart-sports-map-data-source";
import {
  createSmartSportsEnergyTowerValueFrame,
  remapEnergyTowerValues,
} from "../smart-sports-energy-tower-values";

describe("smart sports energy tower value frame", () => {
  it("maps overview coverage onto the stable tower topology", () => {
    const frame = createSmartSportsEnergyTowerValueFrame(
      "overview",
      smartSportsMapDataSource.initialState,
    );
    expect(frame?.metricLabel).toBe("覆盖人数");
    expect(Object.keys(frame?.values ?? {})).toHaveLength(21);
    expect(Object.values(frame?.values ?? {}).reduce((sum, value) => sum + value, 0))
      .toBe(frame?.total);
  });

  it("remaps the same spatial weights onto running people totals", () => {
    const overlay = createSmartSportsEnergyTowerValueFrame(
      "running",
      smartSportsMapDataSource.initialState,
    );

    expect(overlay?.metricLabel).toBe("运动人数");
    expect(overlay?.total).toBe(272_606);
    expect(Object.values(overlay?.values ?? {}).reduce((sum, value) => sum + value, 0))
      .toBe(272_606);
    expect(Object.keys(overlay?.values ?? {})).toHaveLength(21);

    const towers = buildEnergyTowerData({
      ...smartSportsMapDataSource.initialState,
      energyTowerValues: overlay!.values,
      energyTowerTotal: overlay!.total,
      energyTowerMetricLabel: overlay!.metricLabel,
    }, []);
    expect(towers.every((tower) => tower.valueLabel.startsWith("运动人数 "))).toBe(true);
    expect(towers.reduce((sum, tower) => sum + tower.value, 0)).toBe(272_606);
  });

  it("remaps the same spatial weights onto assessment people totals", () => {
    const overlay = createSmartSportsEnergyTowerValueFrame(
      "assessment",
      smartSportsMapDataSource.initialState,
    );

    expect(overlay?.metricLabel).toBe("体测人数");
    expect(overlay?.total).toBe(18_897_436);
    expect(Object.values(overlay?.values ?? {}).reduce((sum, value) => sum + value, 0))
      .toBe(18_897_436);
  });

  it("preserves relative ordering while remapping totals", () => {
    const remapped = remapEnergyTowerValues({
      a: 100,
      b: 50,
      c: 50,
    }, 40);

    expect(remapped.total).toBe(40);
    expect(remapped.values.a).toBeGreaterThan(remapped.values.b!);
    expect(remapped.values.b).toBe(remapped.values.c);
    expect(Object.values(remapped.values).reduce((sum, value) => sum + value, 0)).toBe(40);
  });

  it("derives cumulative tower totals from the selected date range", () => {
    const shortRange = createSmartSportsEnergyTowerValueFrame(
      "running",
      smartSportsMapDataSource.initialState,
      ["2026-07-17", "2026-07-23"],
    );
    const longRange = createSmartSportsEnergyTowerValueFrame(
      "running",
      smartSportsMapDataSource.initialState,
      ["2026-06-24", "2026-07-23"],
    );

    expect(shortRange!.total).toBeLessThan(longRange!.total);
    expect(Object.values(shortRange!.values).reduce((sum, value) => sum + value, 0))
      .toBe(shortRange!.total);
    expect(Object.values(longRange!.values).reduce((sum, value) => sum + value, 0))
      .toBe(longRange!.total);
  });
});
