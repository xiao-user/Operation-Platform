import type { MapScope } from "./map-state";

export const mapScopeOrder: readonly MapScope[] = [
  "province",
  "city",
  "district",
  "township",
];

export function mapScopeDepth(scope: MapScope) {
  return mapScopeOrder.indexOf(scope);
}
