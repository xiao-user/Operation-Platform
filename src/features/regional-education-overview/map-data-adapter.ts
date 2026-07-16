import rongchengTownships from "@/assets/maps/rongcheng-townships.json";
import rongchengRegionalContext from "@/assets/maps/rongcheng-regional-context.json";
import rongchengDistrictBoundary from "@/assets/maps/rongcheng-district-boundary.json";
import type { GeoFeature, GeoFeatureCollection } from "./geo";
import { featureContainsCoordinate } from "./geo";
import type { EducationLocation } from "./types";

type MapScope = "district" | "township";

export interface MapState {
  readonly scope: MapScope;
  readonly regionName: string;
  readonly code: string;
  readonly geoData: GeoFeatureCollection;
  readonly terminal: boolean;
  readonly focusFeatureCode?: string;
}

export const regionalContextGeoData = rongchengRegionalContext as unknown as GeoFeatureCollection;
export const districtBoundaryGeoData = rongchengDistrictBoundary as unknown as GeoFeatureCollection;

export const initialMapState: MapState = {
  scope: "district",
  regionName: "榕城区",
  code: "445202",
  geoData: rongchengTownships as unknown as GeoFeatureCollection,
  terminal: false,
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
    code,
    geoData: initialMapState.geoData,
    terminal: true,
    focusFeatureCode: code,
  };
}

/**
 * Resolves the local prototype dataset synchronously.
 * A future API-backed adapter should implement a separate asynchronous repository
 * instead of making in-memory lookup appear to prefetch or perform network I/O.
 */
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

export function boundaryFeatureForMapState(state: MapState) {
  if (state.scope === "district") return districtBoundaryGeoData.features[0];
  return state.focusFeatureCode
    ? townshipFeaturesByCode.get(state.focusFeatureCode)
    : undefined;
}
