import type { GeoFeature, GeoFeatureCollection } from "./geo";
import type { MapState } from "./map-state";
import type { MapDataSource } from "./map-data-source";

export interface CoveragePopulationOptions {
  readonly rootCoveragePopulation: number;
  readonly allocationUnit?: number;
}

export interface CoveragePopulationMapDataSource extends MapDataSource {
  resetCoveragePopulationCache(): void;
}

function featureCode(feature: GeoFeature) {
  const code = feature.properties.code ?? feature.properties.adcode;
  return code === undefined ? undefined : String(code);
}

function stableFeatureWeight(feature: GeoFeature) {
  const seed = `${featureCode(feature) ?? ""}:${feature.properties.name ?? ""}`;
  let hash = 2_166_136_261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  // A bounded deterministic spread gives the prototype believable regional
  // differences without making one synthetic outlier dominate the map.
  return 0.55 + (Math.abs(hash) % 1_001) / 1_000;
}

export function allocateCoveragePopulation(
  total: number,
  collection: GeoFeatureCollection,
  allocationUnit = 1_000,
) {
  const features = collection.features.flatMap((feature) => (
    featureCode(feature) ? [feature] : []
  ));
  if (features.length === 0) return {};
  const safeUnit = Math.max(1, Math.round(allocationUnit));
  const totalUnits = Math.max(features.length, Math.round(Math.max(0, total) / safeUnit));
  const weights = features.map(stableFeatureWeight);
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const rawUnits = weights.map((weight) => totalUnits * weight / weightTotal);
  const units = rawUnits.map((value) => Math.max(1, Math.floor(value)));
  let remaining = totalUnits - units.reduce((sum, value) => sum + value, 0);
  const remainderOrder = rawUnits
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((left, right) => right.remainder - left.remainder || left.index - right.index);
  for (let index = 0; remaining > 0; index += 1, remaining -= 1) {
    units[remainderOrder[index % remainderOrder.length]!.index]! += 1;
  }
  for (let index = units.length - 1; remaining < 0 && index >= 0; index -= 1) {
    const removable = Math.min(units[index]! - 1, -remaining);
    units[index]! -= removable;
    remaining += removable;
  }
  return Object.fromEntries(features.map((feature, index) => [
    featureCode(feature)!,
    units[index]! * safeUnit,
  ]));
}

function stateWithCoverage(
  state: MapState,
  total: number,
  values: Readonly<Record<string, number>>,
): MapState {
  return {
    ...state,
    energyTowerMetric: "coverage-population",
    energyTowerValues: values,
    energyTowerTotal: total,
    energyTowerMetricSource: "virtual-prototype",
  };
}

export function createCoveragePopulationMapDataSource(
  source: MapDataSource,
  options: CoveragePopulationOptions,
): CoveragePopulationMapDataSource {
  const allocationUnit = Math.max(1, Math.round(options.allocationUnit ?? 1_000));
  const rootTotal = Math.max(
    allocationUnit,
    Math.round(options.rootCoveragePopulation / allocationUnit) * allocationUnit,
  );
  const totalsByCode = new Map<string, number>();
  const allocationsByParentCode = new Map<string, Readonly<Record<string, number>>>();

  const allocateChildren = (
    parentCode: string,
    total: number,
    children: GeoFeatureCollection,
  ) => {
    const cached = allocationsByParentCode.get(parentCode);
    if (cached && children.features.every((feature) => {
      const code = featureCode(feature);
      return code !== undefined && cached[code] !== undefined;
    })) return cached;
    const values = allocateCoveragePopulation(total, children, allocationUnit);
    allocationsByParentCode.set(parentCode, values);
    for (const [code, value] of Object.entries(values)) totalsByCode.set(code, value);
    return values;
  };

  const reset = () => {
    totalsByCode.clear();
    allocationsByParentCode.clear();
    totalsByCode.set(source.initialState.code, rootTotal);
  };
  reset();
  const rootValues = allocateChildren(
    source.initialState.code,
    rootTotal,
    source.initialState.geoData,
  );
  const initialState = stateWithCoverage(source.initialState, rootTotal, rootValues);

  const decorateNextState = (previous: MapState, next: MapState, selectedCode: string) => {
    const selectedTotal = totalsByCode.get(selectedCode)
      ?? previous.energyTowerValues?.[selectedCode]
      ?? Math.max(allocationUnit, previous.energyTowerTotal ?? rootTotal);
    totalsByCode.set(selectedCode, selectedTotal);
    const keepsCurrentBand = (
      next.geoData === previous.geoData
      || next.geometryKey === previous.geometryKey
    );
    const values = next.terminal && next.focusFeatureCode
      ? { [next.focusFeatureCode]: selectedTotal }
      : keepsCurrentBand && previous.energyTowerValues
        ? previous.energyTowerValues
        : allocateChildren(selectedCode, selectedTotal, next.geoData);
    return stateWithCoverage(next, selectedTotal, values);
  };

  return {
    initialState,
    async loadChildState(state, feature, context) {
      const next = await source.loadChildState(state, feature, context);
      const code = featureCode(feature);
      return next && code ? decorateNextState(state, next, code) : next;
    },
    filterLocations: (locations, state) => source.filterLocations(locations, state),
    stateForCoordinate(coordinate, state) {
      const next = source.stateForCoordinate(coordinate, state);
      return next ? decorateNextState(state, next, next.code) : undefined;
    },
    institutionNetworkAvailable: (state, locations) => (
      source.institutionNetworkAvailable(state, locations)
    ),
    resetCoveragePopulationCache() {
      reset();
      allocateChildren(source.initialState.code, rootTotal, source.initialState.geoData);
    },
  };
}
