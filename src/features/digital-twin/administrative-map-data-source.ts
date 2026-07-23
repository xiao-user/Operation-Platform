import { featureContainsCoordinate } from "./geo";
import type { GeoFeature, GeoFeatureCollection } from "./geo";
import { administrativeScopeForFeature } from "./administrative-boundary-service";
import type {
  MapNavigationNode,
  MapScope,
  MapState,
} from "./map-state";
import type { MapDataLoadContext, MapDataSource } from "./map-data-source";
import { mapScopeDepth, mapScopeOrder } from "./map-scope";
import type { EducationLocation } from "./types";

export interface AdministrativeBoundaryNode extends MapNavigationNode {
  readonly boundary?: GeoFeature;
  readonly childrenHint?: "available" | "unavailable" | "unknown";
}

export type AdministrativeChildrenResult =
  | { readonly status: "available"; readonly children: GeoFeatureCollection }
  | { readonly status: "unavailable" }
  | { readonly status: "unsupported" };

export interface AdministrativeBoundaryProvider {
  resolveChildren(
    node: AdministrativeBoundaryNode,
    context?: MapDataLoadContext,
  ): Promise<AdministrativeChildrenResult>;
}

export interface AdministrativeMapDataSourceOptions {
  readonly initialState: MapState;
  readonly provider: AdministrativeBoundaryProvider;
  readonly minimumLocationScope?: MapScope;
  readonly institutionNetworkScopes?: readonly MapScope[];
  readonly externalInteractionScopes?: readonly MapScope[];
}

function nodeForFeature(feature: GeoFeature): AdministrativeBoundaryNode | undefined {
  const code = feature.properties.code;
  if (typeof code !== "string" || !code) return undefined;
  const scope = administrativeScopeForFeature(feature);
  if (!scope) return undefined;
  return {
    code,
    name: feature.properties.name ?? "未命名行政区",
    scope,
    boundary: feature,
    childrenHint: feature.properties.childrenNum === 0 ? "unavailable" : "unknown",
  };
}

function replaceOrAppendPath(
  path: readonly MapNavigationNode[],
  node: MapNavigationNode,
) {
  const sameScopeIndex = path.findIndex((item) => item.scope === node.scope);
  if (sameScopeIndex >= 0) return [...path.slice(0, sameScopeIndex), node];
  const nodeDepth = mapScopeDepth(node.scope);
  const ancestorPath = path.filter((item) => mapScopeDepth(item.scope) < nodeDepth);
  return [...ancestorPath, node];
}

function collectionHasFeature(collection: GeoFeatureCollection | undefined, code: string) {
  return Boolean(collection?.features.some((feature) => feature.properties.code === code));
}

interface NavigationBands {
  readonly siblings: GeoFeatureCollection;
  readonly siblingsGeometryKey: string;
  readonly outer?: GeoFeatureCollection;
  readonly outerGeometryKey?: string;
  readonly outerRegionCode?: string;
}

function navigationBandsForFeature(state: MapState, code: string): NavigationBands {
  if (collectionHasFeature(state.geoData, code)) {
    const outer = state.contextPresentation === "peers"
      ? state.contextGeoData
      : state.externalGeoData;
    return {
      siblings: state.geoData,
      siblingsGeometryKey: state.geometryKey,
      outer,
      outerGeometryKey: state.contextPresentation === "peers"
        ? state.contextGeometryKey
        : state.externalGeometryKey,
      outerRegionCode: state.contextPresentation === "peers"
        ? state.contextRegionCode
        : state.externalRegionCode,
    };
  }
  if (collectionHasFeature(state.contextGeoData, code)) {
    return {
      siblings: state.contextGeoData!,
      siblingsGeometryKey: state.contextGeometryKey ?? `${state.code}-siblings`,
      outer: state.externalGeoData,
      outerGeometryKey: state.externalGeometryKey,
      outerRegionCode: state.externalRegionCode,
    };
  }
  if (collectionHasFeature(state.externalGeoData, code)) {
    return {
      siblings: state.externalGeoData!,
      siblingsGeometryKey: state.externalGeometryKey ?? `${state.code}-external`,
    };
  }
  return { siblings: state.geoData, siblingsGeometryKey: state.geometryKey };
}

function locationsInsideBoundary(
  locations: readonly EducationLocation[],
  boundary: GeoFeature | undefined,
) {
  return boundary
    ? locations.filter((location) => featureContainsCoordinate(boundary, location.coordinate))
    : [];
}

function terminalState(
  state: MapState,
  node: AdministrativeBoundaryNode,
  path: readonly MapNavigationNode[],
  bands: NavigationBands,
  externalInteractionScopes: ReadonlySet<MapScope>,
): MapState {
  return {
    scope: node.scope,
    regionName: node.name,
    parentRegionName: path[path.length - 2]?.name,
    code: node.code,
    geometryKey: bands.siblingsGeometryKey,
    projectionKey: state.projectionKey,
    geoData: bands.siblings,
    terminal: true,
    focusFeatureCode: node.code,
    boundaryFeature: node.boundary,
    projectionGeoData: state.projectionGeoData,
    externalGeoData: bands.outer,
    externalGeometryKey: bands.outerGeometryKey,
    externalRegionCode: bands.outerRegionCode,
    externalInteractive: Boolean(bands.outer) && externalInteractionScopes.has(node.scope),
    navigationPath: path,
    boundaryDataNotice: state.boundaryDataNotice,
  };
}

function childContainerState(
  state: MapState,
  node: AdministrativeBoundaryNode,
  path: readonly MapNavigationNode[],
  children: GeoFeatureCollection,
  bands: NavigationBands,
  externalInteractionScopes: ReadonlySet<MapScope>,
): MapState {
  return {
    scope: node.scope,
    regionName: node.name,
    parentRegionName: path[path.length - 2]?.name,
    code: node.code,
    geometryKey: `${node.code}-children`,
    projectionKey: state.projectionKey ?? state.geometryKey,
    geoData: children,
    terminal: false,
    boundaryFeature: node.boundary,
    contextGeoData: bands.siblings,
    contextGeometryKey: bands.siblingsGeometryKey,
    contextInteractive: true,
    contextPresentation: "peers",
    contextRegionCode: node.code,
    externalGeoData: bands.outer,
    externalGeometryKey: bands.outerGeometryKey,
    externalRegionCode: bands.outerRegionCode,
    externalInteractive: Boolean(bands.outer) && externalInteractionScopes.has(node.scope),
    projectionGeoData: state.projectionGeoData ?? bands.siblings,
    navigationPath: path,
    boundaryDataNotice: state.boundaryDataNotice,
  };
}

export function createAdministrativeBoundaryProviderChain(
  providers: readonly AdministrativeBoundaryProvider[],
): AdministrativeBoundaryProvider {
  return {
    async resolveChildren(node, context) {
      for (const provider of providers) {
        const result = await provider.resolveChildren(node, context);
        if (result.status !== "unsupported") return result;
      }
      return { status: "unavailable" };
    },
  };
}

export function createStaticAdministrativeBoundaryProvider(
  childrenByCode: ReadonlyMap<string, GeoFeatureCollection>,
): AdministrativeBoundaryProvider {
  return {
    async resolveChildren(node) {
      const children = childrenByCode.get(node.code);
      return children ? { status: "available", children } : { status: "unsupported" };
    },
  };
}

export function createAdministrativeMapDataSource(
  options: AdministrativeMapDataSourceOptions,
): MapDataSource {
  const initialPath = options.initialState.navigationPath ?? [{
    code: options.initialState.code,
    name: options.initialState.regionName,
    scope: options.initialState.scope,
  }];
  const initialState: MapState = {
    ...options.initialState,
    navigationPath: initialPath,
  };
  const networkScopes = new Set(options.institutionNetworkScopes ?? ["district", "township"]);
  const externalInteractionScopes = new Set(options.externalInteractionScopes ?? mapScopeOrder);
  const minimumLocationDepth = mapScopeDepth(options.minimumLocationScope ?? "district");

  return {
    initialState,
    async loadChildState(state, feature, context) {
      const node = nodeForFeature(feature);
      if (!node) return undefined;
      const currentPath = state.navigationPath ?? initialPath;
      const path = replaceOrAppendPath(currentPath, node);
      const bands = navigationBandsForFeature(state, node.code);
      const result = await options.provider.resolveChildren(node, context);
      if (result.status === "available" && result.children.features.length > 0) {
        return childContainerState(
          state,
          node,
          path,
          result.children,
          bands,
          externalInteractionScopes,
        );
      }
      return terminalState(state, node, path, bands, externalInteractionScopes);
    },
    filterLocations(locations, state) {
      if (mapScopeDepth(state.scope) < minimumLocationDepth) return [];
      if (!state.focusFeatureCode && !state.terminal) return [...locations];
      const boundary = state.boundaryFeature ?? state.geoData.features.find(
        (feature) => feature.properties.code === state.focusFeatureCode,
      );
      return locationsInsideBoundary(locations, boundary);
    },
    stateForCoordinate(coordinate, state) {
      const feature = state.geoData.features.find((item) => (
        featureContainsCoordinate(item, coordinate)
      ));
      const node = feature ? nodeForFeature(feature) : undefined;
      if (!node) return undefined;
      const path = replaceOrAppendPath(state.navigationPath ?? initialPath, node);
      return terminalState(
        state,
        node,
        path,
        navigationBandsForFeature(state, node.code),
        externalInteractionScopes,
      );
    },
    institutionNetworkAvailable(state, locations) {
      return networkScopes.has(state.scope) && locations.length > 0;
    },
  };
}
