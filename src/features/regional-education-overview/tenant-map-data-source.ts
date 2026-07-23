import {
  createAdministrativeBoundaryProviderChain,
  createAdministrativeMapDataSource,
  createStaticAdministrativeBoundaryProvider,
} from "./administrative-map-data-source";
import type { AdministrativeBoundaryProvider } from "./administrative-map-data-source";
import { findAdministrativeBoundary } from "./administrative-boundary-service";
import { createCoveragePopulationMapDataSource } from "./coverage-population-map-data-source";
import type { GeoFeatureCollection } from "./geo";
import type { MapScope, MapState } from "./map-state";
import type { MapDataSource } from "./map-data-source";
import { mapScopeDepth } from "./map-scope";
import { institutionNetworkScopes } from "./map-presentation-policy";
import { createPublicAdministrativeBoundaryProvider } from "./public-administrative-boundary-provider";
import { smartSportsMapDataSource } from "./smart-sports-map-data-source";
import type { TenantAdministrativeRegion } from "@/types/user";

export type TenantMapMode = "regional-education" | "smart-sports";

export const rongchengEducationTenantId = "bureau-74b5bcaf-69af-4cf2-8c63-11f9270d4676";

export interface TenantMapDataSourceRequest {
  readonly tenantId: string;
  readonly region: TenantAdministrativeRegion;
  readonly mode: TenantMapMode;
  readonly signal?: AbortSignal;
}

interface TenantBoundaryOverrideDescriptor {
  readonly modes: readonly TenantMapMode[];
  readonly regionCode: string;
  readonly terminalScope: MapScope;
  readonly boundaryDataNotice?: string;
  load(): Promise<TenantBoundaryOverrideData | undefined>;
}

interface TenantBoundaryOverrideData {
  readonly boundary: GeoFeatureCollection["features"][number];
  readonly children: GeoFeatureCollection;
}

const tenantBoundaryOverrides = new Map<string, TenantBoundaryOverrideDescriptor>([[
  rongchengEducationTenantId,
  {
    modes: ["regional-education", "smart-sports"],
    regionCode: "445202",
    terminalScope: "township",
    boundaryDataNotice: "16/16 现行街镇边界 · 数据截止 2025-06-30",
    async load() {
      const { rongchengDistrictBoundaryGeoData, rongchengTownshipGeoData } = await import(
        "./rongcheng-map-data"
      );
      const boundary = rongchengDistrictBoundaryGeoData.features[0];
      return boundary ? { boundary, children: rongchengTownshipGeoData } : undefined;
    },
  },
]]);

function collectionOf(...features: GeoFeatureCollection["features"]): GeoFeatureCollection {
  return { type: "FeatureCollection", features };
}

function defaultTerminalScopeForMode(mode: TenantMapMode): MapScope {
  return mode === "smart-sports" ? "district" : "township";
}

function prototypeCoveragePopulation(region: TenantAdministrativeRegion) {
  if (region.scope === "province") return 20_000_000;
  if (region.scope === "city") return 3_000_000;
  return 500_000;
}

function publicBoundaryProvider(terminalScope: MapScope): AdministrativeBoundaryProvider {
  const terminalDepth = mapScopeDepth(terminalScope);
  return createPublicAdministrativeBoundaryProvider(
    (node) => mapScopeDepth(node.scope) < terminalDepth,
  );
}

async function createInitialState(
  region: TenantAdministrativeRegion,
  terminalScope: MapScope,
  provider: AdministrativeBoundaryProvider,
  boundaryOverride?: TenantBoundaryOverrideData["boundary"],
  boundaryDataNotice?: string,
  signal?: AbortSignal,
): Promise<MapState> {
  const parentCode = region.path[region.path.length - 2]?.code;
  const boundaryPromise = boundaryOverride
    ? Promise.resolve(boundaryOverride)
    : findAdministrativeBoundary(region.code, parentCode, signal);
  const hasChildLevel = mapScopeDepth(region.scope) < mapScopeDepth(terminalScope);
  const childrenPromise = hasChildLevel
    ? provider.resolveChildren({
        code: region.code,
        name: region.name,
        scope: region.scope,
        boundary: boundaryOverride,
      }, { signal }).then((result) => (
        result.status === "available" ? result.children : undefined
      ))
    : Promise.resolve(undefined);
  const [boundary, children] = await Promise.all([boundaryPromise, childrenPromise]);
  const navigationPath = [{ code: region.code, name: region.name, scope: region.scope }];

  if (children?.features.length) {
    return {
      scope: region.scope,
      regionName: region.name,
      code: region.code,
      geometryKey: `${region.code}-children`,
      projectionKey: `${region.code}-children`,
      geoData: children,
      terminal: false,
      boundaryFeature: boundary,
      navigationPath,
      boundaryDataNotice,
    };
  }

  return {
    scope: region.scope,
    regionName: region.name,
    code: region.code,
    geometryKey: `${region.code}-boundary`,
    projectionKey: `${region.code}-boundary`,
    geoData: collectionOf(boundary),
    terminal: true,
    focusFeatureCode: region.code,
    boundaryFeature: boundary,
    navigationPath,
    boundaryDataNotice,
  };
}

function boundaryOverrideForRequest(
  request: Pick<TenantMapDataSourceRequest, "tenantId" | "region" | "mode">,
): TenantBoundaryOverrideDescriptor | undefined {
  const override = tenantBoundaryOverrides.get(request.tenantId);
  return override?.modes.includes(request.mode) && override.regionCode === request.region.code
    ? override
    : undefined;
}

export function hasTenantLocalEducationMap(
  request: Pick<TenantMapDataSourceRequest, "tenantId" | "region" | "mode">,
) {
  return Boolean(boundaryOverrideForRequest(request));
}

export async function createTenantMapDataSource(
  request: TenantMapDataSourceRequest,
): Promise<MapDataSource> {
  const { region, mode, signal } = request;
  // Guangdong keeps its preloaded first-frame optimization; its navigation is
  // still implemented by the same administrative state machine.
  if (mode === "smart-sports" && region.code === "440000") {
    return smartSportsMapDataSource;
  }

  const overrideDescriptor = boundaryOverrideForRequest(request);
  const override = await overrideDescriptor?.load();
  const terminalScope = overrideDescriptor?.terminalScope ?? defaultTerminalScopeForMode(mode);
  const provider = createAdministrativeBoundaryProviderChain([
    ...(override ? [createStaticAdministrativeBoundaryProvider(
      new Map([[region.code, override.children]]),
    )] : []),
    publicBoundaryProvider(terminalScope),
  ]);

  const administrativeSource = createAdministrativeMapDataSource({
    initialState: await createInitialState(
      region,
      terminalScope,
      provider,
      override?.boundary,
      overrideDescriptor?.boundaryDataNotice,
      signal,
    ),
    provider,
    minimumLocationScope: "district",
    institutionNetworkScopes,
  });

  return mode === "smart-sports"
    ? createCoveragePopulationMapDataSource(administrativeSource, {
        rootCoveragePopulation: prototypeCoveragePopulation(region),
        allocationUnit: 1_000,
      })
    : administrativeSource;
}
