import { describe, expect, it } from "vitest";
import { wgs84CollectionToGcj02, wgs84ToGcj02 } from "../coordinate-system";
import type { GeoFeatureCollection } from "../geo";

describe("GCJ-02 coordinate normalization", () => {
  it("converts a mainland WGS84 point without mutating the source", () => {
    const source = [116.2941067, 23.4705592] as const;
    const converted = wgs84ToGcj02(source);

    expect(converted[0]).toBeCloseTo(116.2988, 3);
    expect(converted[1]).toBeCloseTo(23.4680, 3);
    expect(source).toEqual([116.2941067, 23.4705592]);
  });

  it("keeps coordinates outside mainland China unchanged", () => {
    expect(wgs84ToGcj02([2.3522, 48.8566])).toEqual([2.3522, 48.8566]);
  });

  it("converts geometry, center and centroid through one collection boundary", () => {
    const source: GeoFeatureCollection = {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: {
          code: "445202",
          center: [116.35, 23.53],
          centroid: [116.36, 23.54],
        },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [116.34, 23.52],
            [116.36, 23.52],
            [116.36, 23.54],
            [116.34, 23.52],
          ]],
        },
      }],
    };

    const converted = wgs84CollectionToGcj02(source);

    expect(converted).not.toBe(source);
    expect(converted.coordinateSystem).toBe("GCJ-02");
    expect(converted.features[0]?.geometry.coordinates[0]?.[0]?.[0])
      .toBeGreaterThan(116.344);
    expect(converted.features[0]?.properties.center?.[0]).toBeGreaterThan(116.354);
    const convertedCentroid = converted.features[0]?.properties.centroid as
      | [number, number]
      | undefined;
    expect(convertedCentroid?.[0]).toBeGreaterThan(116.364);
    expect(source.features[0]?.geometry.coordinates[0]?.[0]?.[0]).toBe(116.34);
  });
});
