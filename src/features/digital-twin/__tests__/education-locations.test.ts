import { describe, expect, it } from "vitest";
import {
  countLocationsByType,
  rongchengEducationLocations,
  schoolLocations,
} from "../education-locations";

describe("rongcheng education locations", () => {
  it("keeps one bureau and all first-pass public school POIs", () => {
    expect(rongchengEducationLocations).toHaveLength(44);
    expect(schoolLocations).toHaveLength(43);
    expect(countLocationsByType(rongchengEducationLocations)).toEqual({
      bureau: 1,
      primary: 7,
      junior: 12,
      senior: 7,
      comprehensive: 14,
      vocational: 3,
    });
  });

  it("uses unique ids and keeps every coordinate inside the Rongcheng extent", () => {
    const ids = rongchengEducationLocations.map((location) => location.id);
    expect(new Set(ids).size).toBe(ids.length);

    rongchengEducationLocations.forEach((location) => {
      expect(location.coordinateSystem).toBe("GCJ-02");
      const [longitude, latitude] = location.coordinate;
      expect(longitude).toBeGreaterThanOrEqual(116.277156);
      expect(longitude).toBeLessThanOrEqual(116.633936);
      expect(latitude).toBeGreaterThanOrEqual(23.378278);
      expect(latitude).toBeLessThanOrEqual(23.595935);
    });
  });

  it("normalizes legacy OSM locations before they enter the map engine", () => {
    expect(rongchengEducationLocations[1]?.coordinate[0]).toBeCloseTo(116.2988, 3);
    expect(rongchengEducationLocations[1]?.coordinate[1]).toBeCloseTo(23.4680, 3);
  });
});
