import type { MapCameraView } from "../types";

export type MapVisualColorKey =
  | "regionTop"
  | "sideTop"
  | "sideBottom"
  | "outline"
  | "internalLine"
  | "hover"
  | "inactiveRegion"
  | "contextLine"
  | "groundFill"
  | "groundGrid"
  | "boundaryHead"
  | "boundaryTail"
  | "hudRing"
  | "institutionDefault"
  | "institutionSelected"
  | "institutionBureau"
  | "institutionRipple"
  | "connection"
  | "energyTower"
  | "energyTowerGlow";

type MapVisualColorOverrides = Partial<Record<MapVisualColorKey, string>>;

/**
 * Temporary, presentation-only controls for the map renderer.
 *
 * District and township values intentionally remain separate: they describe
 * two different spatial states and must not be inferred from each other.
 */
export interface MapVisualTuning {
  offsetX: number;
  offsetY: number;
  scale: number;
  rotationZ: number;
  autoRotationEnabled: boolean;
  autoRotationSpeed: number;
  autoRotationResumeDelaySeconds: number;
  cameraFov: number;
  cameraPositionX: number;
  cameraPositionY: number;
  cameraPositionZ: number;
  cameraTargetX: number;
  cameraTargetY: number;
  cameraTargetZ: number;
  districtFramingOffsetX: number;
  contextLineOpacity: number;
  groundFillOpacity: number;
  groundGridOpacity: number;
  ambientLightIntensity: number;
  directionalLightIntensity: number;
  regionBaseOpacity: number;
  regionTerrainOpacity: number;
  regionTerrainVariationStrength: number;
  regionTerrainEmissiveIntensity: number;
  regionSideTopOpacity: number;
  regionSideBottomOpacityScale: number;
  regionInternalBoundaryOpacityScale: number;
  regionTopContourOpacity: number;
  districtThickness: number;
  districtHoverThickness: number;
  districtHoverOpacity: number;
  townshipFocusDistance: number;
  townshipCameraPositionZ: number;
  townshipEnergyTowerTargetZ: number;
  townshipFocusFramingOffsetX: number;
  townshipFocusFramingOffsetY: number;
  townshipFocusThickness: number;
  townshipFocusHoverThickness: number;
  townshipFocusLift: number;
  townshipSiblingThickness: number;
  townshipSiblingBaseZ: number;
  townshipSiblingHoverThickness: number;
  townshipSiblingOverlayOpacity: number;
  townshipHoverOpacity: number;
  energyTowerDistrictMinimumHeight: number;
  energyTowerDistrictMaximumHeight: number;
  energyTowerDistrictRadius: number;
  energyTowerTownshipMinimumHeight: number;
  energyTowerTownshipMaximumHeight: number;
  energyTowerTownshipRadius: number;
  energyTowerTownshipGridCellSizeDegrees: number;
  energyTowerProvinceHeightScale: number;
  energyTowerProvinceRadiusScale: number;
  energyTowerCityHeightScale: number;
  energyTowerCityRadiusScale: number;
  energyTowerDistrictHeightScale: number;
  energyTowerDistrictRadiusScale: number;
  energyTowerTownshipHeightScale: number;
  energyTowerTownshipRadiusScale: number;
  energyTowerCoverageHeightContrast: number;
  energyTowerHeightExponent: number;
  energyTowerCurveFactor: number;
  energyTowerRevealRate: number;
  energyTowerLabelCycleSeconds: number;
  energyTowerVerticalGridCount: number;
  energyTowerRingGridCount: number;
  energyTowerFadeFloor: number;
  energyTowerFadeEnd: number;
  energyTowerGlowRadiusScale: number;
  energyTowerGlowOpacity: number;
  energyTowerGlowMidpoint: number;
  energyTowerGlowMidAlpha: number;
  energyTowerGridLineWidth: number;
  energyTowerBaseColorStrength: number;
  energyTowerHeightColorStrength: number;
  energyTowerGridColorStrength: number;
  energyTowerTipGlowExponent: number;
  energyTowerTipGlowStrength: number;
  energyTowerHoverColorStrength: number;
  energyTowerBaseOpacity: number;
  energyTowerHeightOpacity: number;
  energyTowerGridOpacity: number;
  energyTowerHoverOpacity: number;
  institutionPointSize: number;
  institutionEmphasisPointSize: number;
  institutionBureauPointSize: number;
  institutionDistrictPointScale: number;
  institutionStemStartHeight: number;
  institutionDistrictStemHeight: number;
  institutionTownshipStemHeight: number;
  institutionSelectedStemHeightScale: number;
  institutionBureauStemHeight: number;
  institutionStemTransitionRate: number;
  institutionSelectionCycleSeconds: number;
  autoFocusDistrictDwellSeconds: number;
  autoFocusTownshipDwellSeconds: number;
  institutionDefaultOpacity: number;
  institutionSelectedOpacity: number;
  institutionHaloInnerRadius: number;
  institutionCoreRadius: number;
  institutionHaloOpacity: number;
  institutionEmphasisHaloOpacity: number;
  institutionRippleOpacityScale: number;
  institutionRippleSpeed: number;
  institutionRippleStartScale: number;
  institutionRippleScaleRange: number;
  connectionBaseOpacity: number;
  connectionFlowOpacityScale: number;
  connectionFlowSpeed: number;
  connectionPulseWidth: number;
  connectionRevealRate: number;
  connectionSurfaceOffset: number;
  connectionMinimumArcHeight: number;
  connectionArcHeightFactor: number;
  hudRingPlateOpacityScale: number;
  hudRingTickOpacityScale: number;
  hudRingRotationSpeed: number;
  boundarySpeed: number;
  boundaryTailLength: number;
  colorOverrides: MapVisualColorOverrides;
}

export const defaultMapVisualTuning: Readonly<MapVisualTuning> = Object.freeze({
  offsetX: -60,
  offsetY: -30,
  scale: 0.8,
  rotationZ: -0,
  autoRotationEnabled: true,
  autoRotationSpeed: 0.2,
  autoRotationResumeDelaySeconds: 10,
  cameraFov: 30,
  cameraPositionX: 34,
  cameraPositionY: -760,
  cameraPositionZ: 520,
  cameraTargetX: -16,
  cameraTargetY: -42,
  cameraTargetZ: 8,
  districtFramingOffsetX: -160,
  contextLineOpacity: 0.18,
  groundFillOpacity: 0,
  groundGridOpacity: 0.3,
  ambientLightIntensity: 1.35,
  directionalLightIntensity: 2.2,
  regionBaseOpacity: 0.75,
  regionTerrainOpacity: 1,
  regionTerrainVariationStrength: 0.05,
  regionTerrainEmissiveIntensity: 0,
  regionSideTopOpacity: 0.86,
  regionSideBottomOpacityScale: 1,
  regionInternalBoundaryOpacityScale: 1,
  regionTopContourOpacity: 0.7,
  districtThickness: 7,
  districtHoverThickness: 12,
  districtHoverOpacity: 0.4,
  townshipFocusDistance: 470,
  townshipCameraPositionZ: 80,
  townshipEnergyTowerTargetZ: 32,
  townshipFocusFramingOffsetX: -100,
  townshipFocusFramingOffsetY: 30,
  townshipFocusThickness: 16,
  townshipFocusHoverThickness: 20,
  townshipFocusLift: 0,
  townshipSiblingThickness: 1.2,
  townshipSiblingBaseZ: 14,
  townshipSiblingHoverThickness: 4,
  townshipSiblingOverlayOpacity: 0.5,
  townshipHoverOpacity: 0.14,
  energyTowerDistrictMinimumHeight: 32,
  energyTowerDistrictMaximumHeight: 180,
  energyTowerDistrictRadius: 36,
  energyTowerTownshipMinimumHeight: 18,
  energyTowerTownshipMaximumHeight: 120,
  energyTowerTownshipRadius: 20,
  energyTowerTownshipGridCellSizeDegrees: 0.025,
  energyTowerProvinceHeightScale: 0.9,
  energyTowerProvinceRadiusScale: 0.9,
  energyTowerCityHeightScale: 0.8,
  energyTowerCityRadiusScale: 0.34,
  energyTowerDistrictHeightScale: 0.63,
  energyTowerDistrictRadiusScale: 0.52,
  energyTowerTownshipHeightScale: 0.82,
  energyTowerTownshipRadiusScale: 0.86,
  energyTowerCoverageHeightContrast: 4,
  energyTowerHeightExponent: 1.05,
  energyTowerCurveFactor: 6.5,
  energyTowerRevealRate: 2.4,
  energyTowerLabelCycleSeconds: 5,
  energyTowerVerticalGridCount: 8,
  energyTowerRingGridCount: 15,
  energyTowerFadeFloor: 0.02,
  energyTowerFadeEnd: 0.09,
  energyTowerGlowRadiusScale: 0.7,
  energyTowerGlowOpacity: 0.23,
  energyTowerGlowMidpoint: 0.36,
  energyTowerGlowMidAlpha: 0.53,
  energyTowerGridLineWidth: 0.08,
  energyTowerBaseColorStrength: 0.26,
  energyTowerHeightColorStrength: 0.74,
  energyTowerGridColorStrength: 0.72,
  energyTowerTipGlowExponent: 2,
  energyTowerTipGlowStrength: 1.8,
  energyTowerHoverColorStrength: 0.55,
  energyTowerBaseOpacity: 0.7,
  energyTowerHeightOpacity: 0.6,
  energyTowerGridOpacity: 0.07,
  energyTowerHoverOpacity: 0.2,
  institutionPointSize: 20,
  institutionEmphasisPointSize: 30,
  institutionBureauPointSize: 27,
  institutionDistrictPointScale: 0.72,
  institutionStemStartHeight: 1.5,
  institutionDistrictStemHeight: 24,
  institutionTownshipStemHeight: 14,
  institutionSelectedStemHeightScale: 2.45,
  institutionBureauStemHeight: 64,
  institutionStemTransitionRate: 8,
  institutionSelectionCycleSeconds: 5,
  autoFocusDistrictDwellSeconds: 300,
  autoFocusTownshipDwellSeconds: 30,
  institutionDefaultOpacity: 0.56,
  institutionSelectedOpacity: 1,
  institutionHaloInnerRadius: 0.49,
  institutionCoreRadius: 0.17,
  institutionHaloOpacity: 0.1,
  institutionEmphasisHaloOpacity: 0.22,
  institutionRippleOpacityScale: 3,
  institutionRippleSpeed: 0.24,
  institutionRippleStartScale: 0.5,
  institutionRippleScaleRange: 1.7,
  connectionBaseOpacity: 0.2,
  connectionFlowOpacityScale: 3,
  connectionFlowSpeed: 0.14,
  connectionPulseWidth: 0.02,
  connectionRevealRate: 4.5,
  connectionSurfaceOffset: 2.2,
  connectionMinimumArcHeight: 40,
  connectionArcHeightFactor: 0.018,
  hudRingPlateOpacityScale: 0.18,
  hudRingTickOpacityScale: 1,
  hudRingRotationSpeed: 0.18,
  boundarySpeed: 0.055,
  boundaryTailLength: 0.09,
  colorOverrides: Object.freeze({
    contextLine: "#ABABAB",
    groundFill: "#23252F",
    groundGrid: "#FFFFFF",
    inactiveRegion: "#0F131F",
    institutionDefault: "#FFFFFF",
    internalLine: "#2B2D31",
    outline: "#363A44",
  }),
});

// Smart Sports reserves a 160px dashboard band at the bottom of the viewport.
// A positive view offset selects a lower camera sub-frame, which presents the
// geographic scene higher on screen without changing its orbit pivot.
export const smartSportsMapFramingOffsetY = 40;

export function cloneMapVisualTuning(
  tuning: Readonly<MapVisualTuning> = defaultMapVisualTuning,
): MapVisualTuning {
  return {
    ...tuning,
    colorOverrides: { ...tuning.colorOverrides },
  };
}

export function mapVisualColor(
  tuning: Readonly<MapVisualTuning>,
  key: MapVisualColorKey,
  fallback: string,
) {
  return tuning.colorOverrides[key] ?? fallback;
}

const cameraTuningKeys = [
  "cameraFov",
  "cameraPositionX",
  "cameraPositionY",
  "cameraPositionZ",
  "cameraTargetX",
  "cameraTargetY",
  "cameraTargetZ",
] as const;

export function mapCameraViewFromTuning(
  tuning: Pick<MapVisualTuning, typeof cameraTuningKeys[number]>,
): MapCameraView {
  return {
    fov: tuning.cameraFov,
    position: [tuning.cameraPositionX, tuning.cameraPositionY, tuning.cameraPositionZ],
    target: [tuning.cameraTargetX, tuning.cameraTargetY, tuning.cameraTargetZ],
  };
}

export function mapVisualTuningWithCameraView(
  tuning: Readonly<MapVisualTuning>,
  view: Readonly<MapCameraView>,
): MapVisualTuning {
  return {
    ...cloneMapVisualTuning(tuning),
    cameraFov: view.fov,
    cameraPositionX: view.position[0],
    cameraPositionY: view.position[1],
    cameraPositionZ: view.position[2],
    cameraTargetX: view.target[0],
    cameraTargetY: view.target[1],
    cameraTargetZ: view.target[2],
  };
}
