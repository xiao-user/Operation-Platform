import type { MapCameraView } from "../types";

export type MapVisualColorKey =
  | "regionTop"
  | "sideTop"
  | "sideBottom"
  | "outline"
  | "internalLine"
  | "hover"
  | "inactiveRegion"
  | "contextFill"
  | "contextLine"
  | "boundaryHead"
  | "boundaryTail";

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
  cameraFov: number;
  cameraPositionX: number;
  cameraPositionY: number;
  cameraPositionZ: number;
  cameraTargetX: number;
  cameraTargetY: number;
  cameraTargetZ: number;
  districtFramingOffsetX: number;
  contextFillOpacity: number;
  contextLineOpacity: number;
  districtThickness: number;
  districtHoverLift: number;
  districtHoverOpacity: number;
  townshipFocusDistance: number;
  townshipFocusFramingOffsetX: number;
  townshipFocusFramingOffsetY: number;
  townshipFocusThickness: number;
  townshipFocusLift: number;
  townshipSiblingThickness: number;
  townshipSiblingBaseZ: number;
  townshipSiblingHoverThickness: number;
  townshipSiblingHoverLift: number;
  townshipSiblingOverlayOpacity: number;
  townshipHoverOpacity: number;
  boundarySpeed: number;
  boundaryTailLength: number;
  colorOverrides: MapVisualColorOverrides;
}

export const defaultMapVisualTuning: Readonly<MapVisualTuning> = Object.freeze({
  offsetX: -60,
  offsetY: -0,
  scale: 0.8,
  rotationZ: -0,
  cameraFov: 30,
  cameraPositionX: 34,
  cameraPositionY: -760,
  cameraPositionZ: 520,
  cameraTargetX: -16,
  cameraTargetY: -42,
  cameraTargetZ: 8,
  districtFramingOffsetX: -48,
  contextFillOpacity: 0.07,
  contextLineOpacity: 0.18,
  districtThickness: 7,
  districtHoverLift: 6,
  districtHoverOpacity: 0.4,
  townshipFocusDistance: 470,
  townshipFocusFramingOffsetX: 60,
  townshipFocusFramingOffsetY: -40,
  townshipFocusThickness: 16,
  townshipFocusLift: 0,
  townshipSiblingThickness: 1.2,
  townshipSiblingBaseZ: 14,
  townshipSiblingHoverThickness: 4,
  townshipSiblingHoverLift: 5,
  townshipSiblingOverlayOpacity: 0.5,
  townshipHoverOpacity: 0.14,
  boundarySpeed: 0.055,
  boundaryTailLength: 0.09,
  colorOverrides: Object.freeze({
    inactiveRegion: "#0F131F",
    internalLine: "#363A44",
    outline: "#363A44",
  }),
});

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

export function mapCameraTuningChanged(
  previous: Readonly<MapVisualTuning>,
  next: Readonly<MapVisualTuning>,
) {
  return cameraTuningKeys.some((key) => previous[key] !== next[key]);
}
