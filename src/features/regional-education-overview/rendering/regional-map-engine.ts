import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  CSS2DObject,
  CSS2DRenderer,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { GeoFeature } from "../geo";
import {
  boundaryFeatureForMapState,
  regionalContextGeoData,
} from "../map-data-adapter";
import type { MapState } from "../map-data-adapter";
import type { DigitalTwinMapTheme } from "../map-themes";
import type { EducationLocation, MapCameraView } from "../types";
import { AmbientEffectsLayer } from "./ambient-effects-layer";
import { ConnectionLayer } from "./connection-layer";
import { InstitutionLayer } from "./institution-layer";
import { MapCameraTransition } from "./map-camera-transition";
import {
  createMapProjection,
  featureCenter,
  largestOuterRingOfFeature,
} from "./map-projection";
import type { MapProjection } from "./map-projection";
import { RegionLayer, regionTopZ } from "./region-layer";
import { RegionalContextLayer } from "./regional-context-layer";
import {
  cloneMapVisualTuning,
  defaultMapVisualTuning,
  mapCameraTuningChanged,
  mapCameraViewFromTuning,
  mapVisualTuningWithCameraView,
} from "./map-visual-tuning";
import type { MapVisualTuning } from "./map-visual-tuning";
import { createTerrainTextureSet } from "./terrain-texture-set";
import type { TerrainTextureSet } from "./terrain-texture-set";

const mapWidth = 860;
const mapHeight = 520;
const mapPadding = 30;
const connectionOverlayRenderOrder = 60;
const institutionOverlayRenderOrder = 70;
const idleFrameRate = 30;
const interactionFrameRate = 60;
const hoverFrameBoostDuration = 500;
const scopeFrameBoostDuration = 1400;
const clickMoveTolerance = 5;
const minimumMapPolarAngle = THREE.MathUtils.degToRad(20);
const maximumMapPolarAngle = THREE.MathUtils.degToRad(75);
export const defaultRegionalMapCameraView: MapCameraView = {
  ...mapCameraViewFromTuning(defaultMapVisualTuning),
};

interface RegionalMapEngineEvents {
  locationSelect: (location: EducationLocation) => void;
  featureSelect: (feature: GeoFeature) => void;
  scopeBack: () => void;
  visualTuningChange: (tuning: MapVisualTuning) => void;
}

interface MapViewport {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function anchorDynamicOverlay(
  root: THREE.Group,
  activeSurfaceZ: number,
  renderOrder: number,
) {
  root.position.z = activeSurfaceZ - regionTopZ;
  root.renderOrder = renderOrder;
}

export function scopeFramingX(
  mapState: Pick<MapState, "scope">,
  tuning: Pick<MapVisualTuning, "offsetX" | "districtFramingOffsetX">,
) {
  return tuning.offsetX + (mapState.scope === "district" ? tuning.districtFramingOffsetX : 0);
}

export function compensateTransitionTargetX(
  worldTargetX: number,
  currentRootX: number,
  targetRootX: number,
) {
  return worldTargetX + targetRootX - currentRootX;
}

export class RegionalMapEngine {
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly labelRenderer = new CSS2DRenderer();
  private readonly controls: OrbitControls;
  private readonly cameraTransition: MapCameraTransition;
  private readonly mapRoot = new THREE.Group();
  private readonly regionLabelGroup = new THREE.Group();
  private readonly labelElements = new Set<HTMLElement>();
  private readonly regionLabelElements = new Map<GeoFeature, HTMLElement>();
  private readonly regionLabelObjects = new Map<GeoFeature, CSS2DObject>();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly ambientLight: THREE.AmbientLight;
  private readonly directionLight: THREE.DirectionalLight;
  private readonly textures: TerrainTextureSet;
  private readonly resizeObserver?: ResizeObserver;
  private viewport: MapViewport = { left: 0, top: 0, width: 1, height: 1 };
  private regionLayer?: RegionLayer;
  private contextLayer?: RegionalContextLayer;
  private institutionLayer?: InstitutionLayer;
  private connectionLayer?: ConnectionLayer;
  private effectsLayer?: AmbientEffectsLayer;
  private projection?: MapProjection;
  private frameId = 0;
  private previousFrameTime = 0;
  private highFrameRateUntil = 0;
  private pointerDownPosition?: [number, number];
  private controlsInteracting = false;
  private pointerDirty = false;
  private disposed = false;
  private motionEnabled = true;
  private selectedLocationId?: string;
  private mapState: MapState;
  private locations: readonly EducationLocation[];
  private theme: DigitalTwinMapTheme;
  private visualTuning: MapVisualTuning = cloneMapVisualTuning(defaultMapVisualTuning);

  constructor(
    private readonly host: HTMLElement,
    mapState: MapState,
    locations: readonly EducationLocation[],
    theme: DigitalTwinMapTheme,
    selectedLocationId: string | undefined,
    private readonly events: RegionalMapEngineEvents,
  ) {
    this.mapState = mapState;
    this.locations = locations;
    this.theme = theme;
    this.selectedLocationId = selectedLocationId;
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
    this.renderer.domElement.setAttribute(
      "aria-label",
      "三维地图画布，使用鼠标左键旋转、滚轮缩放",
    );
    this.host.appendChild(this.renderer.domElement);

    this.labelRenderer.setSize(width, height);
    this.labelRenderer.domElement.className = "map-label-layer";
    this.host.appendChild(this.labelRenderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = false;
    this.controls.minPolarAngle = minimumMapPolarAngle;
    this.controls.maxPolarAngle = maximumMapPolarAngle;
    this.controls.minDistance = 480;
    this.controls.maxDistance = 1100;
    this.cameraTransition = new MapCameraTransition({
      camera: this.camera,
      controls: this.controls,
      mapRoot: this.mapRoot,
      requestRender: this.requestRender,
      requestHighFrameRate: this.requestHighFrameRate,
    });
    this.applyCameraViewInternal(defaultRegionalMapCameraView);
    this.controls.addEventListener("change", this.requestRender);
    this.controls.addEventListener("start", this.onControlsStart);
    this.controls.addEventListener("end", this.onControlsEnd);

    this.ambientLight = new THREE.AmbientLight(theme.sideTop, 1.35);
    this.directionLight = new THREE.DirectionalLight(theme.labelText, 2.2);
    this.directionLight.position.set(120, -240, 420);
    this.scene.add(this.ambientLight, this.directionLight, this.mapRoot);
    this.applyMapTransform();
    this.textures = createTerrainTextureSet(this.renderer);
    this.buildScopeLayers();

    this.host.addEventListener("pointermove", this.onPointerMove);
    this.host.addEventListener("pointerleave", this.onPointerLeave);
    this.host.addEventListener("pointerdown", this.onPointerDown);
    this.host.addEventListener("pointercancel", this.onPointerCancel);
    this.host.addEventListener("click", this.onClick);
    this.host.addEventListener("contextmenu", this.onContextMenu);
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
      const coordinate = featureCenter(feature);
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
    const boundarySurfaceZ = this.regionLayer?.getBoundarySurfaceZ() ?? activeSurfaceZ;
    this.effectsLayer?.setBoundarySurfaceZ(boundarySurfaceZ + 1.5);
  }

  private buildScopeLayers() {
    this.regionLayer?.dispose();
    this.contextLayer?.dispose();
    this.effectsLayer?.dispose();
    this.disposeDynamicLayers();
    this.projection = createMapProjection(this.mapState.geoData, mapWidth, mapHeight, mapPadding);
    this.contextLayer = new RegionalContextLayer(
      regionalContextGeoData,
      this.projection,
      this.theme,
      this.visualTuning,
    );
    this.regionLayer = new RegionLayer(
      this.mapState,
      this.projection,
      this.theme,
      this.textures,
      this.visualTuning,
    );
    this.regionLayer.setFocus(this.mapState.focusFeatureCode, this.visualTuning);
    this.effectsLayer = new AmbientEffectsLayer(
      largestOuterRingOfFeature(boundaryFeatureForMapState(this.mapState)),
      this.projection,
      this.theme,
      this.visualTuning,
      this.regionLayer.getBoundarySurfaceZ() + 1.5,
    );
    this.mapRoot.add(
      this.contextLayer.root,
      this.regionLayer.root,
      this.effectsLayer.root,
    );
    this.buildRegionLabels();
    this.buildDynamicLayers();
  }

  private buildDynamicLayers() {
    if (!this.projection) return;
    this.institutionLayer = new InstitutionLayer(
      this.locations,
      this.projection,
      this.theme,
      this.selectedLocationId,
      this.renderer.getPixelRatio(),
    );
    this.connectionLayer = new ConnectionLayer(this.locations, this.projection, this.theme);
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
    this.mapRoot.add(this.connectionLayer.root, this.institutionLayer.root);
  }

  private disposeDynamicLayers() {
    this.institutionLayer?.dispose();
    this.connectionLayer?.dispose();
    this.institutionLayer = undefined;
    this.connectionLayer = undefined;
  }

  private processPointer() {
    if (!this.pointerDirty || this.controlsInteracting) return;
    this.pointerDirty = false;
    this.scene.updateMatrixWorld();
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const location = this.institutionLayer?.hitScreenPoint(
      this.pointer,
      this.camera,
      this.viewport,
    );
    const region = this.regionLayer?.hit(this.raycaster);
    this.institutionLayer?.setHovered(location?.id);
    this.regionLayer?.setHovered(region?.group);
    if (region) {
      this.highFrameRateUntil = Math.max(
        this.highFrameRateUntil,
        performance.now() + hoverFrameBoostDuration,
      );
    }
    this.updateRegionLabelPositions();
    for (const [feature, element] of this.regionLabelElements) {
      element.classList.toggle(
        "is-visible",
        !location && feature === region?.feature,
      );
    }
    this.renderer.domElement.style.cursor = location || region
      ? "pointer"
      : this.mapState.scope === "township" ? "zoom-out" : "grab";
    return { location, region };
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
    const controlsDirty = this.controls.update();
    const time = timestamp / 1000;
    if (this.motionEnabled) {
      this.connectionLayer?.animate(time);
      this.effectsLayer?.animate(time, delta);
      this.institutionLayer?.animate(time);
    }
    const regionDirty = this.motionEnabled
      ? this.regionLayer?.animate(delta) ?? false
      : this.regionLayer?.settle() ?? false;
    if (regionDirty) {
      this.syncSurfaceLayers();
      this.updateRegionLabelPositions();
    }
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
    if (this.motionEnabled || controlsDirty || regionDirty) {
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

  private updatePointer(event: PointerEvent | MouseEvent) {
    this.pointer.x = ((event.clientX - this.viewport.left) / this.viewport.width) * 2 - 1;
    this.pointer.y = -((event.clientY - this.viewport.top) / this.viewport.height) * 2 + 1;
    this.pointerDirty = true;
  }

  private onPointerMove = (event: PointerEvent) => {
    this.updatePointer(event);
    this.requestRender();
  };

  private onPointerLeave = () => {
    if (this.controlsInteracting) return;
    this.pointerDirty = false;
    this.institutionLayer?.setHovered();
    this.regionLayer?.setHovered();
    for (const element of this.regionLabelElements.values()) element.classList.remove("is-visible");
    this.renderer.domElement.style.cursor = this.mapState.scope === "township" ? "zoom-out" : "grab";
    this.requestRender();
  };

  private onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    this.renderer.domElement.focus({ preventScroll: true });
    this.pointerDownPosition = [event.clientX, event.clientY];
  };

  private onPointerCancel = () => {
    this.pointerDownPosition = undefined;
  };
  private onContextMenu = (event: MouseEvent) => event.preventDefault();

  private onControlsStart = () => {
    this.controlsInteracting = true;
    this.cameraTransition.cancel();
    this.renderer.domElement.style.cursor = "grabbing";
    this.requestHighFrameRate(scopeFrameBoostDuration);
  };

  private onControlsEnd = () => {
    this.controlsInteracting = false;
    this.renderer.domElement.style.cursor = this.mapState.scope === "township" ? "zoom-out" : "grab";
    this.syncVisualTuningFromCamera();
  };

  private onClick = (event: MouseEvent) => {
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
    if (hit?.region) this.events.featureSelect(hit.region.feature);
    else if (this.mapState.scope === "township") this.events.scopeBack();
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
      window.cancelAnimationFrame(this.frameId);
      this.frameId = 0;
      this.requestRender();
    } else {
      this.previousFrameTime = 0;
      this.startLoop();
    }
  };

  private resize = () => {
    this.viewport = this.measureHost();
    const { width, height } = this.viewport;
    const pixelRatio = this.resolvePixelRatio();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height);
    this.labelRenderer.setSize(width, height);
    this.institutionLayer?.setPixelRatio(pixelRatio);
    this.requestRender();
  };

  setMapState(mapState: MapState, locations: readonly EducationLocation[]) {
    this.mapState = mapState;
    this.locations = locations;
    this.regionLayer?.setFocus(mapState.focusFeatureCode, this.visualTuning);
    if (this.effectsLayer && this.projection && this.regionLayer) {
      this.effectsLayer.setBoundary(
        largestOuterRingOfFeature(boundaryFeatureForMapState(mapState)),
        this.projection,
        this.regionLayer.getBoundarySurfaceZ() + 1.5,
      );
    }
    this.updateRegionLabelPositions();
    this.disposeDynamicLayers();
    this.buildDynamicLayers();
    this.requestHighFrameRate(scopeFrameBoostDuration);
  }

  setLocations(locations: readonly EducationLocation[]) {
    this.locations = locations;
    this.disposeDynamicLayers();
    this.buildDynamicLayers();
    this.requestRender();
  }

  setSelectedLocation(locationId?: string) {
    this.selectedLocationId = locationId;
    this.institutionLayer?.setSelected(locationId, this.theme);
    this.requestRender();
  }

  setTheme(theme: DigitalTwinMapTheme) {
    this.theme = theme;
    this.regionLayer?.applyTheme(theme);
    this.contextLayer?.applyTheme(theme, this.visualTuning);
    this.institutionLayer?.applyTheme(theme);
    this.connectionLayer?.applyTheme(theme);
    this.effectsLayer?.applyTheme(theme, this.visualTuning);
    this.ambientLight.color.set(theme.sideTop);
    this.directionLight.color.set(theme.labelText);
    this.requestRender();
  }

  getCameraView(): MapCameraView {
    return this.cameraTransition.getView();
  }

  private applyCameraViewInternal(view: MapCameraView) {
    this.applyMapTransform();
    this.cameraTransition.apply(view, this.mapRoot.position.x);
  }

  applyCameraView(view: MapCameraView) {
    this.applyCameraViewInternal(view);
    this.syncVisualTuningFromCamera();
  }

  private syncVisualTuningFromCamera() {
    this.visualTuning = mapVisualTuningWithCameraView(
      this.visualTuning,
      this.cameraTransition.getView(),
    );
    this.events.visualTuningChange(cloneMapVisualTuning(this.visualTuning));
  }

  private applyMapTransform() {
    this.mapRoot.position.set(
      scopeFramingX(this.mapState, this.visualTuning),
      this.visualTuning.offsetY,
      -24,
    );
    this.mapRoot.rotation.z = this.visualTuning.rotationZ;
    this.mapRoot.scale.setScalar(this.visualTuning.scale);
  }

  setVisualTuning(tuning: MapVisualTuning) {
    this.cameraTransition.cancel();
    const cameraChanged = mapCameraTuningChanged(this.visualTuning, tuning);
    this.visualTuning = cloneMapVisualTuning(tuning);
    this.applyMapTransform();
    if (cameraChanged) {
      this.cameraTransition.apply(
        mapCameraViewFromTuning(tuning),
        this.mapRoot.position.x,
      );
    }
    this.contextLayer?.applyTheme(this.theme, tuning);
    this.regionLayer?.setTuning(tuning);
    this.effectsLayer?.applyTheme(this.theme, tuning);
    if (!this.motionEnabled) this.regionLayer?.settle();
    this.syncSurfaceLayers();
    this.updateRegionLabelPositions();
    this.requestRender();
  }

  focusFeature(featureCode: string): Promise<void> {
    const feature = this.mapState.geoData.features.find(
      (item) => item.properties.code === featureCode,
    );
    const coordinate = feature ? featureCenter(feature) : undefined;
    if (!coordinate || !this.projection) return Promise.resolve();
    this.scene.updateMatrixWorld();
    const target = this.projection.projectPoint(
      coordinate,
      (this.regionLayer?.getActiveSurfaceZ() ?? regionTopZ) + 8,
    );
    this.mapRoot.localToWorld(target);
    const targetRootX = scopeFramingX(this.mapState, this.visualTuning);
    target.x = compensateTransitionTargetX(
      target.x,
      this.mapRoot.position.x,
      targetRootX,
    );
    const framedTarget = target.clone();
    framedTarget.x += this.visualTuning.townshipFocusFramingOffsetX;
    framedTarget.y += this.visualTuning.townshipFocusFramingOffsetY;
    const direction = this.camera.position.clone().sub(this.controls.target).normalize();
    const position = framedTarget.clone().addScaledVector(
      direction,
      this.visualTuning.townshipFocusDistance,
    );
    return this.cameraTransition.animate({
      fov: this.visualTuning.cameraFov,
      position: [position.x, position.y, position.z],
      target: [framedTarget.x, framedTarget.y, framedTarget.z],
    }, targetRootX, this.motionEnabled).then(() => this.syncVisualTuningFromCamera());
  }

  animateCameraView(view: MapCameraView) {
    return this.cameraTransition.animate(
      view,
      scopeFramingX(this.mapState, this.visualTuning),
      this.motionEnabled,
    ).then(() => this.syncVisualTuningFromCamera());
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
    this.controls.removeEventListener("change", this.requestRender);
    this.controls.removeEventListener("start", this.onControlsStart);
    this.controls.removeEventListener("end", this.onControlsEnd);
    this.controls.dispose();
    this.cameraTransition.cancel();
    this.clearRegionLabels();
    this.regionLayer?.dispose();
    this.contextLayer?.dispose();
    this.effectsLayer?.dispose();
    this.disposeDynamicLayers();
    this.textures.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labelRenderer.domElement.remove();
  }
}
