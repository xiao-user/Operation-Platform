import type { GeoFeature, Position } from "./geo";
import { featureContainsCoordinate } from "./geo";
import type { MapState } from "./map-state";
import { featureVisualCenter } from "./rendering/map-projection";
import type { EducationLocation } from "./types";

export interface EnergyTowerDatum {
  readonly id: string;
  readonly name: string;
  readonly coordinate: Position;
  readonly value: number;
  readonly valueLabel: string;
  readonly feature?: GeoFeature;
  readonly location?: EducationLocation;
  readonly schoolNames?: readonly string[];
  readonly metric: "school-count" | "coverage-population";
}

export const townshipEnergyGridCellSizeDegrees = 0.025;

export function formatCoveragePopulation(value: number) {
  const safeValue = Math.max(0, Math.round(value));
  if (safeValue >= 10_000) {
    const valueInTenThousands = safeValue / 10_000;
    const maximumFractionDigits = valueInTenThousands >= 100 ? 0 : 1;
    return `${new Intl.NumberFormat("zh-CN", {
      maximumFractionDigits,
    }).format(valueInTenThousands)} 万人`;
  }
  if (safeValue >= 1_000) {
    return `${new Intl.NumberFormat("zh-CN", {
      maximumFractionDigits: 1,
    }).format(safeValue / 1_000)} 千人`;
  }
  return `${safeValue} 人`;
}

export function buildEnergyTowerData(
  mapState: MapState,
  locations: readonly EducationLocation[],
  townshipGridCellSizeDegrees = townshipEnergyGridCellSizeDegrees,
): EnergyTowerDatum[] {
  if (mapState.energyTowerMetric === "coverage-population") {
    return mapState.geoData.features.flatMap((feature) => {
      const coordinate = featureVisualCenter(feature);
      const code = feature.properties.code;
      if (!coordinate || typeof code !== "string") return [];
      const value = Math.max(0, Math.round(mapState.energyTowerValues?.[code] ?? 0));
      if (value === 0) return [];
      const metricLabel = mapState.energyTowerMetricLabel ?? "覆盖人数";
      return [{
        id: code,
        name: feature.properties.name ?? "未命名区域",
        coordinate,
        value,
        valueLabel: `${metricLabel} ${formatCoveragePopulation(value)}`,
        feature,
        metric: "coverage-population" as const,
      }];
    });
  }

  const schools = locations.filter((location) => location.type !== "bureau");
  if (mapState.scope === "township") {
    const feature = mapState.geoData.features.find(
      (item) => item.properties.code === mapState.focusFeatureCode,
    );
    if (!feature || schools.length === 0) return [];
    const cells = new Map<string, { column: number; row: number; schools: EducationLocation[] }>();
    const cellSize = Math.max(0.001, townshipGridCellSizeDegrees);
    for (const school of schools) {
      const column = Math.floor(school.coordinate[0] / cellSize);
      const row = Math.floor(school.coordinate[1] / cellSize);
      const key = `${column}-${row}`;
      const cell = cells.get(key) ?? { column, row, schools: [] };
      cell.schools.push(school);
      cells.set(key, cell);
    }
    return [...cells.values()].map((cell) => {
      const coordinate: Position = [
        cell.schools.reduce((sum, school) => sum + school.coordinate[0], 0) / cell.schools.length,
        cell.schools.reduce((sum, school) => sum + school.coordinate[1], 0) / cell.schools.length,
      ];
      return {
        id: `township-${mapState.code}-${cell.column}-${cell.row}`,
        name: mapState.regionName,
        coordinate,
        value: cell.schools.length,
        valueLabel: `${cell.schools.length} 所学校`,
        feature,
        schoolNames: cell.schools.map((school) => school.name),
        metric: "school-count" as const,
      };
    });
  }

  return mapState.geoData.features.flatMap((feature) => {
    const coordinate = featureVisualCenter(feature);
    if (!coordinate) return [];
    const count = schools.filter((school) => (
      featureContainsCoordinate(feature, school.coordinate)
    )).length;
    if (count === 0) return [];
    const code = feature.properties.code;
    return [{
      id: typeof code === "string" ? code : `region-${coordinate.join("-")}`,
      name: feature.properties.name ?? "未命名镇街",
      coordinate,
      value: count,
      valueLabel: `${count} 所学校`,
      feature,
      metric: "school-count" as const,
    }];
  });
}
