import rongchengTownships from "@/assets/maps/rongcheng-townships.json";
import rongchengDistrictBoundary from "@/assets/maps/rongcheng-district-boundary.json";
import { normalizeAdministrativeCollection } from "./administrative-boundary-service";
import { wgs84CollectionToGcj02 } from "./coordinate-system";
import type { GeoFeatureCollection } from "./geo";

export const rongchengTownshipGeoData = normalizeAdministrativeCollection(rongchengTownships);
export const rongchengDistrictBoundaryGeoData = normalizeAdministrativeCollection(
  wgs84CollectionToGcj02(rongchengDistrictBoundary as unknown as GeoFeatureCollection),
);
