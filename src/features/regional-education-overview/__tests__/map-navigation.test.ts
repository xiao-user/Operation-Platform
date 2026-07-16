import { describe, expect, it } from "vitest";
import { rongchengEducationLocations } from "../education-locations";
import {
  filterLocationsForMapState,
  boundaryFeatureForMapState,
  initialMapState,
  loadMapLevel,
  regionalContextGeoData,
} from "../map-data-adapter";
import { digitalTwinMapThemes, getDigitalTwinMapTheme } from "../map-themes";

describe("regional education map navigation", () => {
  it("exposes 13 unique public township boundaries under Rongcheng", () => {
    expect(initialMapState.scope).toBe("district");
    expect(initialMapState.terminal).toBe(false);
    expect(initialMapState.geoData.features).toHaveLength(13);
    const codes = initialMapState.geoData.features.map((feature) => feature.properties.code);
    expect(new Set(codes).size).toBe(13);
    expect(codes).toContain("445202017");
  });

  it("provides five flat regional context boundaries around Rongcheng", () => {
    expect(regionalContextGeoData.features.map((feature) => feature.properties.name))
      .toEqual(["揭东区", "普宁市", "潮安区", "潮阳区", "金平区"]);
  });

  it("resolves the animated boundary from the current spatial scope", () => {
    expect(boundaryFeatureForMapState(initialMapState)?.properties).toMatchObject({
      code: "445202",
      name: "榕城区",
    });
    const township = loadMapLevel("445202001");
    expect(boundaryFeatureForMapState(township)?.properties.code).toBe("445202001");
  });

  it("loads a terminal township state and filters locations to its polygon", () => {
    const township = loadMapLevel("445202001");
    const locations = filterLocationsForMapState(rongchengEducationLocations, township);

    expect(township).toMatchObject({
      scope: "township",
      regionName: "榕华街道",
      code: "445202001",
      terminal: true,
      focusFeatureCode: "445202001",
    });
    expect(township.geoData).toBe(initialMapState.geoData);
    expect(locations.length).toBeGreaterThan(0);
    expect(locations.length).toBeLessThan(rongchengEducationLocations.length);
  });

  it("rejects unknown township codes without pretending local lookup is asynchronous", () => {
    expect(() => loadMapLevel("445202999")).toThrow("Unknown Rongcheng map scope");
  });
});

describe("digital twin map themes", () => {
  it("provides three complete switchable themes", () => {
    expect(digitalTwinMapThemes.map((theme) => theme.id)).toEqual(["lime", "cyan", "amber"]);
    for (const theme of digitalTwinMapThemes) {
      expect(theme.primary).toMatch(/^#[0-9A-F]{6}$/i);
      expect(theme.topFill).not.toBe(theme.primary);
      expect(theme.pageBackground).toMatch(/^#[0-9A-F]{6}$/i);
    }
    expect(getDigitalTwinMapTheme("cyan").name).toBe("深海矩阵");
  });
});
