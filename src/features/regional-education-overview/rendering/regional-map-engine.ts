import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  CSS2DObject,
  CSS2DRenderer,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { GeoFeature } from "../geo";
import type { MapState } from "../map-state";
import {
  entersNestedScopeInSameGeometryBand,
  mapStructureChanged,
} from "../map-state-transition";
import type { DigitalTwinMapTheme } from "../map-themes";
import type { EducationLocation, MapCameraView, MapDataLayerMode } from "../types";
import { AmbientEffectsLayer } from "./ambient-effects-layer";
import { ConnectionLayer } from "./connection-layer";
import { energyTowerRenderOrder, EnergyTowerLayer } from "./energy-tower-layer";
import { GroundGridLayer } from "./ground-grid-layer";
import { InstitutionLayer } from "./institution-layer";
import { MapCameraTransition } from "./map-camera-transition";
import type { MapCameraFraming } from "./map-camera-transition";
import { disposeMapSceneLayers } from "./map-scene-layer";
import type { TuningAwareMapSceneLayer } from "./map-scene-layer";
import {
  createMapProjection,
  featureVisualCenter,
  largestOuterRingOfFeature,
} from "./map-projection";
import type { MapProjection } from "./map-projection";
import { RegionLayer, regionTopZ } from "./region-layer";
import { RegionalContextLayer } from "./regional-context-layer";
import {
  cloneMapVisualTuning,
  defaultMapVisualTuning,
  mapCameraViewFromTuning,
  mapVisualTuningWithCameraView,
} from "./map-visual-tuning";
import type { MapVisualTuning } from "./map-visual-tuning";

const mapWidth = 860;
const mapHeight = 520;
const mapPadding = 30;
const connectionOverlayRenderOrder = 60;
const institutionOverlayRenderOrder = 70;
const idleFrameRate = 24;
const interactionFrameRate = 60;
const hoverFrameBoostDuration = 500;
const scopeFrameBoostDuration = 1400;
const clickMoveTolerance = 5;
const minimumMapPolarAngle = THREE.MathUtils.degToRad(20);
const maximumMapPolarAngle = THREE.MathUtils.degToRad(75);
const districtMinimumCameraDistance = 480;
const townshipMinimumCameraDistance = 280;
export const defaultRegionalMapCameraView: MapCameraView = {
  ...mapCameraViewFromTuning(defaultMapVisualTuning),
};

function boundaryFeatureForMapState(mapState: MapState) {
  if (mapState.boundaryFeature) return mapState.boundaryFeature;
  return mapState.focusFeatureCode
    ? mapState.geoData.features.find(
        (feature) => feature.properties.code === mapState.focusFeatureCode,
      )
    : undefined;
}

interface RegionalMapEngineEvents {
  locationSelect: (location: EducationLocation) => void;
  featureSelect: (feature: GeoFeature) => void;
  scopeBack: () => void;
}

interface MapViewport {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface PreparedScopeLayers {
  readonly mapState: MapState;
  readonly projection: MapProjection;
  readonly contextLayer: RegionalContextLayer;
  readonly externalContextLayer: RegionalContextLayer;
  readonly peerRegionLayer?: RegionLayer;
  readonly reusedPeerRegionLayer?: RegionLayer;
  readonly regionLayer: RegionLayer;
  readonly reusedRegionLayer?: RegionLayer;
  readonly effectsLayer: AmbientEffectsLayer;
  readonly root: THREE.Group;
}

type ScopePresentationLayer = RegionLayer | RegionalContextLayer;

interface ExitingScopePresentation {
  readonly root: THREE.Group;
  readonly layers: readonly ScopePresentationLayer[];
  readonly onComplete?: () => void;
}

interface DynamicLayerBundle {
  readonly mapState: MapState;
  readonly dataLayerMode: MapDataLayerMode;
  readonly locationIds: string;
  readonly institutionLayer?: InstitutionLayer;
  readonly connectionLayer?: ConnectionLayer;
  readonly energyTowerLayer?: EnergyTowerLayer;
}

export function transitionsPeerPresentationToExternal(
  previous: MapState,
  next: MapState,
) {
  return Boolean(
    previous.contextPresentation === "peers"
    && previous.contextGeoData
    && next.contextPresentation !== "peers"
    && next.externalGeoData === previous.contextGeoData,
  );
}

export function transitionsExternalPresentationToPeer(
  previous: MapState,
  next: MapState,
) {
  return Boolean(
    previous.externalGeoData
    && next.contextPresentation === "peers"
    && next.contextGeoData === previous.externalGeoData,
  );
}

export function anchorDynamicOverlay(
  root: THREE.Group,
  activeSurfaceZ: number,
  renderOrder: number,
) {
  root.position.z = activeSurfaceZ - regionTopZ;
  root.renderOrder = renderOrder;
}

export function mapScreenFraming(
  mapState: Pick<MapState, "scope">,
  tuning: Pick<
    MapVisualTuning,
    | "offsetX"
    | "offsetY"
    | "districtFramingOffsetX"
    | "townshipFocusFramingOffsetX"
    | "townshipFocusFramingOffsetY"
  >,
) {
  return mapState.scope === "township"
    ? {
        x: tuning.offsetX + tuning.townshipFocusFramingOffsetX,
        y: tuning.offsetY + tuning.townshipFocusFramingOffsetY,
      }
    : {
        x: tuning.offsetX + tuning.districtFramingOffsetX,
        y: tuning.offsetY,
      };
}

export function resolveMapOrbitPivot(
  mapState: MapState,
  projection: MapProjection,
  mapRoot: THREE.Object3D,
  localSurfaceZ: number,
) {
  const feature = boundaryFeatureForMapState(mapState);
  const coordinate = feature ? featureVisualCenter(feature) : undefined;
  if (!coordinate) return undefined;
  mapRoot.updateWorldMatrix(true, false);
  return mapRoot.localToWorld(projection.projectPoint(coordinate, localSurfaceZ));
}

export function minimumCameraDistanceForScope(scope: MapState["scope"]) {
  return scope === "township"
    ? townshipMinimumCameraDistance
    : districtMinimumCameraDistance;
}

export function minimumCameraDistanceDuringScopeChange(
  previousScope: MapState["scope"],
  nextScope: MapState["scope"],
) {
  return previousScope === "township" && nextScope === "district"
    ? townshipMinimumCameraDistance
    : minimumCameraDistanceForScope(nextScope);
}

export function townshipFocusPositionZ(
  applyTownshipDefaults: boolean,
  currentCameraZ: number,
  tuning: Pick<MapVisualTuning, "townshipCameraPositionZ">,
) {
  return applyTownshipDefaults ? tuning.townshipCameraPositionZ : currentCameraZ;
}

export function townshipFocusTargetZ(
  dataLayerMode: MapDataLayerMode,
  calculatedTargetZ: number,
  tuning: Pick<MapVisualTuning, "townshipEnergyTowerTargetZ">,
) {
  return dataLayerMode === "energy-towers"
    ? tuning.townshipEnergyTowerTargetZ
    : calculatedTargetZ;
}

export function shouldRunMapAutoRotation(
  autoRotationEnabled: boolean,
  motionEnabled: boolean,
  controlsInteracting: boolean,
  timestamp: number,
  resumeAt: number,
) {
  return autoRotationEnabled
    && motionEnabled
    && !controlsInteracting
    && timestamp >= resumeAt;
}

export class RegionalMapEngine {
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly labelRenderer = new CSS2DRenderer();
  private readonly keyboardStatusElement = document.createElement("span");
  private readonly controls: OrbitControls;
  private readonly cameraTransition: MapCameraTransition;
  private readonly mapRoot = new THREE.Group();
  private readonly regionLabelGroup = new THREE.Group();
  private readonly labelElements = new Set<HTMLElement>();
  private readonly regionLabelElements = new Map<GeoFeature, HTMLElement>();
  private readonly regionLabelObjects = new Map<GeoFeature, CSS2DObject>();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly projectedLabelPosition = new THREE.Vector3();
  private readonly ambientLight: THREE.AmbientLight;
  private readonly directionLight: THREE.DirectionalLight;
  private readonly groundLayer: GroundGridLayer;
  private readonly resizeObserver?: ResizeObserver;
  private viewport: MapViewport = { left: 0, top: 0, width: 1, height: 1 };
  private regionLayer?: RegionLayer;
  private contextLayer?: RegionalContextLayer;
  private externalContextLayer?: RegionalContextLayer;
  private peerRegionLayer?: RegionLayer;
  private institutionLayer?: InstitutionLayer;
  private connectionLayer?: ConnectionLayer;
  private energyTowerLayer?: EnergyTowerLayer;
  private suspendedDynamicLayers?: DynamicLayerBundle;
  private readonly exitingEnergyTowerLayers: EnergyTowerLayer[] = [];
  private readonly exitingScopePresentations: ExitingScopePresentation[] = [];
  private scopePresentationGeneration = 0;
  private effectsLayer?: AmbientEffectsLayer;
  private projection?: MapProjection;
  private scopeRoot?: THREE.Group;
  private preparedScopeLayers?: PreparedScopeLayers;
  private prepareScopeGeneration = 0;
  private frameId = 0;
  private previousFrameTime = 0;
  private highFrameRateUntil = 0;
  private pointerDownPosition?: [number, number];
  private controlsInteracting = false;
  private autoRotationResumeAt = 0;
  private pointerDirty = false;
  private keyboardFeatureCode?: string;
  private disposed = false;
  private motionEnabled = true;
  private selectedLocationId?: string;
  private selectedEnergyTowerId?: string;
  private townshipInstitutionTargetZ?: number;
  private dataLayerMode: MapDataLayerMode;
  private mapState: MapState;
  private locations: readonly EducationLocation[];
  private theme: DigitalTwinMapTheme;
  private currentFraming: MapCameraFraming = { x: 0, y: 0 };
  private visualTuning: MapVisualTuning = cloneMapVisualTuning(defaultMapVisualTuning);

  constructor(
    private readonly host: HTMLElement,
    mapState: MapState,
    locations: readonly EducationLocation[],
    theme: DigitalTwinMapTheme,
    selectedLocationId: string | undefined,
    dataLayerMode: MapDataLayerMode,
    visualTuning: Readonly<MapVisualTuning>,
    private readonly events: RegionalMapEngineEvents,
  ) {
    this.mapState = mapState;
    this.locations = locations;
    this.theme = theme;
    this.selectedLocationId = selectedLocationId;
    this.dataLayerMode = dataLayerMode;
    this.visualTuning = cloneMapVisualTuning(visualTuning);
    this.viewport = this.measureHost();
    const { width, height } = this.viewport;
    this.camera = new THREE.PerspectiveCamera(defaultRegionalMapCameraView.fov, width / height, 1, 2400);
    this.camera.up.set(0, 0, 1);
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
      failIfMajorPerformanceCaveat: false,
    });
    this.renderer.setPixelRatio(this.resolvePixelRatio());
    this.renderer.setSize(width, height);
    this.renderer.domElement.className = "regional-map-canvas";
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.setAttribute("role", "application");
    this.renderer.domElement.setAttribute(
      "aria-keyshortcuts",
      "ArrowLeft ArrowRight ArrowUp ArrowDown Home End Enter Space Escape Backspace + -",
    );
    this.renderer.domElement.setAttribute(
      "aria-label",
      "三维行政区地图。方向键选择区域，回车进入，Escape 返回，正负号缩放",
    );
    this.host.appendChild(this.renderer.domElement);
    this.keyboardStatusElement.className = "map-keyboard-status";
    this.keyboardStatusElement.setAttribute("role", "status");
    this.keyboardStatusElement.setAttribute("aria-live", "polite");
    Object.assign(this.keyboardStatusElement.style, {
      position: "absolute",
      width: "1px",
      height: "1px",
      overflow: "hidden",
      clipPath: "inset(50%)",
      whiteSpace: "nowrap",
    });
    this.host.appendChild(this.keyboardStatusElement);

    this.labelRenderer.setSize(width, height);
    this.labelRenderer.domElement.className = "map-label-layer";
    this.host.appendChild(this.labelRenderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = false;
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = this.visualTuning.autoRotationSpeed;
    this.controls.minPolarAngle = minimumMapPolarAngle;
    this.controls.maxPolarAngle = maximumMapPolarAngle;
    this.controls.minDistance = districtMinimumCameraDistance;
    this.controls.maxDistance = 1100;
    this.cameraTransition = new MapCameraTransition({
      camera: this.camera,
      controls: this.controls,
      getFraming: () => ({ ...this.currentFraming }),
      applyFraming: this.applyCameraFraming,
      requestRender: this.requestRender,
      requestHighFrameRate: this.requestHighFrameRate,
    });
    this.applyCameraViewInternal(defaultRegionalMapCameraView);
    this.controls.addEventListener("change", this.requestRender);
    this.controls.addEventListener("start", this.onControlsStart);
    this.controls.addEventListener("end", this.onControlsEnd);

    this.ambientLight = new THREE.AmbientLight(
      theme.sideTop,
      this.visualTuning.ambientLightIntensity,
    );
    this.directionLight = new THREE.DirectionalLight(
      theme.labelText,
      this.visualTuning.directionalLightIntensity,
    );
    this.directionLight.position.set(120, -240, 420);
    this.scene.add(this.ambientLight, this.directionLight, this.mapRoot);
    this.applyMapTransform();
    this.groundLayer = new GroundGridLayer(theme, this.visualTuning);
    this.mapRoot.add(this.groundLayer.root);
    this.buildScopeLayers();
    this.alignOrbitPivot(true);
    this.applyCameraFraming(mapScreenFraming(this.mapState, this.visualTuning));

    this.host.addEventListener("pointermove", this.onPointerMove);
    this.host.addEventListener("pointerleave", this.onPointerLeave);
    this.host.addEventListener("pointerdown", this.onPointerDown);
    this.host.addEventListener("pointercancel", this.onPointerCancel);
    this.host.addEventListener("click", this.onClick);
    this.host.addEventListener("contextmenu", this.onContextMenu);
    this.renderer.domElement.addEventListener("keydown", this.onKeyDown);
    this.renderer.domElement.addEventListener("blur", this.onKeyboardBlur);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    this.motionEnabled = !reducedMotion?.matches;
    reducedMotion?.addEventListener("change", this.onMotionPreferenceChange);
    this.motionQuery = reducedMotion;
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(this.host);
    this.requestRender();
    this.startLoop();
  }

  private motionQuery?: MediaQueryList;

  private resolvePixelRatio() {
    return Math.min(window.devicePixelRatio || 1, 1.5);
  }

  private measureHost(): MapViewport {
    const rectangle = this.host.getBoundingClientRect();
    return {
      left: rectangle.left,
      top: rectangle.top,
      width: Math.max(1, Math.round(rectangle.width || this.host.clientWidth || 1)),
      height: Math.max(1, Math.round(rectangle.height || this.host.clientHeight || 1)),
    };
  }

  private clearRegionLabels() {
    for (const element of this.labelElements) element.remove();
    this.labelElements.clear();
    this.regionLabelElements.clear();
    this.regionLabelObjects.clear();
    this.regionLabelGroup.clear();
  }

  private buildRegionLabels() {
    this.clearRegionLabels();
    if (!this.projection) return;
    for (const feature of this.mapState.geoData.features) {
      const coordinate = featureVisualCenter(feature);
      if (!coordinate) continue;
      const element = document.createElement("span");
      element.className = "map-region-label";
      this.labelElements.add(element);
      this.regionLabelElements.set(feature, element);
      const object = new CSS2DObject(element);
      object.position.copy(this.projection.projectPoint(coordinate, regionTopZ + 9));
      this.regionLabelObjects.set(feature, object);
      this.regionLabelGroup.add(object);
    }
    this.mapRoot.add(this.regionLabelGroup);
    this.updateRegionLabelPresentation();
    this.updateRegionLabelPositions();
  }

  private updateRegionLabelPresentation() {
    for (const [feature, element] of this.regionLabelElements) {
      element.textContent = feature.properties.name ?? "未命名镇街";
    }
  }

  private updateRegionLabelPositions() {
    if (!this.regionLayer) return;
    for (const [feature, object] of this.regionLabelObjects) {
      const featureCode = feature.properties.code;
      object.position.z = this.regionLayer.getFeatureSurfaceZ(featureCode) + 9;
    }
  }

  private syncSurfaceLayers() {
    const activeSurfaceZ = this.regionLayer?.getCurrentActiveSurfaceZ() ?? regionTopZ;
    if (this.connectionLayer) {
      anchorDynamicOverlay(
        this.connectionLayer.root,
        activeSurfaceZ,
        connectionOverlayRenderOrder,
      );
    }
    if (this.institutionLayer) {
      anchorDynamicOverlay(
        this.institutionLayer.root,
        activeSurfaceZ,
        institutionOverlayRenderOrder,
      );
    }
    if (this.energyTowerLayer) {
      anchorDynamicOverlay(
        this.energyTowerLayer.root,
        activeSurfaceZ,
        energyTowerRenderOrder,
      );
    }
    const boundarySurfaceZ = this.regionLayer?.getBoundarySurfaceZ() ?? activeSurfaceZ;
    this.effectsLayer?.setBoundarySurfaceZ(boundarySurfaceZ + 1.5);
  }

  private createScopeProjection(mapState: MapState) {
    return createMapProjection(
      mapState.projectionGeoData ?? mapState.geoData,
      mapWidth,
      mapHeight,
      mapPadding,
    );
  }

  private createContextPresentation(mapState: MapState, projection: MapProjection) {
    const contextGeoData = mapState.contextGeoData ?? {
      type: "FeatureCollection" as const,
      features: [],
    };
    const contextRegionCode = mapState.contextRegionCode ?? mapState.code;
    const contextLayer = new RegionalContextLayer(
      contextGeoData,
      projection,
      this.theme,
      this.visualTuning,
      contextRegionCode,
      mapState.contextPresentation === "peers",
    );
    if (mapState.contextPresentation !== "peers") {
      return { contextLayer, peerRegionLayer: undefined };
    }
    return {
      contextLayer,
      peerRegionLayer: this.createPeerRegionLayer(mapState, projection, contextGeoData),
    };
  }

  private createExternalContextLayer(mapState: MapState, projection: MapProjection) {
    return new RegionalContextLayer(
      mapState.externalGeoData ?? { type: "FeatureCollection", features: [] },
      projection,
      this.theme,
      this.visualTuning,
      mapState.externalRegionCode,
      false,
    );
  }

  private createPeerRegionLayer(
    mapState: MapState,
    projection: MapProjection,
    contextGeoData = mapState.contextGeoData ?? {
      type: "FeatureCollection" as const,
      features: [],
    },
  ) {
    const contextRegionCode = mapState.contextRegionCode ?? mapState.code;
    const peerRegionLayer = new RegionLayer(
      {
        ...mapState,
        geoData: contextGeoData,
        focusFeatureCode: undefined,
        contextGeoData: undefined,
        projectionGeoData: undefined,
      },
      projection,
      this.theme,
      this.visualTuning,
    );
    this.presentPeerRegionLayer(peerRegionLayer, contextRegionCode);
    return peerRegionLayer;
  }

  private presentPeerRegionLayer(
    peerRegionLayer: RegionLayer | undefined,
    currentRegionCode = this.mapState.contextRegionCode,
    deferredRevealCode?: string,
  ) {
    if (!peerRegionLayer) return;
    peerRegionLayer.setExcludedFeatures([
      ...(currentRegionCode ? [currentRegionCode] : []),
      ...(deferredRevealCode ? [deferredRevealCode] : []),
    ]);
    // The selected parent geometry is replaced by the active child layer, but
    // its focus must remain on the peer layer. This keeps every visible sibling
    // in the same thin background state used during the pre-navigation preview.
    peerRegionLayer.setFocus(currentRegionCode, this.visualTuning);
  }

  private reusablePeerRegionLayer(mapState: MapState) {
    if (mapState.contextPresentation !== "peers" || !mapState.contextGeoData) return undefined;
    if (
      this.mapState.contextPresentation === "peers"
      && this.mapState.contextGeoData === mapState.contextGeoData
    ) return this.peerRegionLayer;
    if (
      this.mapState.contextPresentation !== "peers"
      && this.mapState.geoData === mapState.contextGeoData
    ) return this.regionLayer;
    return undefined;
  }

  private reusableActiveRegionLayer(mapState: MapState) {
    if (this.mapState.geoData === mapState.geoData) return this.regionLayer;
    if (
      this.peerRegionLayer
      && this.mapState.contextGeoData === mapState.geoData
      && mapState.contextPresentation !== "peers"
    ) return this.peerRegionLayer;
    return undefined;
  }

  private preparedStateMatches(mapState: MapState) {
    const preparedState = this.preparedScopeLayers?.mapState;
    return Boolean(
      preparedState
      && preparedState.code === mapState.code
      && !mapStructureChanged(preparedState, mapState)
    );
  }

  private entersPeerPresentationFromExternal(
    mapState: MapState,
    previousMapState = this.mapState,
  ) {
    return Boolean(
      this.motionEnabled
      && transitionsExternalPresentationToPeer(previousMapState, mapState),
    );
  }

  private preparePeerRegionLayerPresentation(
    peerRegionLayer: RegionLayer | undefined,
    mapState: MapState,
    animate: boolean,
    previousMapState = this.mapState,
  ) {
    if (!peerRegionLayer) return;
    if (animate && this.entersPeerPresentationFromExternal(mapState, previousMapState)) {
      // Start from the flat external-map geometry, then expand and recolor the
      // same mesh into the city peer presentation. The old flat context fades
      // beneath it, making reverse navigation the inverse of entering a district.
      peerRegionLayer.setExternalPresentation(true, true);
      peerRegionLayer.settle();
      peerRegionLayer.setExternalPresentation(false);
      return;
    }
    peerRegionLayer.settle();
  }

  private createPreparedScopeLayers(
    mapState: MapState,
    projection = this.createScopeProjection(mapState),
    animateGeometry = false,
    previousMapState = this.mapState,
  ): PreparedScopeLayers {
    const { contextLayer, peerRegionLayer } = this.createContextPresentation(
      mapState,
      projection,
    );
    const externalContextLayer = this.createExternalContextLayer(mapState, projection);
    const regionLayer = new RegionLayer(
      mapState,
      projection,
      this.theme,
      this.visualTuning,
    );
    this.prepareRegionLayerPresentation(regionLayer, mapState, animateGeometry);
    this.preparePeerRegionLayerPresentation(
      peerRegionLayer,
      mapState,
      animateGeometry,
      previousMapState,
    );
    const effectsLayer = new AmbientEffectsLayer(
      largestOuterRingOfFeature(boundaryFeatureForMapState(mapState)),
      projection,
      this.theme,
      this.visualTuning,
      regionLayer.getBoundarySurfaceZ() + 1.5,
    );
    const root = new THREE.Group();
    root.add(externalContextLayer.root, contextLayer.root);
    if (peerRegionLayer) root.add(peerRegionLayer.root);
    root.add(regionLayer.root, effectsLayer.root);
    return {
      mapState,
      projection,
      contextLayer,
      externalContextLayer,
      peerRegionLayer,
      regionLayer,
      effectsLayer,
      root,
    };
  }

  private prepareRegionLayerPresentation(
    regionLayer: RegionLayer,
    mapState: MapState,
    animate: boolean,
  ) {
    if (animate && this.motionEnabled) {
      regionLayer.setAllAsSiblings(this.visualTuning);
      regionLayer.settle();
    }
    regionLayer.setFocus(
      mapState.focusFeatureCode,
      this.visualTuning,
      mapState.contextPresentation === "peers" && !mapState.focusFeatureCode,
    );
    if (!animate || !this.motionEnabled) regionLayer.settle();
  }

  private prepareEnteringLayer(layer: RegionalContextLayer | undefined, animate: boolean) {
    if (!layer || !animate || !this.motionEnabled) return;
    layer.setPresentationOpacity(0, true);
    layer.setPresentationOpacity(1);
  }

  private activatePreparedScopeLayers(
    prepared: PreparedScopeLayers,
    animate = false,
    deferredRevealCode?: string,
  ) {
    this.prepareEnteringLayer(prepared.contextLayer, animate);
    this.prepareEnteringLayer(prepared.externalContextLayer, animate);
    this.projection = prepared.projection;
    this.contextLayer = prepared.contextLayer;
    this.externalContextLayer = prepared.externalContextLayer;
    this.peerRegionLayer = prepared.reusedPeerRegionLayer ?? prepared.peerRegionLayer;
    this.presentPeerRegionLayer(
      this.peerRegionLayer,
      prepared.mapState.contextRegionCode,
      deferredRevealCode && this.peerRegionLayer?.hasFeature(deferredRevealCode)
        ? deferredRevealCode
        : undefined,
    );
    this.regionLayer = prepared.reusedRegionLayer ?? prepared.regionLayer;
    this.regionLayer.setExcludedFeatures(
      deferredRevealCode && this.regionLayer.hasFeature(deferredRevealCode)
        ? [deferredRevealCode]
        : [],
    );
    this.regionLayer.setFocus(
      prepared.mapState.focusFeatureCode,
      this.visualTuning,
      prepared.mapState.contextPresentation === "peers"
        && !prepared.mapState.focusFeatureCode,
    );
    if (!this.motionEnabled) this.regionLayer.settle();
    this.effectsLayer = prepared.effectsLayer;
    this.scopeRoot = prepared.root;
    if (prepared.reusedPeerRegionLayer) {
      prepared.root.add(prepared.reusedPeerRegionLayer.root);
    }
    if (prepared.reusedRegionLayer) prepared.root.add(prepared.reusedRegionLayer.root);
    this.mapRoot.add(prepared.root);
    this.buildRegionLabels();
    this.buildDynamicLayers();
  }

  private beginScopeExit(
    previous: {
      mapState: MapState;
      root: THREE.Group;
      regionLayer: RegionLayer;
      peerRegionLayer?: RegionLayer;
      contextLayer: RegionalContextLayer;
      externalContextLayer?: RegionalContextLayer;
      effectsLayer: AmbientEffectsLayer;
    },
    prepared: PreparedScopeLayers,
    onComplete?: () => void,
  ) {
    const reusedLayers = new Set<ScopePresentationLayer>();
    if (prepared.reusedPeerRegionLayer) reusedLayers.add(prepared.reusedPeerRegionLayer);
    if (prepared.reusedRegionLayer) reusedLayers.add(prepared.reusedRegionLayer);
    const candidates: Array<ScopePresentationLayer | undefined> = [
      previous.regionLayer,
      previous.peerRegionLayer,
      previous.contextLayer,
      previous.externalContextLayer,
    ];
    const layers = candidates.filter(
      (layer): layer is ScopePresentationLayer => (
        layer !== undefined && !reusedLayers.has(layer)
      ),
    );
    previous.effectsLayer.dispose();
    if (!this.motionEnabled || layers.length === 0) {
      previous.root.removeFromParent();
      disposeMapSceneLayers(layers);
      onComplete?.();
      return;
    }
    for (const layer of layers) {
      if (layer instanceof RegionLayer) {
        if (
          layer === previous.peerRegionLayer
          && transitionsPeerPresentationToExternal(previous.mapState, prepared.mapState)
        ) {
          // When a district becomes active, the city peer layer continuously
          // collapses into the external-map plane. Geometry, fill, walls and
          // contours all use one morph instead of being replaced in one frame.
          layer.setExternalPresentation(true);
        } else {
          // Other solid extrusions leave through the same thickness curve used
          // by district sibling changes. Cross-fading a thick transparent cap
          // would let side walls bleed through and appear as broken geometry.
          layer.setAllAsSiblings(this.visualTuning);
        }
      } else layer.setPresentationOpacity(0);
    }
    this.exitingScopePresentations.push({ root: previous.root, layers, onComplete });
  }

  private buildScopeLayers() {
    this.disposeScopeLayers();
    this.disposeDynamicLayers();
    this.activatePreparedScopeLayers(this.createPreparedScopeLayers(this.mapState));
  }

  private buildDynamicLayers() {
    if (!this.projection) return;
    if (this.dataLayerMode === "energy-towers") {
      this.energyTowerLayer = new EnergyTowerLayer(
        this.mapState,
        this.locations,
        this.projection,
        this.theme,
        this.visualTuning,
      );
      this.energyTowerLayer.setSelected(this.selectedEnergyTowerId);
      anchorDynamicOverlay(
        this.energyTowerLayer.root,
        this.regionLayer?.getCurrentActiveSurfaceZ() ?? regionTopZ,
        energyTowerRenderOrder,
      );
      this.mapRoot.add(this.energyTowerLayer.root);
      if (!this.motionEnabled) this.energyTowerLayer.settle(true);
      return;
    }
    this.institutionLayer = new InstitutionLayer(
      this.locations,
      this.projection,
      this.theme,
      this.selectedLocationId,
      this.renderer.getPixelRatio(),
      this.visualTuning,
      this.mapState.scope,
    );
    this.connectionLayer = new ConnectionLayer(
      this.locations,
      this.projection,
      this.theme,
      this.visualTuning,
    );
    const activeSurfaceZ = this.regionLayer?.getCurrentActiveSurfaceZ() ?? regionTopZ;
    anchorDynamicOverlay(
      this.connectionLayer.root,
      activeSurfaceZ,
      connectionOverlayRenderOrder,
    );
    anchorDynamicOverlay(
      this.institutionLayer.root,
      activeSurfaceZ,
      institutionOverlayRenderOrder,
    );
    if (!this.motionEnabled) this.institutionLayer.settleElevations();
    if (!this.motionEnabled) this.connectionLayer.settle();
    this.mapRoot.add(this.connectionLayer.root, this.institutionLayer.root);
  }

  private dynamicLayerLocationIds(locations: readonly EducationLocation[]) {
    return locations.map((location) => location.id).join("\u0000");
  }

  private takeDynamicLayers(mapState: MapState, locations: readonly EducationLocation[]) {
    if (!this.institutionLayer && !this.connectionLayer && !this.energyTowerLayer) return undefined;
    const bundle: DynamicLayerBundle = {
      mapState,
      dataLayerMode: this.dataLayerMode,
      locationIds: this.dynamicLayerLocationIds(locations),
      institutionLayer: this.institutionLayer,
      connectionLayer: this.connectionLayer,
      energyTowerLayer: this.energyTowerLayer,
    };
    this.institutionLayer = undefined;
    this.connectionLayer = undefined;
    this.energyTowerLayer = undefined;
    bundle.institutionLayer?.setHovered();
    bundle.energyTowerLayer?.setHovered();
    bundle.institutionLayer?.root.removeFromParent();
    bundle.connectionLayer?.root.removeFromParent();
    bundle.energyTowerLayer?.root.removeFromParent();
    return bundle;
  }

  private disposeDynamicLayerBundle(bundle: DynamicLayerBundle | undefined) {
    if (!bundle) return;
    disposeMapSceneLayers([
      bundle.institutionLayer,
      bundle.connectionLayer,
      bundle.energyTowerLayer,
    ]);
  }

  private suspendDynamicLayers(mapState: MapState, locations: readonly EducationLocation[]) {
    this.disposeDynamicLayerBundle(this.suspendedDynamicLayers);
    this.suspendedDynamicLayers = this.takeDynamicLayers(mapState, locations);
  }

  private disposeSuspendedDynamicLayers() {
    this.disposeDynamicLayerBundle(this.suspendedDynamicLayers);
    this.suspendedDynamicLayers = undefined;
  }

  private restoreSuspendedDynamicLayers(
    mapState: MapState,
    locations: readonly EducationLocation[],
  ) {
    const bundle = this.suspendedDynamicLayers;
    if (
      !bundle
      || bundle.mapState !== mapState
      || bundle.dataLayerMode !== this.dataLayerMode
      || bundle.locationIds !== this.dynamicLayerLocationIds(locations)
    ) return false;
    this.disposeDynamicLayers(this.dataLayerMode === "energy-towers");
    this.suspendedDynamicLayers = undefined;
    this.institutionLayer = bundle.institutionLayer;
    this.connectionLayer = bundle.connectionLayer;
    this.energyTowerLayer = bundle.energyTowerLayer;
    this.institutionLayer?.setPixelRatio(this.renderer.getPixelRatio());
    this.institutionLayer?.setSelected(
      this.selectedLocationId,
      this.theme,
      this.motionEnabled,
    );
    this.energyTowerLayer?.setSelected(this.selectedEnergyTowerId);
    if (this.connectionLayer) this.mapRoot.add(this.connectionLayer.root);
    if (this.institutionLayer) this.mapRoot.add(this.institutionLayer.root);
    if (this.energyTowerLayer) this.mapRoot.add(this.energyTowerLayer.root);
    return true;
  }

  private disposeDynamicLayers(animateEnergyExit = false) {
    disposeMapSceneLayers([this.institutionLayer, this.connectionLayer]);
    this.institutionLayer = undefined;
    this.connectionLayer = undefined;
    const energyTowerLayer = this.energyTowerLayer;
    this.energyTowerLayer = undefined;
    if (energyTowerLayer) {
      if (animateEnergyExit && this.motionEnabled) {
        energyTowerLayer.startExit();
        this.exitingEnergyTowerLayers.push(energyTowerLayer);
      } else {
        energyTowerLayer.dispose();
      }
    }
  }

  private disposePreparedScopeLayers(prepared: PreparedScopeLayers | undefined) {
    if (!prepared) return;
    prepared.root.removeFromParent();
    disposeMapSceneLayers([
      prepared.reusedRegionLayer ? undefined : prepared.regionLayer,
      prepared.peerRegionLayer,
      prepared.contextLayer,
      prepared.externalContextLayer,
      prepared.effectsLayer,
    ]);
  }

  private nextPreparationFrame() {
    return new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  }

  async prepareMapState(mapState: MapState) {
    const structureChanged = mapStructureChanged(this.mapState, mapState);
    if (!structureChanged) return;
    if (this.preparedStateMatches(mapState)) return;
    const generation = ++this.prepareScopeGeneration;
    this.disposePreparedScopeLayers(this.preparedScopeLayers);
    this.preparedScopeLayers = undefined;
    const projection = this.createScopeProjection(mapState);
    await this.nextPreparationFrame();
    if (generation !== this.prepareScopeGeneration || this.disposed) return;
    const contextStartedAt = performance.now();
    const reusedPeerRegionLayer = this.reusablePeerRegionLayer(mapState);
    const contextLayer = new RegionalContextLayer(
      mapState.contextGeoData ?? { type: "FeatureCollection", features: [] },
      projection,
      this.theme,
      this.visualTuning,
      mapState.contextRegionCode ?? mapState.code,
      Boolean(reusedPeerRegionLayer) || mapState.contextPresentation === "peers",
    );
    const externalContextLayer = this.createExternalContextLayer(mapState, projection);
    const peerRegionLayer = reusedPeerRegionLayer
      ? undefined
      : mapState.contextPresentation === "peers"
        ? this.createPeerRegionLayer(mapState, projection)
        : undefined;
    if (import.meta.env.DEV) {
      performance.measure("map-scope:context", { start: contextStartedAt });
    }
    await this.nextPreparationFrame();
    if (generation !== this.prepareScopeGeneration || this.disposed) {
      disposeMapSceneLayers([contextLayer, externalContextLayer, peerRegionLayer]);
      return;
    }
    const regionStartedAt = performance.now();
    const reusedRegionLayer = this.reusableActiveRegionLayer(mapState);
    const regionLayer = reusedRegionLayer
      ?? new RegionLayer(mapState, projection, this.theme, this.visualTuning);
    if (!reusedRegionLayer) {
      this.prepareRegionLayerPresentation(regionLayer, mapState, true);
    }
    this.preparePeerRegionLayerPresentation(peerRegionLayer, mapState, true);
    if (import.meta.env.DEV) {
      performance.measure("map-scope:region", { start: regionStartedAt });
    }
    await this.nextPreparationFrame();
    if (generation !== this.prepareScopeGeneration || this.disposed) {
      disposeMapSceneLayers([contextLayer, externalContextLayer, peerRegionLayer]);
      if (!reusedRegionLayer) regionLayer.dispose();
      return;
    }
    const effectsStartedAt = performance.now();
    const effectsLayer = new AmbientEffectsLayer(
      largestOuterRingOfFeature(boundaryFeatureForMapState(mapState)),
      projection,
      this.theme,
      this.visualTuning,
      regionLayer.getBoundarySurfaceZ() + 1.5,
    );
    if (import.meta.env.DEV) {
      performance.measure("map-scope:effects", { start: effectsStartedAt });
    }
    const root = new THREE.Group();
    root.add(externalContextLayer.root, contextLayer.root);
    if (peerRegionLayer) root.add(peerRegionLayer.root);
    if (!reusedRegionLayer) root.add(regionLayer.root);
    root.add(effectsLayer.root);
    const prepared = {
      mapState,
      projection,
      contextLayer,
      externalContextLayer,
      peerRegionLayer,
      reusedPeerRegionLayer,
      regionLayer,
      reusedRegionLayer,
      effectsLayer,
      root,
    };
    if (generation !== this.prepareScopeGeneration || this.disposed) {
      this.disposePreparedScopeLayers(prepared);
      return;
    }
    this.preparedScopeLayers = prepared;
  }

  private disposeScopeLayers() {
    this.clearRegionLabels();
    disposeMapSceneLayers([
      this.regionLayer,
      this.peerRegionLayer,
      this.contextLayer,
      this.externalContextLayer,
      this.effectsLayer,
    ]);
    this.scopeRoot?.removeFromParent();
    this.scopeRoot = undefined;
    this.regionLayer = undefined;
    this.peerRegionLayer = undefined;
    this.contextLayer = undefined;
    this.externalContextLayer = undefined;
    this.effectsLayer = undefined;
    this.projection = undefined;
  }

  private disposeExitingEnergyTowerLayers() {
    disposeMapSceneLayers(this.exitingEnergyTowerLayers);
    this.exitingEnergyTowerLayers.length = 0;
  }

  private disposeExitingScopePresentations(complete = false) {
    for (const presentation of this.exitingScopePresentations) {
      presentation.root.removeFromParent();
      disposeMapSceneLayers(presentation.layers);
      if (complete) presentation.onComplete?.();
    }
    this.exitingScopePresentations.length = 0;
  }

  private animateExitingScopePresentations(delta: number) {
    let dirty = false;
    for (let index = this.exitingScopePresentations.length - 1; index >= 0; index -= 1) {
      const presentation = this.exitingScopePresentations[index];
      if (!presentation) continue;
      for (const layer of presentation.layers) dirty = layer.animate(delta) || dirty;
      const settled = presentation.layers.every((layer) => (
        layer instanceof RegionLayer
          ? layer.isTransitionSettled()
          : layer.isPresentationHidden()
      ));
      if (settled) {
        presentation.root.removeFromParent();
        disposeMapSceneLayers(presentation.layers);
        this.exitingScopePresentations.splice(index, 1);
        presentation.onComplete?.();
      }
    }
    return dirty;
  }

  private processPointer() {
    if (!this.pointerDirty || this.controlsInteracting) return;
    this.pointerDirty = false;
    this.scene.updateMatrixWorld();
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const energyTower = this.energyTowerLayer?.hit(this.raycaster);
    const location = this.institutionLayer?.hitScreenPoint(
      this.pointer,
      this.camera,
      this.viewport,
    );
    const region = energyTower
      ? undefined
      : this.hitActiveRegionLabel() ?? this.regionLayer?.hit(this.raycaster);
    const peerLabelFeature = this.mapState.contextInteractive
      ? this.contextLayer?.hitLabel(this.pointer, this.camera, this.viewport)?.feature
      : undefined;
    const peerLabelCode = peerLabelFeature?.properties.code;
    const peerRegion = energyTower || region || !this.mapState.contextInteractive
      ? undefined
      : typeof peerLabelCode === "string"
        ? this.peerRegionLayer?.featureHit(peerLabelCode)
        : this.peerRegionLayer?.hit(this.raycaster);
    const externalContext = energyTower || region || peerRegion || !this.mapState.contextInteractive
      ? undefined
      : this.contextLayer?.hitLabel(this.pointer, this.camera, this.viewport)
        ?? this.contextLayer?.hit(this.raycaster);
    const outerContext = energyTower || region || peerRegion || externalContext
      || !this.mapState.externalInteractive
      ? undefined
      : this.externalContextLayer?.hitLabel(this.pointer, this.camera, this.viewport)
        ?? this.externalContextLayer?.hit(this.raycaster);
    const context = peerRegion ?? externalContext ?? outerContext;
    this.institutionLayer?.setHovered(location?.id);
    this.energyTowerLayer?.setHovered(energyTower?.datum.id);
    this.regionLayer?.setHovered(region?.group);
    this.peerRegionLayer?.setHovered(peerRegion?.group);
    this.contextLayer?.setHovered(
      peerLabelFeature ?? peerRegion?.feature ?? externalContext?.feature,
    );
    this.externalContextLayer?.setHovered(outerContext?.feature);
    if (region || context) {
      this.highFrameRateUntil = Math.max(
        this.highFrameRateUntil,
        performance.now() + hoverFrameBoostDuration,
      );
    }
    this.updateRegionLabelPositions();
    const hoveredRegionCode = region?.feature.properties.code;
    for (const [feature, element] of this.regionLabelElements) {
      element.classList.toggle(
        "is-visible",
        !location
          && !energyTower
          && typeof hoveredRegionCode === "string"
          && feature.properties.code === hoveredRegionCode,
      );
    }
    this.renderer.domElement.style.cursor = location || region || context || energyTower
      ? "pointer"
      : this.mapState.scope === "township" ? "zoom-out" : "grab";
    return { location, region, context, outerContext, energyTower };
  }

  private hitActiveRegionLabel() {
    let closest: { feature: GeoFeature; distance: number } | undefined;
    for (const [feature, object] of this.regionLabelObjects) {
      object.getWorldPosition(this.projectedLabelPosition);
      this.projectedLabelPosition.project(this.camera);
      const distance = Math.hypot(
        (this.projectedLabelPosition.x - this.pointer.x) * this.viewport.width / 2,
        (this.projectedLabelPosition.y - this.pointer.y) * this.viewport.height / 2,
      );
      if (distance <= 34 && (!closest || distance < closest.distance)) {
        closest = { feature, distance };
      }
    }
    const featureCode = closest?.feature.properties.code;
    return typeof featureCode === "string"
      ? this.regionLayer?.featureHit(featureCode)
      : undefined;
  }

  private renderFrame = (timestamp: number) => {
    this.frameId = 0;
    if (this.disposed || document.hidden) return;
    const minimumFrameDuration = timestamp < this.highFrameRateUntil
      ? 1000 / interactionFrameRate
      : 1000 / idleFrameRate;
    const elapsed = timestamp - this.previousFrameTime;
    if (elapsed < minimumFrameDuration) {
      this.frameId = window.requestAnimationFrame(this.renderFrame);
      return;
    }
    const delta = this.previousFrameTime ? elapsed / 1000 : minimumFrameDuration / 1000;
    this.previousFrameTime = timestamp;
    this.processPointer();
    this.updateAutoRotation(timestamp);
    const controlsDirty = this.controls.update(delta);
    const time = timestamp / 1000;
    if (this.motionEnabled) {
      this.connectionLayer?.animate(time, delta);
      this.effectsLayer?.animate(time, delta);
      this.institutionLayer?.animate(time);
      this.energyTowerLayer?.animate(delta);
      for (let index = this.exitingEnergyTowerLayers.length - 1; index >= 0; index -= 1) {
        const layer = this.exitingEnergyTowerLayers[index];
        if (!layer) continue;
        layer.animate(delta);
        if (layer.isHidden()) {
          layer.dispose();
          this.exitingEnergyTowerLayers.splice(index, 1);
        }
      }
    }
    const regionDirty = this.motionEnabled
      ? this.regionLayer?.animate(delta) ?? false
      : this.regionLayer?.settle() ?? false;
    const peerRegionDirty = this.motionEnabled
      ? this.peerRegionLayer?.animate(delta) ?? false
      : this.peerRegionLayer?.settle() ?? false;
    const contextLayerDirty = this.motionEnabled
      ? this.contextLayer?.animate(delta) ?? false
      : false;
    const externalContextLayerDirty = this.motionEnabled
      ? this.externalContextLayer?.animate(delta) ?? false
      : false;
    const contextDirty = contextLayerDirty || externalContextLayerDirty;
    const exitingScopeDirty = this.motionEnabled
      ? this.animateExitingScopePresentations(delta)
      : false;
    if (regionDirty || peerRegionDirty) {
      this.syncSurfaceLayers();
      this.updateRegionLabelPositions();
    }
    this.renderer.render(this.scene, this.camera);
    if (import.meta.env.DEV) {
      const { calls, triangles } = this.renderer.info.render;
      const { geometries, textures } = this.renderer.info.memory;
      this.renderer.domElement.dataset.renderCalls = String(calls);
      this.renderer.domElement.dataset.renderTriangles = String(triangles);
      this.renderer.domElement.dataset.renderGeometries = String(geometries);
      this.renderer.domElement.dataset.renderTextures = String(textures);
    }
    this.labelRenderer.render(this.scene, this.camera);
    if (
      this.motionEnabled
      || controlsDirty
      || regionDirty
      || peerRegionDirty
      || contextDirty
      || exitingScopeDirty
    ) {
      this.frameId = window.requestAnimationFrame(this.renderFrame);
    }
  };

  private startLoop() {
    if (!this.frameId && !this.disposed && !document.hidden && this.motionEnabled) {
      this.frameId = window.requestAnimationFrame(this.renderFrame);
    }
  }

  private requestRender = () => {
    if (this.disposed || document.hidden) return;
    if (!this.frameId) this.frameId = window.requestAnimationFrame(this.renderFrame);
  };

  private requestHighFrameRate(duration = hoverFrameBoostDuration) {
    this.highFrameRateUntil = Math.max(this.highFrameRateUntil, performance.now() + duration);
    this.requestRender();
  }

  private pauseAutoRotation(
    delaySeconds = this.visualTuning.autoRotationResumeDelaySeconds,
  ) {
    this.controls.autoRotate = false;
    this.autoRotationResumeAt = performance.now() + Math.max(0, delaySeconds) * 1000;
  }

  private updateAutoRotation(timestamp: number) {
    this.controls.autoRotateSpeed = this.visualTuning.autoRotationSpeed;
    // OrbitControls advances from its current spherical pose, so resuming after
    // user input neither allocates a per-frame tween nor snaps to a preset view.
    this.controls.autoRotate = shouldRunMapAutoRotation(
      this.visualTuning.autoRotationEnabled,
      this.motionEnabled,
      this.controlsInteracting,
      timestamp,
      this.autoRotationResumeAt,
    );
  }

  private updatePointer(event: PointerEvent | MouseEvent) {
    this.pointer.x = ((event.clientX - this.viewport.left) / this.viewport.width) * 2 - 1;
    this.pointer.y = -((event.clientY - this.viewport.top) / this.viewport.height) * 2 + 1;
    this.pointerDirty = true;
  }

  private isMapPointerTarget(event: PointerEvent | MouseEvent) {
    return event.target === this.renderer.domElement;
  }

  private onPointerMove = (event: PointerEvent) => {
    if (!this.isMapPointerTarget(event)) {
      this.onPointerLeave();
      return;
    }
    this.clearKeyboardSelection(false);
    this.updatePointer(event);
    this.requestRender();
  };

  private onPointerLeave = () => {
    if (this.controlsInteracting) return;
    this.pointerDirty = false;
    this.institutionLayer?.setHovered();
    this.energyTowerLayer?.setHovered();
    this.regionLayer?.setHovered();
    this.peerRegionLayer?.setHovered();
    this.contextLayer?.setHovered();
    this.externalContextLayer?.setHovered();
    for (const element of this.regionLabelElements.values()) element.classList.remove("is-visible");
    this.renderer.domElement.style.cursor = this.mapState.scope === "township" ? "zoom-out" : "grab";
    this.requestRender();
  };

  private onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || !this.isMapPointerTarget(event)) return;
    this.renderer.domElement.focus({ preventScroll: true });
    this.pointerDownPosition = [event.clientX, event.clientY];
  };

  private onPointerCancel = () => {
    this.pointerDownPosition = undefined;
  };
  private onContextMenu = (event: MouseEvent) => event.preventDefault();

  private interactiveFeatures() {
    const features: GeoFeature[] = [];
    const seen = new Set<string>();
    const append = (source: readonly GeoFeature[] | undefined) => {
      for (const feature of source ?? []) {
        const code = feature.properties.code;
        if (typeof code !== "string" || seen.has(code)) continue;
        seen.add(code);
        features.push(feature);
      }
    };
    append(this.mapState.geoData.features);
    if (this.mapState.contextInteractive) append(this.mapState.contextGeoData?.features);
    if (this.mapState.externalInteractive) append(this.mapState.externalGeoData?.features);
    return features;
  }

  private presentKeyboardFeature(feature: GeoFeature | undefined) {
    const code = feature?.properties.code;
    this.keyboardFeatureCode = typeof code === "string" ? code : undefined;
    const activeHit = this.keyboardFeatureCode
      ? this.regionLayer?.featureHit(this.keyboardFeatureCode)
      : undefined;
    const peerHit = !activeHit && this.keyboardFeatureCode
      ? this.peerRegionLayer?.featureHit(this.keyboardFeatureCode)
      : undefined;
    const contextFeature = !activeHit && !peerHit && this.mapState.contextInteractive
      ? this.mapState.contextGeoData?.features.find(
          (item) => item.properties.code === this.keyboardFeatureCode,
        )
      : undefined;
    const externalFeature = !activeHit && !peerHit && !contextFeature
      && this.mapState.externalInteractive
      ? this.mapState.externalGeoData?.features.find(
          (item) => item.properties.code === this.keyboardFeatureCode,
        )
      : undefined;
    this.regionLayer?.setHovered(activeHit?.group);
    this.peerRegionLayer?.setHovered(peerHit?.group);
    this.contextLayer?.setHovered(contextFeature);
    this.externalContextLayer?.setHovered(externalFeature);
    for (const [labelFeature, element] of this.regionLabelElements) {
      element.classList.toggle("is-visible", labelFeature === feature);
    }
    const name = feature?.properties.name ?? feature?.properties.fullname;
    this.keyboardStatusElement.textContent = name ? `已选择${name}，按回车进入` : "";
    this.renderer.domElement.setAttribute(
      "aria-label",
      name
        ? `三维行政区地图，当前选择${name}。按回车进入，Escape 返回`
        : "三维行政区地图。方向键选择区域，回车进入，Escape 返回，正负号缩放",
    );
    this.updateRegionLabelPositions();
    this.requestHighFrameRate();
  }

  private clearKeyboardSelection(render = true) {
    if (!this.keyboardFeatureCode) return;
    this.presentKeyboardFeature(undefined);
    if (render) this.requestRender();
  }

  private zoomWithKeyboard(scale: number) {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const distance = THREE.MathUtils.clamp(
      offset.length() * scale,
      this.controls.minDistance,
      this.controls.maxDistance,
    );
    offset.setLength(distance);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
    this.pauseAutoRotation();
    this.syncVisualTuningFromCamera();
    this.requestHighFrameRate();
  }

  private onKeyDown = (event: KeyboardEvent) => {
    const features = this.interactiveFeatures();
    const currentIndex = features.findIndex(
      (feature) => feature.properties.code === this.keyboardFeatureCode,
    );
    if (["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown", "Home", "End"].includes(event.key)) {
      if (!features.length) return;
      event.preventDefault();
      const nextIndex = event.key === "Home"
        ? 0
        : event.key === "End"
          ? features.length - 1
          : event.key === "ArrowLeft" || event.key === "ArrowUp"
            ? (currentIndex <= 0 ? features.length : currentIndex) - 1
            : (currentIndex + 1) % features.length;
      this.presentKeyboardFeature(features[nextIndex]);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      const feature = features[currentIndex];
      if (!feature) return;
      event.preventDefault();
      this.events.featureSelect(feature);
      return;
    }
    if (event.key === "Escape" || event.key === "Backspace") {
      if ((this.mapState.navigationPath?.length ?? 1) <= 1) return;
      event.preventDefault();
      this.events.scopeBack();
      return;
    }
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      this.zoomWithKeyboard(0.9);
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      this.zoomWithKeyboard(1.1);
    }
  };

  private onKeyboardBlur = () => this.clearKeyboardSelection();

  private onControlsStart = () => {
    this.controlsInteracting = true;
    this.pauseAutoRotation();
    this.cameraTransition.cancel();
    this.renderer.domElement.style.cursor = "grabbing";
    this.requestHighFrameRate(scopeFrameBoostDuration);
  };

  private onControlsEnd = () => {
    this.controlsInteracting = false;
    this.pauseAutoRotation();
    this.renderer.domElement.style.cursor = this.mapState.scope === "township" ? "zoom-out" : "grab";
    this.syncVisualTuningFromCamera();
  };

  private onClick = (event: MouseEvent) => {
    if (!this.isMapPointerTarget(event)) return;
    const pointerDownPosition = this.pointerDownPosition;
    this.pointerDownPosition = undefined;
    if (pointerDownPosition) {
      const distance = Math.hypot(
        event.clientX - pointerDownPosition[0],
        event.clientY - pointerDownPosition[1],
      );
      if (distance > clickMoveTolerance) return;
    }
    this.updatePointer(event);
    const hit = this.processPointer();
    if (hit?.location) return this.events.locationSelect(hit.location);
    if (hit?.energyTower?.datum.location) {
      return this.events.locationSelect(hit.energyTower.datum.location);
    }
    if (hit?.energyTower?.datum.feature) {
      return this.events.featureSelect(hit.energyTower.datum.feature);
    }
    if (hit?.region) this.events.featureSelect(hit.region.feature);
    else if (hit?.context) this.events.featureSelect(hit.context.feature);
    else if ((this.mapState.navigationPath?.length ?? 1) > 1) this.events.scopeBack();
  };

  private onVisibilityChange = () => {
    if (document.hidden) {
      window.cancelAnimationFrame(this.frameId);
      this.frameId = 0;
    } else {
      this.previousFrameTime = 0;
      this.requestRender();
      this.startLoop();
    }
  };

  private onMotionPreferenceChange = (event: MediaQueryListEvent) => {
    this.motionEnabled = !event.matches;
    if (!this.motionEnabled) {
      this.controls.autoRotate = false;
      window.cancelAnimationFrame(this.frameId);
      this.frameId = 0;
      this.energyTowerLayer?.settle(true);
      this.disposeExitingEnergyTowerLayers();
      this.regionLayer?.settle();
      this.peerRegionLayer?.settle();
      this.contextLayer?.settle();
      this.externalContextLayer?.settle();
      this.preparedScopeLayers?.regionLayer.settle();
      this.preparedScopeLayers?.peerRegionLayer?.settle();
      this.preparedScopeLayers?.contextLayer.settle();
      this.preparedScopeLayers?.externalContextLayer.settle();
      this.disposeExitingScopePresentations(true);
      this.requestRender();
    } else {
      this.previousFrameTime = 0;
      this.pauseAutoRotation();
      this.startLoop();
    }
  };

  private resize = () => {
    this.viewport = this.measureHost();
    const { width, height } = this.viewport;
    const pixelRatio = this.resolvePixelRatio();
    this.camera.aspect = width / height;
    this.applyCameraFraming(this.currentFraming);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height);
    this.labelRenderer.setSize(width, height);
    this.institutionLayer?.setPixelRatio(pixelRatio);
    this.requestRender();
  };

  setMapState(mapState: MapState, locations: readonly EducationLocation[]) {
    this.pauseAutoRotation();
    this.clearKeyboardSelection(false);
    const previousMapState = this.mapState;
    const previousLocations = this.locations;
    const previousScope = this.mapState.scope;
    const structureChanged = mapStructureChanged(previousMapState, mapState);
    if (entersNestedScopeInSameGeometryBand(previousMapState, mapState)) {
      this.suspendDynamicLayers(previousMapState, previousLocations);
    } else if (structureChanged) {
      this.disposeSuspendedDynamicLayers();
    }
    this.mapState = mapState;
    this.locations = locations;
    this.selectedEnergyTowerId = undefined;
    if (mapState.scope !== "township") this.townshipInstitutionTargetZ = undefined;
    this.controls.minDistance = mapState.contextInteractive || mapState.externalInteractive
      ? 140
      : minimumCameraDistanceDuringScopeChange(previousScope, mapState.scope);
    if (structureChanged) {
      const presentationGeneration = ++this.scopePresentationGeneration;
      const previous = this.scopeRoot && this.regionLayer && this.contextLayer && this.effectsLayer
        ? {
            mapState: previousMapState,
            root: this.scopeRoot,
            regionLayer: this.regionLayer,
            peerRegionLayer: this.peerRegionLayer,
            contextLayer: this.contextLayer,
            externalContextLayer: this.externalContextLayer,
            effectsLayer: this.effectsLayer,
          }
        : undefined;
      const prepared = this.preparedStateMatches(mapState)
        ? this.preparedScopeLayers!
        : this.createPreparedScopeLayers(mapState, undefined, true, previousMapState);
      if (this.preparedScopeLayers && this.preparedScopeLayers !== prepared) {
        this.disposePreparedScopeLayers(this.preparedScopeLayers);
      }
      this.preparedScopeLayers = undefined;
      this.clearRegionLabels();
      this.disposeDynamicLayers();
      const outgoingRegionWillExit = Boolean(
        previous
        && previous.regionLayer !== prepared.reusedPeerRegionLayer
        && previous.regionLayer !== prepared.reusedRegionLayer,
      );
      const deferredRevealCode = outgoingRegionWillExit
        ? previousMapState.code
        : undefined;
      const activationStartedAt = performance.now();
      this.activatePreparedScopeLayers(prepared, true, deferredRevealCode);
      if (import.meta.env.DEV) {
        performance.measure("map-scope:activation", { start: activationStartedAt });
      }
      if (previous) {
        this.beginScopeExit(previous, prepared, deferredRevealCode ? () => {
          if (presentationGeneration !== this.scopePresentationGeneration || this.disposed) return;
          this.presentPeerRegionLayer(this.peerRegionLayer);
          this.regionLayer?.setExcludedFeature();
          this.requestHighFrameRate(scopeFrameBoostDuration);
        } : undefined);
      }
      this.requestHighFrameRate(scopeFrameBoostDuration);
      return;
    }
    this.regionLayer?.setFocus(
      mapState.focusFeatureCode,
      this.visualTuning,
      mapState.contextPresentation === "peers" && !mapState.focusFeatureCode,
    );
    if (this.effectsLayer && this.projection && this.regionLayer) {
      this.effectsLayer.setBoundary(
        largestOuterRingOfFeature(boundaryFeatureForMapState(mapState)),
        this.projection,
        this.regionLayer.getBoundarySurfaceZ() + 1.5,
      );
    }
    this.updateRegionLabelPositions();
    if (!this.restoreSuspendedDynamicLayers(mapState, locations)) {
      this.disposeDynamicLayers(this.dataLayerMode === "energy-towers");
      this.buildDynamicLayers();
    }
    this.requestHighFrameRate(scopeFrameBoostDuration);
  }

  setLocations(locations: readonly EducationLocation[]) {
    this.locations = locations;
    this.disposeSuspendedDynamicLayers();
    this.disposeDynamicLayers(this.dataLayerMode === "energy-towers");
    this.buildDynamicLayers();
    this.requestRender();
  }

  setSelectedLocation(locationId?: string) {
    this.selectedLocationId = locationId;
    this.institutionLayer?.setSelected(locationId, this.theme, this.motionEnabled);
    this.requestHighFrameRate(scopeFrameBoostDuration);
  }

  setSelectedEnergyTower(energyTowerId?: string) {
    this.selectedEnergyTowerId = energyTowerId;
    this.energyTowerLayer?.setSelected(energyTowerId);
    this.requestHighFrameRate(scopeFrameBoostDuration);
  }

  setDataLayerMode(mode: MapDataLayerMode) {
    if (this.dataLayerMode === mode) return;
    this.pauseAutoRotation();
    if (this.mapState.scope === "township" && this.dataLayerMode === "institutions") {
      this.townshipInstitutionTargetZ = this.controls.target.z;
    }
    const animateEnergyExit = this.dataLayerMode === "energy-towers";
    this.selectedEnergyTowerId = undefined;
    this.disposeSuspendedDynamicLayers();
    this.disposeDynamicLayers(animateEnergyExit);
    this.dataLayerMode = mode;
    this.buildDynamicLayers();
    if (this.mapState.scope === "township") {
      const currentView = this.cameraTransition.getView();
      const targetZ = mode === "energy-towers"
        ? this.visualTuning.townshipEnergyTowerTargetZ
        : this.townshipInstitutionTargetZ ?? currentView.target[2];
      void this.cameraTransition.animate({
        ...currentView,
        target: [currentView.target[0], currentView.target[1], targetZ],
      }, this.currentFraming, this.motionEnabled)
        .then((status) => {
          if (status === "interrupted") return;
          this.pauseAutoRotation();
          this.syncVisualTuningFromCamera();
        });
    }
    this.requestHighFrameRate();
  }

  setVisualTuning(tuning: Readonly<MapVisualTuning>) {
    this.visualTuning = cloneMapVisualTuning(tuning);
    if (!this.visualTuning.autoRotationEnabled) this.controls.autoRotate = false;
    this.applyMapTransform();
    this.applyCameraFraming(mapScreenFraming(this.mapState, this.visualTuning));
    for (const layer of this.activeLayers()) {
      layer.applyTuning(this.theme, this.visualTuning);
    }
    this.ambientLight.intensity = this.visualTuning.ambientLightIntensity;
    this.directionLight.intensity = this.visualTuning.directionalLightIntensity;
    this.requestHighFrameRate();
  }

  setTheme(theme: DigitalTwinMapTheme) {
    this.theme = theme;
    for (const layer of this.activeLayers()) {
      layer.applyTheme(theme, this.visualTuning);
    }
    this.ambientLight.color.set(theme.sideTop);
    this.directionLight.color.set(theme.labelText);
    this.requestRender();
  }

  private activeLayers(): TuningAwareMapSceneLayer[] {
    const layers: Array<TuningAwareMapSceneLayer | undefined> = [
      this.groundLayer,
      this.regionLayer,
      this.peerRegionLayer,
      this.contextLayer,
      this.externalContextLayer,
      this.institutionLayer,
      this.connectionLayer,
      this.energyTowerLayer,
      this.suspendedDynamicLayers?.institutionLayer,
      this.suspendedDynamicLayers?.connectionLayer,
      this.suspendedDynamicLayers?.energyTowerLayer,
      ...this.exitingEnergyTowerLayers,
      this.effectsLayer,
      this.preparedScopeLayers?.regionLayer,
      this.preparedScopeLayers?.peerRegionLayer,
      this.preparedScopeLayers?.contextLayer,
      this.preparedScopeLayers?.externalContextLayer,
      this.preparedScopeLayers?.effectsLayer,
      ...this.exitingScopePresentations.flatMap((presentation) => presentation.layers),
    ];
    return [...new Set(
      layers.filter((layer): layer is TuningAwareMapSceneLayer => Boolean(layer)),
    )];
  }

  getCameraView(): MapCameraView {
    return this.cameraTransition.getView();
  }

  private applyCameraViewInternal(view: MapCameraView) {
    this.applyMapTransform();
    const framing = mapScreenFraming(this.mapState, this.visualTuning);
    this.cameraTransition.apply(view, framing);
    this.alignOrbitPivot(true);
  }

  private syncVisualTuningFromCamera() {
    this.visualTuning = mapVisualTuningWithCameraView(
      this.visualTuning,
      this.cameraTransition.getView(),
    );
  }

  private applyMapTransform() {
    this.mapRoot.position.set(0, 0, -24);
    this.mapRoot.rotation.z = this.visualTuning.rotationZ;
    this.mapRoot.scale.setScalar(this.visualTuning.scale);
  }

  private applyCameraFraming = (framing: MapCameraFraming) => {
    this.currentFraming = { ...framing };
    this.camera.setViewOffset(
      this.viewport.width,
      this.viewport.height,
      -framing.x,
      framing.y,
      this.viewport.width,
      this.viewport.height,
    );
    this.camera.updateProjectionMatrix();
  };

  private alignOrbitPivot(preserveCameraOffset: boolean) {
    if (!this.projection || !this.regionLayer) return;
    const pivot = resolveMapOrbitPivot(
      this.mapState,
      this.projection,
      this.mapRoot,
      this.regionLayer.getActiveSurfaceZ(),
    );
    if (!pivot) return;
    if (this.mapState.scope === "township" && this.dataLayerMode === "energy-towers") {
      pivot.z = this.visualTuning.townshipEnergyTowerTargetZ;
    }
    if (preserveCameraOffset) {
      this.camera.position.add(pivot.clone().sub(this.controls.target));
    }
    this.controls.target.copy(pivot);
    this.controls.update();
  }

  private transitionToFeature(
    featureCode: string,
    applyTownshipDefaults: boolean,
    updatePresentation: boolean,
  ): Promise<void> {
    const activeFeature = this.mapState.geoData.features.find(
      (item) => item.properties.code === featureCode,
    );
    const peerFeature = this.mapState.contextGeoData?.features.find(
      (item) => item.properties.code === featureCode,
    );
    const externalFeature = this.mapState.externalGeoData?.features.find(
      (item) => item.properties.code === featureCode,
    );
    const feature = activeFeature ?? peerFeature ?? externalFeature;
    const coordinate = feature ? featureVisualCenter(feature) : undefined;
    if (!coordinate || !this.projection) return Promise.resolve();
    this.pauseAutoRotation();
    if (updatePresentation) {
      if (activeFeature) {
        this.regionLayer?.setFocus(featureCode, this.visualTuning);
      } else if (peerFeature && this.mapState.contextPresentation === "peers") {
        this.peerRegionLayer?.setFocus(featureCode, this.visualTuning);
      }
    }
    this.requestHighFrameRate(scopeFrameBoostDuration);
    this.scene.updateMatrixWorld();
    const focusedLayer = activeFeature ? this.regionLayer : this.peerRegionLayer;
    const target = this.projection.projectPoint(
      coordinate,
      (focusedLayer?.getFocusedSurfaceZ() ?? regionTopZ) + 8,
    );
    this.mapRoot.localToWorld(target);
    const framedTarget = target.clone();
    this.townshipInstitutionTargetZ = framedTarget.z;
    framedTarget.z = townshipFocusTargetZ(
      this.dataLayerMode,
      framedTarget.z,
      this.visualTuning,
    );
    const direction = this.camera.position.clone().sub(this.controls.target).normalize();
    const position = framedTarget.clone().addScaledVector(
      direction,
      this.visualTuning.townshipFocusDistance,
    );
    position.z = townshipFocusPositionZ(
      applyTownshipDefaults,
      this.camera.position.z,
      this.visualTuning,
    );
    return this.cameraTransition.animate({
      fov: this.visualTuning.cameraFov,
      position: [position.x, position.y, position.z],
      target: [framedTarget.x, framedTarget.y, framedTarget.z],
    }, mapScreenFraming(this.mapState, this.visualTuning), this.motionEnabled).then((status) => {
      if (status === "interrupted") return;
      this.pauseAutoRotation();
      this.syncVisualTuningFromCamera();
    });
  }

  previewFeature(featureCode: string, applyTownshipDefaults: boolean): Promise<void> {
    // A click is preceded by pointer hover. Clear that transient emphasis so
    // the parent shell stays visually stable while the child layer prepares.
    this.regionLayer?.setHovered();
    this.peerRegionLayer?.setHovered();
    this.contextLayer?.setHovered();
    this.externalContextLayer?.setHovered();
    return this.transitionToFeature(featureCode, applyTownshipDefaults, false);
  }

  focusFeature(featureCode: string, applyTownshipDefaults: boolean): Promise<void> {
    return this.transitionToFeature(featureCode, applyTownshipDefaults, true);
  }

  focusCurrentBoundary(): Promise<void> {
    const feature = boundaryFeatureForMapState(this.mapState);
    const featureCode = feature?.properties.code;
    return typeof featureCode === "string"
      ? this.focusFeature(featureCode, true)
      : Promise.resolve();
  }

  restoreMapPresentation() {
    this.regionLayer?.setFocus(
      this.mapState.focusFeatureCode,
      this.visualTuning,
      this.mapState.contextPresentation === "peers" && !this.mapState.focusFeatureCode,
    );
    this.presentPeerRegionLayer(this.peerRegionLayer);
    this.requestHighFrameRate(scopeFrameBoostDuration);
  }

  animateCameraView(view: MapCameraView) {
    this.pauseAutoRotation();
    return this.cameraTransition.animate(
      view,
      mapScreenFraming(this.mapState, this.visualTuning),
      this.motionEnabled,
    ).then((status) => {
      if (status === "interrupted") return;
      this.pauseAutoRotation();
      this.controls.minDistance = this.mapState.contextInteractive
        ? 140
        : minimumCameraDistanceForScope(this.mapState.scope);
      this.controls.update();
      this.syncVisualTuningFromCamera();
    });
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    window.cancelAnimationFrame(this.frameId);
    this.resizeObserver?.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.motionQuery?.removeEventListener("change", this.onMotionPreferenceChange);
    this.host.removeEventListener("pointermove", this.onPointerMove);
    this.host.removeEventListener("pointerleave", this.onPointerLeave);
    this.host.removeEventListener("pointerdown", this.onPointerDown);
    this.host.removeEventListener("pointercancel", this.onPointerCancel);
    this.host.removeEventListener("click", this.onClick);
    this.host.removeEventListener("contextmenu", this.onContextMenu);
    this.renderer.domElement.removeEventListener("keydown", this.onKeyDown);
    this.renderer.domElement.removeEventListener("blur", this.onKeyboardBlur);
    this.controls.removeEventListener("change", this.requestRender);
    this.controls.removeEventListener("start", this.onControlsStart);
    this.controls.removeEventListener("end", this.onControlsEnd);
    this.cameraTransition.cancel();
    this.prepareScopeGeneration += 1;
    this.disposePreparedScopeLayers(this.preparedScopeLayers);
    this.preparedScopeLayers = undefined;
    this.disposeSuspendedDynamicLayers();
    this.controls.dispose();
    disposeMapSceneLayers([this.groundLayer]);
    this.disposeScopeLayers();
    this.disposeDynamicLayers();
    this.disposeExitingEnergyTowerLayers();
    this.disposeExitingScopePresentations();
    this.mapRoot.clear();
    this.scene.clear();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labelRenderer.domElement.remove();
    this.keyboardStatusElement.remove();
  }
}
