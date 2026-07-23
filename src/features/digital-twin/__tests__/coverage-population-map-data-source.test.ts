import { describe, expect, it } from "vitest";
import {
  allocateCoveragePopulation,
  createCoveragePopulationMapDataSource,
} from "../coverage-population-map-data-source";
import type { GeoFeature, GeoFeatureCollection } from "../geo";
import type { MapDataSource } from "../map-data-source";

function squareFeature(code: string, name: string): GeoFeature {
  return {
    type: "Feature",
    properties: { code, name, level: "district" },
    geometry: {
      type: "Polygon",
      coordinates: [[
        [112, 22],
        [113, 22],
        [113, 23],
        [112, 23],
        [112, 22],
      ]],
    },
  };
}

const districts: GeoFeatureCollection = {
  type: "FeatureCollection",
  features: [
    squareFeature("100101", "甲区"),
    squareFeature("100102", "乙区"),
    squareFeature("100103", "丙区"),
  ],
};

describe("coverage population map data source", () => {
  it("allocates deterministic district atoms whose sum equals the parent total", () => {
    const first = allocateCoveragePopulation(600_000, districts);
    const second = allocateCoveragePopulation(600_000, districts);

    expect(first).toEqual(second);
    expect(Object.values(first).reduce((sum, value) => sum + value, 0)).toBe(600_000);
    expect(Object.values(first).every((value) => value > 0 && value % 1_000 === 0)).toBe(true);
  });

  it("supports a district-level bureau root with a configurable 300-thousand total", async () => {
    const source: MapDataSource = {
      initialState: {
        scope: "district",
        regionName: "示范教育局",
        code: "100100",
        geometryKey: "district-root",
        geoData: districts,
        terminal: false,
      },
      async loadChildState(state, feature) {
        return {
          ...state,
          code: String(feature.properties.code),
          regionName: feature.properties.name ?? "未命名区域",
          terminal: true,
          focusFeatureCode: String(feature.properties.code),
        };
      },
      filterLocations: (locations) => [...locations],
      stateForCoordinate: () => undefined,
      institutionNetworkAvailable: () => false,
    };
    const wrapped = createCoveragePopulationMapDataSource(source, {
      rootCoveragePopulation: 300_000,
    });
    const initialValues = wrapped.initialState.energyTowerValues!;
    const selected = districts.features[0]!;
    const selectedCode = String(selected.properties.code);
    const focused = await wrapped.loadChildState(wrapped.initialState, selected);

    expect(Object.values(initialValues).reduce((sum, value) => sum + value, 0)).toBe(300_000);
    expect(focused?.energyTowerMetric).toBe("coverage-population");
    expect(focused?.energyTowerTotal).toBe(initialValues[selectedCode]);
    expect(focused?.energyTowerValues).toEqual({
      [selectedCode]: initialValues[selectedCode],
    });
  });
});
