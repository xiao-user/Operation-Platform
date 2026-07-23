import type { MapState } from "./map-state";
import { mapScopeDepth } from "./map-scope";

export function mapGeometryChanged(previous: MapState, next: MapState) {
  return previous.geometryKey !== next.geometryKey
    || previous.geoData !== next.geoData;
}

export function mapProjectionChanged(previous: MapState, next: MapState) {
  return previous.projectionKey !== next.projectionKey
    || (previous.projectionGeoData ?? previous.geoData)
      !== (next.projectionGeoData ?? next.geoData);
}

export function mapStructureChanged(previous: MapState, next: MapState) {
  return mapGeometryChanged(previous, next)
    || mapProjectionChanged(previous, next)
    || previous.contextPresentation !== next.contextPresentation
    || previous.contextRegionCode !== next.contextRegionCode
    || previous.contextGeometryKey !== next.contextGeometryKey
    || previous.contextGeoData !== next.contextGeoData
    || previous.externalRegionCode !== next.externalRegionCode
    || previous.externalGeometryKey !== next.externalGeometryKey
    || previous.externalGeoData !== next.externalGeoData;
}

export function entersNestedScopeInSameGeometryBand(previous: MapState, next: MapState) {
  return !mapStructureChanged(previous, next)
    && (
      (next.navigationPath?.length ?? 1) > (previous.navigationPath?.length ?? 1)
      || mapScopeDepth(next.scope) > mapScopeDepth(previous.scope)
    );
}

export function isContextBandFeature(state: MapState, featureCode: string) {
  if (state.geoData.features.some((feature) => feature.properties.code === featureCode)) {
    return false;
  }
  return Boolean(
    state.contextInteractive
      && state.contextGeoData?.features.some(
        (feature) => feature.properties.code === featureCode,
      )
    || state.externalInteractive
      && state.externalGeoData?.features.some(
        (feature) => feature.properties.code === featureCode,
      ),
  );
}
