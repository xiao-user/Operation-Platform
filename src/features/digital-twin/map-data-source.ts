import type { GeoFeature } from "./geo";
import type { MapState } from "./map-state";
import type { EducationLocation } from "./types";

export interface MapDataSource {
  readonly initialState: MapState;
  loadChildState(
    state: MapState,
    feature: GeoFeature,
    context?: MapDataLoadContext,
  ): Promise<MapState | undefined>;
  filterLocations(locations: readonly EducationLocation[], state: MapState): EducationLocation[];
  stateForCoordinate(
    coordinate: readonly [number, number],
    state: MapState,
  ): MapState | undefined;
  institutionNetworkAvailable(state: MapState, locations: readonly EducationLocation[]): boolean;
}

export interface MapDataLoadContext {
  readonly signal?: AbortSignal;
}
