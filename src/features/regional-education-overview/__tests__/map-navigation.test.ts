import { describe, expect, it } from "vitest";
import { rongchengEducationLocations } from "../education-locations";
import {
  filterLocationsForMapState,
  boundaryFeatureForMapState,
  initialMapState,
  loadMapLevel,
  regionalContextGeoData,
  townshipMapStateForCoordinate,
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

  it("resolves the township containing a selected school coordinate", () => {
    const school = rongchengEducationLocations.find((location) => location.type !== "bureau");
    expect(school).toBeDefined();
    const township = townshipMapStateForCoordinate(school!.coordinate);

    expect(township).toMatchObject({
      scope: "township",
      terminal: true,
    });
    expect(filterLocationsForMapState([school!], township!)).toEqual([school]);
    expect(townshipMapStateForCoordinate([0, 0])).toBeUndefined();
  });

  it("rejects unknown township codes without pretending local lookup is asynchronous", () => {
    expect(() => loadMapLevel("445202999")).toThrow("Unknown Rongcheng map scope");
  });
});

describe("digital twin map themes", () => {
  it("provides five complete switchable themes including the spectrum palette", () => {
    expect(digitalTwinMapThemes.map((theme) => theme.id)).toEqual([
      "lime",
      "cyan",
      "amber",
      "royal",
      "spectrum",
    ]);
    for (const theme of digitalTwinMapThemes) {
      expect(theme.primary).toMatch(/^#[0-9A-F]{6}$/i);
      expect(theme.topFill).not.toBe(theme.primary);
      expect(theme.bottomFill).toMatch(/^#[0-9A-F]{6}$/i);
      expect(theme.contextFill).toMatch(/^#[0-9A-F]{6}$/i);
      expect(theme.contextFillOpacity).toBeGreaterThanOrEqual(0);
      expect(theme.contextFillOpacity).toBeLessThanOrEqual(1);
      expect(theme.pageBackground).toMatch(/^#[0-9A-F]{6}$/i);
    }
    expect(digitalTwinMapThemes.map((theme) => ({
      fill: theme.contextFill,
      opacity: theme.contextFillOpacity,
    }))).toEqual(Array.from({ length: 5 }, () => ({
      fill: "#707070",
      opacity: 0.06,
    })));
    expect(getDigitalTwinMapTheme("cyan").name).toBe("深海矩阵");
    expect(getDigitalTwinMapTheme("royal")).toMatchObject({
      name: "星河钴蓝",
      primary: "#2B67D1",
      scatter: "#2B67D1",
    });
    expect(getDigitalTwinMapTheme("spectrum")).toMatchObject({
      name: "多维光谱",
      primary: "#2B67D1",
      outline: "#78A8FF",
      internalLine: "rgba(120,168,255,0.42)",
      topFill: "#0A0B0F",
      bottomFill: "#0A0B0F",
      contextFill: "#707070",
      contextFillOpacity: 0.06,
      sideBottom: "#1FDDE0",
      sideTop: "#0071DB",
      labelPointer: "#2B67D1",
      scatter: "#00FFD5",
      ripple: "rgba(43,103,209,0.38)",
      flyLine: "rgba(120,168,255,0.78)",
      hudRing: "rgba(43,103,209,0.2)",
      pageLine: "rgba(43,103,209,0.3)",
      energyTowerPalette: {
        base: "#0D2AC2",
        low: "#00FFD5",
        medium: "#FFC800",
        high: "#FFA97A",
        bottomOpacity: 0.24,
      },
    });
  });
});
