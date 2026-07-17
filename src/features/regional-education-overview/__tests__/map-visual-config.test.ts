import { describe, expect, it } from "vitest";
import { getDigitalTwinMapTheme } from "../map-themes";
import {
  defaultMapVisualTuning,
  mapCameraViewFromTuning,
  mapVisualTuningWithCameraView,
} from "../rendering/map-visual-tuning";

describe("regional map visual configuration", () => {
  it("uses the reviewed side gradients and boundary colors", () => {
    expect(getDigitalTwinMapTheme("lime")).toMatchObject({
      sideTop: "#28E28B",
      sideBottom: "#E1FF00",
    });
    expect(getDigitalTwinMapTheme("cyan")).toMatchObject({
      sideTop: "#00EEFF",
      sideBottom: "#0AFFD6",
    });
    expect(getDigitalTwinMapTheme("amber")).toMatchObject({
      sideTop: "#FFF700",
      sideBottom: "#FA9E00",
    });
    expect(defaultMapVisualTuning.colorOverrides).toMatchObject({
      contextLine: "#ABABAB",
      groundFill: "#23252F",
      groundGrid: "#FFFFFF",
      internalLine: "#2B2D31",
    });
    expect(defaultMapVisualTuning.groundFillOpacity).toBe(0);
    expect(defaultMapVisualTuning.groundGridOpacity).toBe(0.3);
    expect((["lime", "cyan", "amber", "royal", "spectrum"] as const).map((themeId) => {
      const theme = getDigitalTwinMapTheme(themeId);
      return [
        theme.contextFill,
        theme.contextFillOpacity,
        theme.chaseLightHead,
        theme.chaseLightTail,
      ];
    })).toEqual(Array.from(
      { length: 5 },
      () => ["#707070", 0.06, "#FFFFFF", "rgba(255,255,255,0)"],
    ));
    expect(getDigitalTwinMapTheme("spectrum")).toMatchObject({
      topFill: "#0A0B0F",
      bottomFill: "#0A0B0F",
      sideTop: "#0071DB",
      sideBottom: "#1FDDE0",
      contextFill: "#707070",
      contextFillOpacity: 0.06,
    });
  });

  it("keeps the production district, township, and energy-tower defaults", () => {
    expect(defaultMapVisualTuning).toMatchObject({
      districtFramingOffsetX: -160,
      cameraPositionZ: 520,
      townshipCameraPositionZ: 80,
      townshipEnergyTowerTargetZ: 32,
      townshipFocusFramingOffsetX: -100,
      townshipFocusFramingOffsetY: 30,
      energyTowerDistrictMinimumHeight: 32,
      energyTowerDistrictRadius: 36,
      energyTowerTownshipMinimumHeight: 18,
      energyTowerTownshipMaximumHeight: 120,
      energyTowerTownshipRadius: 20,
      energyTowerTownshipGridCellSizeDegrees: 0.025,
      energyTowerBaseOpacity: 0.9,
      regionTerrainEmissiveIntensity: 0,
    });
  });

  it("round-trips camera position and target axes", () => {
    const changed = mapVisualTuningWithCameraView(defaultMapVisualTuning, {
      fov: 36,
      position: [120, -640, 460],
      target: [18, -20, 34],
    });

    expect(mapCameraViewFromTuning(changed)).toEqual({
      fov: 36,
      position: [120, -640, 460],
      target: [18, -20, 34],
    });
  });
});
