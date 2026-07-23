import {
  createTenantMapDataSource,
  hasTenantLocalMap,
  rongchengEducationTenantId,
} from "@/features/digital-twin/tenant-map-data-source";
import type { TenantAdministrativeRegion } from "@/types/user";

interface RegionalEducationMapDataSourceRequest {
  readonly tenantId: string;
  readonly region: TenantAdministrativeRegion;
  readonly signal?: AbortSignal;
}

const regionalEducationMapProfile = {
  terminalScope: "township",
} as const;

export { rongchengEducationTenantId };

export function hasTenantLocalEducationMap(
  request: Pick<RegionalEducationMapDataSourceRequest, "tenantId" | "region">,
) {
  return hasTenantLocalMap(request);
}

export function createRegionalEducationMapDataSource(
  request: RegionalEducationMapDataSourceRequest,
) {
  return createTenantMapDataSource({
    ...request,
    profile: regionalEducationMapProfile,
  });
}
