import {
  createAdministrativeBoundaryProviderChain,
  createAdministrativeMapDataSource,
} from "@/features/digital-twin/administrative-map-data-source";
import {
  clearAdministrativeBoundaryCacheForTests,
  normalizeAdministrativeCollection,
} from "@/features/digital-twin/administrative-boundary-service";
import { createCoveragePopulationMapDataSource } from "@/features/digital-twin/coverage-population-map-data-source";
import type { MapState } from "@/features/digital-twin/map-state";
import { institutionNetworkScopes } from "@/features/digital-twin/map-presentation-policy";
import { createPublicAdministrativeBoundaryProvider } from "@/features/digital-twin/public-administrative-boundary-provider";
import guangdongCities from "@/assets/maps/guangdong-cities.json";

const guangdongSmartSportsCoveragePopulation = 20_000_000;

const initialState: MapState = {
  scope: "province",
  regionName: "广东省",
  code: "440000",
  geometryKey: "440000-children",
  projectionKey: "440000-children",
  geoData: normalizeAdministrativeCollection(guangdongCities),
  terminal: false,
  navigationPath: [{ code: "440000", name: "广东省", scope: "province" }],
};

const publicAdministrativeBoundaryProvider = createPublicAdministrativeBoundaryProvider(
  (node) => node.scope === "province" || node.scope === "city",
);

const administrativeMapDataSource = createAdministrativeMapDataSource({
  initialState,
  provider: createAdministrativeBoundaryProviderChain([
    publicAdministrativeBoundaryProvider,
  ]),
  minimumLocationScope: "district",
  institutionNetworkScopes,
});

export const smartSportsMapDataSource = createCoveragePopulationMapDataSource(
  administrativeMapDataSource,
  {
    rootCoveragePopulation: guangdongSmartSportsCoveragePopulation,
    allocationUnit: 1_000,
  },
);

export function clearSmartSportsMapCacheForTests() {
  clearAdministrativeBoundaryCacheForTests();
  smartSportsMapDataSource.resetCoveragePopulationCache();
}
