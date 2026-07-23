import { describe, expect, it } from "vitest";
import { featureContainsCoordinate } from "../geo";
import type { GeoFeature } from "../geo";

const square: GeoFeature = {
  type: "Feature",
  properties: { code: "square", name: "测试区域" },
  geometry: {
    type: "Polygon",
    coordinates: [[
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ]],
  },
};

describe("featureContainsCoordinate", () => {
  it("treats coordinates on an administrative boundary as inside", () => {
    expect(featureContainsCoordinate(square, [5, 0])).toBe(true);
    expect(featureContainsCoordinate(square, [0, 0])).toBe(true);
  });

  it("rejects coordinates outside the polygon", () => {
    expect(featureContainsCoordinate(square, [11, 5])).toBe(false);
  });
});
