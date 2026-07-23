import rongchengRegionalContext from "@/assets/maps/rongcheng-regional-context.json";
import { wgs84CollectionToGcj02 } from "../coordinate-system";
import { featureContainsCoordinate } from "../geo";
import type { GeoFeature, GeoFeatureCollection } from "../geo";
import {
  rongchengDistrictBoundaryGeoData,
  rongchengTownshipGeoData,
} from "../rongcheng-map-data";
import type { MapState } from "../map-state";
import type { EducationLocation } from "../types";

export const regionalContextGeoData = wgs84CollectionToGcj02(
  rongchengRegionalContext as unknown as GeoFeatureCollection,
);
export const districtBoundaryGeoData = rongchengDistrictBoundaryGeoData;

export const initialMapState: MapState = {
  scope: "district",
  regionName: "榕城区",
  code: "445202",
  geometryKey: "rongcheng-townships",
  projectionKey: "rongcheng-townships",
  geoData: rongchengTownshipGeoData,
  terminal: false,
  boundaryFeature: districtBoundaryGeoData.features[0],
  externalGeoData: regionalContextGeoData,
  externalGeometryKey: "rongcheng-regional-context",
  externalRegionCode: "445202",
};

const townshipFeaturesByCode = new Map(
  initialMapState.geoData.features.flatMap((feature) => {
    const code = feature.properties.code;
    return typeof code === "string" ? [[code, feature] as const] : [];
  }),
);

function createTownshipMapState(feature: GeoFeature): MapState {
  const code = typeof feature.properties.code === "string" ? feature.properties.code : "unknown";
  return {
    scope: "township",
    regionName: feature.properties.name ?? "未命名镇街",
    parentRegionName: initialMapState.regionName,
    code,
    geometryKey: initialMapState.geometryKey,
    projectionKey: initialMapState.projectionKey,
    geoData: initialMapState.geoData,
    terminal: true,
    focusFeatureCode: code,
    boundaryFeature: feature,
    externalGeoData: initialMapState.externalGeoData,
    externalGeometryKey: initialMapState.externalGeometryKey,
    externalRegionCode: initialMapState.externalRegionCode,
    projectionGeoData: initialMapState.projectionGeoData,
  };
}

export function loadMapLevel(code = initialMapState.code) {
  if (code === initialMapState.code) return initialMapState;
  const feature = townshipFeaturesByCode.get(code);
  if (!feature) throw new Error(`Unknown Rongcheng map scope: ${code}`);
  return createTownshipMapState(feature);
}

export function filterLocationsForMapState(
  locations: readonly EducationLocation[],
  state: MapState,
) {
  if (state.scope === "district") return [...locations];
  const feature = state.focusFeatureCode
    ? townshipFeaturesByCode.get(state.focusFeatureCode)
    : undefined;
  return feature
    ? locations.filter((location) => featureContainsCoordinate(feature, location.coordinate))
    : [];
}

export function townshipMapStateForCoordinate(coordinate: readonly [number, number]) {
  const feature = initialMapState.geoData.features.find((item) => (
    featureContainsCoordinate(item, coordinate)
  ));
  return feature ? createTownshipMapState(feature) : undefined;
}

export function boundaryFeatureForMapState(state: MapState) {
  if (state.boundaryFeature) return state.boundaryFeature;
  if (state.scope === "district") return districtBoundaryGeoData.features[0];
  return state.focusFeatureCode
    ? townshipFeaturesByCode.get(state.focusFeatureCode)
    : undefined;
}
