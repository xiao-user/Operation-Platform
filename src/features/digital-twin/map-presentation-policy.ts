import type { MapScope } from "./map-state";

/** Shared business-layer policy for every dashboard using the administrative map engine. */
export const institutionNetworkScopes = [
  "district",
  "township",
] as const satisfies readonly MapScope[];
