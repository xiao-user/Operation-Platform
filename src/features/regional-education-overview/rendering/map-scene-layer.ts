import type { Object3D } from "three";
import type { DigitalTwinMapTheme } from "../map-themes";
import type { MapVisualTuning } from "./map-visual-tuning";

/** Common lifecycle boundary for every independently owned Three.js map layer. */
export interface MapSceneLayer {
  readonly root: Object3D;
  dispose(): void;
}

/** Disposes a layer batch once per identity while tolerating optional entries. */
export function disposeMapSceneLayers(
  layers: Iterable<MapSceneLayer | undefined>,
) {
  const disposedLayers = new Set<MapSceneLayer>();
  for (const layer of layers) {
    if (!layer || disposedLayers.has(layer)) continue;
    disposedLayers.add(layer);
    layer.dispose();
  }
}

/** Layer whose existing GPU resources can be recolored without rebuilding geometry. */
export interface ThemeAwareMapSceneLayer extends MapSceneLayer {
  applyTheme(theme: DigitalTwinMapTheme, tuning: MapVisualTuning): void;
}

/** Layer whose live visual tuning can be updated without rebuilding the scene. */
export interface TuningAwareMapSceneLayer extends ThemeAwareMapSceneLayer {
  applyTuning(theme: DigitalTwinMapTheme, tuning: MapVisualTuning): void;
}
