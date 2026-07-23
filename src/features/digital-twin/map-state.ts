import type { GeoFeature, GeoFeatureCollection } from "./geo";

export type MapScope = "province" | "city" | "district" | "township";
export type MapContextPresentation = "peers";
export type EnergyTowerMetric = "school-count" | "coverage-population";

export interface MapNavigationNode {
  readonly code: string;
  readonly name: string;
  readonly scope: MapScope;
}

export interface MapState {
  readonly scope: MapScope;
  readonly regionName: string;
  readonly parentRegionName?: string;
  readonly code: string;
  readonly geometryKey: string;
  readonly projectionKey?: string;
  readonly geoData: GeoFeatureCollection;
  readonly terminal: boolean;
  readonly focusFeatureCode?: string;
  readonly boundaryFeature?: GeoFeature;
  readonly contextGeoData?: GeoFeatureCollection;
  readonly projectionGeoData?: GeoFeatureCollection;
  readonly contextInteractive?: boolean;
  readonly contextPresentation?: MapContextPresentation;
  readonly contextRegionCode?: string;
  readonly contextGeometryKey?: string;
  readonly externalGeoData?: GeoFeatureCollection;
  readonly externalRegionCode?: string;
  readonly externalGeometryKey?: string;
  readonly externalInteractive?: boolean;
  readonly navigationPath?: readonly MapNavigationNode[];
  readonly boundaryDataNotice?: string;
  readonly energyTowerMetric?: EnergyTowerMetric;
  readonly energyTowerValues?: Readonly<Record<string, number>>;
  readonly energyTowerTotal?: number;
  readonly energyTowerMetricSource?: "location-aggregation" | "virtual-prototype";
}
