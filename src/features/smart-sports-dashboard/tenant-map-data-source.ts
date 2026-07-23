import {
  createTenantMapDataSource,
  hasTenantLocalMap,
} from "@/features/digital-twin/tenant-map-data-source";
import { createCoveragePopulationMapDataSource } from "@/features/digital-twin/coverage-population-map-data-source";
import type { TenantAdministrativeRegion } from "@/types/user";
import { smartSportsMapDataSource } from "./smart-sports-map-data-source";

interface SmartSportsMapDataSourceRequest {
  readonly tenantId: string;
  readonly region: TenantAdministrativeRegion;
  readonly signal?: AbortSignal;
}

function prototypeCoveragePopulation(region: TenantAdministrativeRegion) {
  if (region.scope === "province") return 20_000_000;
  if (region.scope === "city") return 3_000_000;
  return 500_000;
}

const smartSportsMapProfile = {
  terminalScope: "district",
  optimizedSource: (region: TenantAdministrativeRegion) => (
    region.code === "440000" ? smartSportsMapDataSource : undefined
  ),
  transformSource: (
    source: Parameters<typeof createCoveragePopulationMapDataSource>[0],
    region: TenantAdministrativeRegion,
  ) => createCoveragePopulationMapDataSource(source, {
    rootCoveragePopulation: prototypeCoveragePopulation(region),
    allocationUnit: 1_000,
  }),
} as const;

export function hasTenantLocalSportsMap(
  request: Pick<SmartSportsMapDataSourceRequest, "tenantId" | "region">,
) {
  return hasTenantLocalMap(request);
}

export function createSmartSportsMapDataSource(
  request: SmartSportsMapDataSourceRequest,
) {
  return createTenantMapDataSource({
    ...request,
    profile: smartSportsMapProfile,
  });
}
