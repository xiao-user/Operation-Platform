import {
  createAdministrativeBoundaryProviderChain,
  createAdministrativeMapDataSource,
  createStaticAdministrativeBoundaryProvider,
} from "@/features/digital-twin/administrative-map-data-source";
import type { AdministrativeBoundaryProvider } from "@/features/digital-twin/administrative-map-data-source";
import { findAdministrativeBoundary } from "@/features/digital-twin/administrative-boundary-service";
import type { GeoFeatureCollection } from "@/features/digital-twin/geo";
import type { MapScope, MapState } from "@/features/digital-twin/map-state";
import type { MapDataSource } from "@/features/digital-twin/map-data-source";
import { mapScopeDepth } from "@/features/digital-twin/map-scope";
import { institutionNetworkScopes } from "@/features/digital-twin/map-presentation-policy";
import { createPublicAdministrativeBoundaryProvider } from "@/features/digital-twin/public-administrative-boundary-provider";
import type { TenantAdministrativeRegion } from "@/types/user";

export const rongchengEducationTenantId = "bureau-74b5bcaf-69af-4cf2-8c63-11f9270d4676";

export interface TenantMapDataSourceRequest {
  readonly tenantId: string;
  readonly region: TenantAdministrativeRegion;
  readonly profile: TenantMapDataSourceProfile;
  readonly signal?: AbortSignal;
}

export interface TenantMapDataSourceProfile {
  readonly terminalScope: MapScope;
  optimizedSource?(region: TenantAdministrativeRegion): MapDataSource | undefined;
  transformSource?(
    source: MapDataSource,
    region: TenantAdministrativeRegion,
  ): MapDataSource;
}

interface TenantBoundaryOverrideDescriptor {
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
    regionCode: "445202",
    terminalScope: "township",
    boundaryDataNotice: "16/16 现行街镇边界 · 数据截止 2025-06-30",
    async load() {
      const { rongchengDistrictBoundaryGeoData, rongchengTownshipGeoData } = await import(
        "@/features/digital-twin/rongcheng-map-data"
      );
      const boundary = rongchengDistrictBoundaryGeoData.features[0];
      return boundary ? { boundary, children: rongchengTownshipGeoData } : undefined;
    },
  },
]]);

function collectionOf(...features: GeoFeatureCollection["features"]): GeoFeatureCollection {
  return { type: "FeatureCollection", features };
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
  request: Pick<TenantMapDataSourceRequest, "tenantId" | "region">,
): TenantBoundaryOverrideDescriptor | undefined {
  const override = tenantBoundaryOverrides.get(request.tenantId);
  return override?.regionCode === request.region.code
    ? override
    : undefined;
}

export function hasTenantLocalMap(
  request: Pick<TenantMapDataSourceRequest, "tenantId" | "region">,
) {
  return Boolean(boundaryOverrideForRequest(request));
}

export async function createTenantMapDataSource(
  request: TenantMapDataSourceRequest,
): Promise<MapDataSource> {
  const { region, profile, signal } = request;
  const optimizedSource = profile.optimizedSource?.(region);
  if (optimizedSource) return optimizedSource;

  const overrideDescriptor = boundaryOverrideForRequest(request);
  const override = await overrideDescriptor?.load();
  const terminalScope = overrideDescriptor?.terminalScope ?? profile.terminalScope;
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

  return profile.transformSource?.(administrativeSource, region) ?? administrativeSource;
}
