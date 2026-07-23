import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { GeoFeature, Position } from "../geo";
import type { MapState } from "../map-state";
import type { DigitalTwinMapTheme } from "../map-themes";
import type { TuningAwareMapSceneLayer } from "./map-scene-layer";
import type { MapProjection } from "./map-projection";
import { polygonsOf } from "./map-projection";
import type { MapVisualTuning } from "./map-visual-tuning";
import { mapVisualColor } from "./map-visual-tuning";
import { regionalContextSurfaceZ } from "./regional-context-layer";
import { ResourceOwner } from "./resource-owner";
import { themeColor } from "./theme-color";

const topZ = 44;
const bottomZ = 22;
const baseThickness = topZ - bottomZ;
const externalPresentationThickness = 0.05;
const referenceFrameSeconds = 1 / 60;

function dampingRate(frameFactor: number) {
  return -Math.log(1 - frameFactor) / referenceFrameSeconds;
}

const focusTransitionDamping = dampingRate(0.14);

const interactionDamping = {
  scale: focusTransitionDamping,
  // Keep thickness scale and base offset on the same curve so a hover can grow
  // downward while the region's top surface stays mathematically stationary.
  elevation: focusTransitionDamping,
  highlight: dampingRate(0.2),
  overlay: dampingRate(0.16),
  // Cross-geometry transitions use the same response curve as district focus
  // changes so city and district sibling navigation feel identical.
  presentation: focusTransitionDamping,
} as const;

function damp(current: number, target: number, rate: number, delta: number, epsilon: number) {
  const safeDelta = THREE.MathUtils.clamp(delta, 0, 0.1);
  const next = THREE.MathUtils.lerp(current, target, 1 - Math.exp(-rate * safeDelta));
  return Math.abs(target - next) < epsilon ? target : next;
}

function interactionValue(
  current: number,
  target: number,
  rate: number,
  delta: number | undefined,
  epsilon: number,
) {
  return delta === undefined ? target : damp(current, target, rate, delta, epsilon);
}

interface RegionHit {
  feature: GeoFeature;
  group: THREE.Group;
}

export class RegionLayer implements TuningAwareMapSceneLayer {
  readonly root = new THREE.Group();
  private readonly owner = new ResourceOwner();
  private readonly interactiveMeshes: THREE.Mesh[] = [];
  private readonly regionGroups = new Set<THREE.Group>();
  private readonly regionGroupsByCode = new Map<string, THREE.Group[]>();
  private readonly highlightMaterials = new Map<THREE.Group, THREE.MeshBasicMaterial>();
  private readonly highlightMeshes = new Map<THREE.Group, THREE.Mesh>();
  private readonly inactiveOverlayMaterials = new Map<THREE.Group, THREE.MeshBasicMaterial>();
  private readonly inactiveOverlayMeshes = new Map<THREE.Group, THREE.Mesh>();
  private readonly baseMaterial: THREE.MeshBasicMaterial;
  private readonly sideDepthMaterial: THREE.MeshBasicMaterial;
  private readonly sideMaterial: THREE.ShaderMaterial;
  private readonly terrainMaterials: readonly [
    THREE.MeshStandardMaterial,
    THREE.MeshStandardMaterial,
  ];
  private readonly internalBoundaryMaterial: THREE.LineBasicMaterial;
  private readonly topContourMaterial: THREE.LineBasicMaterial;
  private focusFeatureCode?: string;
  private emphasizeAll = false;
  private forceSiblingPresentation = false;
  private hoveredFeatureCode?: string;
  private presentationOpacity = 1;
  private targetPresentationOpacity = 1;
  private externalPresentation = 0;
  private targetExternalPresentation = 0;
  private tuning: MapVisualTuning;
  private theme: DigitalTwinMapTheme;

  constructor(
    mapState: MapState,
    private readonly projection: MapProjection,
    theme: DigitalTwinMapTheme,
    tuning: MapVisualTuning,
  ) {
    this.theme = theme;
    this.tuning = tuning;
    this.baseMaterial = this.owner.material(new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.75,
      // The bottom cap is only physically visible from below. Rendering its
      // front face from above lets its edge bleed through translucent walls.
      side: THREE.BackSide,
      depthWrite: false,
    }));
    this.sideDepthMaterial = this.owner.material(new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    }));
    this.sideDepthMaterial.colorWrite = false;
    this.sideMaterial = this.owner.material(new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        topColor: { value: new THREE.Color() },
        bottomColor: { value: new THREE.Color() },
        topOpacity: { value: tuning.regionSideTopOpacity },
        bottomOpacity: { value: 0.06 },
      },
      vertexShader: `
        varying float vHeight;
        void main() {
          vHeight = clamp((position.z - ${bottomZ.toFixed(1)}) / ${(topZ - bottomZ).toFixed(1)}, 0.0, 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float topOpacity;
        uniform float bottomOpacity;
        varying float vHeight;
        void main() {
          vec3 color = mix(bottomColor, topColor, vHeight);
          float opacity = mix(bottomOpacity, topOpacity, vHeight);
          gl_FragColor = vec4(color, opacity);
        }
      `,
    }));
    const createTerrainMaterial = () => this.owner.material(new THREE.MeshStandardMaterial({
      roughness: 0.94,
      metalness: 0.03,
      transparent: false,
      side: THREE.DoubleSide,
      depthWrite: true,
      alphaTest: 0.02,
      emissiveIntensity: tuning.regionTerrainEmissiveIntensity,
    }));
    this.terrainMaterials = [createTerrainMaterial(), createTerrainMaterial()];
    this.internalBoundaryMaterial = this.owner.material(new THREE.LineBasicMaterial({
      transparent: true,
      depthTest: true,
      depthWrite: false,
    }));
    this.topContourMaterial = this.owner.material(new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
    }));
    this.build(mapState);
    this.applyTheme(theme);
  }

  private createBoundaryGeometry(rings: readonly Position[][], z: number) {
    const vertices: number[] = [];
    for (const ring of rings) {
      const points = ring.map((coordinate) => this.projection.projectPoint(coordinate, z));
      const first = points[0];
      const last = points[points.length - 1];
      if (first && last && !first.equals(last)) points.push(first.clone());
      for (let index = 0; index < points.length - 1; index += 1) {
        const start = points[index];
        const end = points[index + 1];
        if (!start || !end) continue;
        vertices.push(start.x, start.y, start.z, end.x, end.y, end.z);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    return this.owner.geometry(geometry);
  }

  private createSideWallGeometry(ring: Position[]) {
    const vertices: number[] = [];
    for (let index = 0; index < ring.length - 1; index += 1) {
      const start = ring[index];
      const end = ring[index + 1];
      if (!start || !end) continue;
      const startPoint = this.projection.projectPoint(start);
      const endPoint = this.projection.projectPoint(end);
      vertices.push(
        startPoint.x, startPoint.y, bottomZ,
        endPoint.x, endPoint.y, bottomZ,
        endPoint.x, endPoint.y, topZ,
        startPoint.x, startPoint.y, bottomZ,
        endPoint.x, endPoint.y, topZ,
        startPoint.x, startPoint.y, topZ,
      );
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    return geometry;
  }

  private mergeOwnedGeometries(geometries: THREE.BufferGeometry[]) {
    if (geometries.length === 1) return this.owner.geometry(geometries[0]!);
    const merged = mergeGeometries(geometries, false);
    for (const geometry of geometries) geometry.dispose();
    if (!merged) throw new Error("行政区碎片几何无法合并");
    return this.owner.geometry(merged);
  }

  private build(mapState: MapState) {
    for (const [featureIndex, feature] of mapState.geoData.features.entries()) {
      const featureCode = feature.properties.code;
      const numericSuffix = typeof featureCode === "string"
        ? Number(featureCode.charAt(featureCode.length - 1))
        : Number.NaN;
      const terrainToneIndex = Number.isFinite(numericSuffix)
        ? numericSuffix % 2
        : featureIndex % 2;
      const capGeometries: THREE.BufferGeometry[] = [];
      const sideWallGeometries: THREE.BufferGeometry[] = [];
      const internalRings: Position[][] = [];
      const outerRings: Position[][] = [];
      for (const polygon of polygonsOf(feature)) {
        const outerRing = polygon[0];
        const shape = this.projection.makeShape(polygon);
        if (!outerRing || !shape) continue;
        capGeometries.push(new THREE.ShapeGeometry(shape));
        sideWallGeometries.push(this.createSideWallGeometry(outerRing));
        internalRings.push(...polygon);
        outerRings.push(outerRing);
      }
      if (capGeometries.length === 0) continue;

      const regionGroup = new THREE.Group();
      regionGroup.userData.feature = feature;
      regionGroup.userData.targetBaseZ = 0;
      regionGroup.userData.targetScaleZ = 1;
      this.regionGroups.add(regionGroup);
      if (typeof featureCode === "string") {
        this.regionGroupsByCode.set(featureCode, [regionGroup]);
      }

      // All fragments of one administrative feature share a single GPU batch.
      // This keeps MultiPolygon islands interactive as one region while avoiding
      // a complete material stack and draw call set for every individual island.
      const capGeometry = this.mergeOwnedGeometries(capGeometries);
      const sideWallGeometry = this.mergeOwnedGeometries(sideWallGeometries);

      const base = new THREE.Mesh(capGeometry, this.baseMaterial);
      base.position.z = bottomZ;
      regionGroup.add(
        base,
        new THREE.Mesh(sideWallGeometry, this.sideDepthMaterial),
        new THREE.Mesh(sideWallGeometry, this.sideMaterial),
      );

      const terrain = new THREE.Mesh(capGeometry, this.terrainMaterials[terrainToneIndex]);
      terrain.position.z = topZ;
      terrain.userData.regionGroup = regionGroup;
      terrain.userData.feature = feature;
      regionGroup.add(terrain);
      this.interactiveMeshes.push(terrain);

      const highlightMaterial = this.owner.material(new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: false,
      }));
      highlightMaterial.userData.targetOpacity = 0;
      const highlight = new THREE.Mesh(capGeometry, highlightMaterial);
      highlight.position.z = topZ + 2;
      highlight.visible = false;
      regionGroup.add(highlight);
      this.highlightMaterials.set(regionGroup, highlightMaterial);
      this.highlightMeshes.set(regionGroup, highlight);

      const inactiveOverlayMaterial = this.owner.material(new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: false,
      }));
      inactiveOverlayMaterial.userData.targetOpacity = 0;
      const inactiveOverlay = new THREE.Mesh(capGeometry, inactiveOverlayMaterial);
      inactiveOverlay.position.z = topZ + 2.5;
      inactiveOverlay.visible = false;
      regionGroup.add(inactiveOverlay);
      this.inactiveOverlayMaterials.set(regionGroup, inactiveOverlayMaterial);
      this.inactiveOverlayMeshes.set(regionGroup, inactiveOverlay);

      regionGroup.add(
        new THREE.LineSegments(
          this.createBoundaryGeometry(internalRings, topZ + 0.6),
          this.internalBoundaryMaterial,
        ),
        new THREE.LineSegments(
          this.createBoundaryGeometry(outerRings, topZ + 1),
          this.topContourMaterial,
        ),
      );
      this.root.add(regionGroup);
    }
  }

  applyTheme(theme: DigitalTwinMapTheme, tuning: MapVisualTuning = this.tuning) {
    this.theme = theme;
    this.tuning = tuning;
    const outline = mapVisualColor(tuning, "outline", theme.outline);
    const internal = themeColor(
      mapVisualColor(tuning, "internalLine", theme.internalLine),
      outline,
    );
    const regionTop = mapVisualColor(tuning, "regionTop", theme.topFill);
    const baseTerrainColor = new THREE.Color(regionTop);
    const variedTerrainColor = baseTerrainColor.clone()
      .convertLinearToSRGB()
      .lerp(new THREE.Color(1, 1, 1), tuning.regionTerrainVariationStrength)
      .convertSRGBToLinear();
    const bottom = themeColor(
      mapVisualColor(tuning, "sideBottom", theme.sideBottom),
      regionTop,
    );
    const solidVisibility = 1 - this.externalPresentation;
    const terrainExitProgress = THREE.MathUtils.smoothstep(
      this.externalPresentation,
      0.35,
      1,
    );
    this.baseMaterial.color.set(theme.bottomFill);
    this.baseMaterial.opacity = (
      tuning.regionBaseOpacity * this.presentationOpacity * solidVisibility
    );
    this.sideMaterial.uniforms.topColor!.value
      .set(mapVisualColor(tuning, "sideTop", theme.sideTop));
    this.sideMaterial.uniforms.bottomColor!.value
      .copy(bottom.color);
    this.sideMaterial.uniforms.topOpacity!.value = (
      tuning.regionSideTopOpacity * this.presentationOpacity * solidVisibility
    );
    this.sideMaterial.uniforms.bottomOpacity!.value = (
      bottom.opacity
      * tuning.regionSideBottomOpacityScale
      * this.presentationOpacity
      * solidVisibility
    );
    const terrainColors = [baseTerrainColor, variedTerrainColor] as const;
    const terrainOpacity = (
      tuning.regionTerrainOpacity
      * (1 - terrainExitProgress)
      * this.presentationOpacity
    );
    const terrainTransparent = terrainOpacity < 0.999;
    for (const [index, material] of this.terrainMaterials.entries()) {
      const color = terrainColors[index] ?? baseTerrainColor;
      material.color.copy(color);
      material.emissive.copy(color);
      material.opacity = terrainOpacity;
      if (material.transparent !== terrainTransparent) {
        material.transparent = terrainTransparent;
        material.needsUpdate = true;
      }
      // Keep the cap fully opaque during the first part of the height collapse.
      // Once it starts fading, stop writing depth so the real external layer
      // beneath it becomes the color target directly, without an intermediate tint.
      material.depthWrite = terrainExitProgress <= 0.001 && !terrainTransparent;
      material.emissiveIntensity = (
        tuning.regionTerrainEmissiveIntensity * (1 - terrainExitProgress)
      );
    }
    this.internalBoundaryMaterial.color.copy(internal.color);
    this.internalBoundaryMaterial.opacity = (
      internal.opacity
      * tuning.regionInternalBoundaryOpacityScale
      * solidVisibility
      * this.presentationOpacity
    );
    this.topContourMaterial.color.set(outline);
    this.topContourMaterial.opacity = (
      tuning.regionTopContourOpacity * solidVisibility * this.presentationOpacity
    );
    this.sideDepthMaterial.depthWrite = (
      this.presentationOpacity > 0.98 && this.externalPresentation < 0.999
    );
    for (const material of this.highlightMaterials.values()) {
      material.color.set(mapVisualColor(tuning, "hover", theme.primary));
    }
    for (const material of this.inactiveOverlayMaterials.values()) {
      material.color.set(mapVisualColor(tuning, "inactiveRegion", theme.pageBackground));
    }
  }

  hit(raycaster: THREE.Raycaster): RegionHit | undefined {
    const intersection = raycaster.intersectObjects(this.interactiveMeshes, false)[0];
    const feature = intersection?.object.userData.feature as GeoFeature | undefined;
    const group = intersection?.object.userData.regionGroup as THREE.Group | undefined;
    return feature && group ? { feature, group } : undefined;
  }

  featureHit(featureCode: string): RegionHit | undefined {
    const group = this.regionGroupsByCode.get(featureCode)?.find((item) => item.visible);
    const feature = group?.userData.feature as GeoFeature | undefined;
    return feature && group ? { feature, group } : undefined;
  }

  setHovered(group?: THREE.Group) {
    const hoveredFeature = group?.userData.feature as GeoFeature | undefined;
    this.hoveredFeatureCode = typeof hoveredFeature?.properties.code === "string"
      ? hoveredFeature.properties.code
      : undefined;
    this.applyInteractionTargets();
  }

  private applyInteractionTargets() {
    const hasFocus = this.forceSiblingPresentation
      || this.emphasizeAll
      || Boolean(this.focusFeatureCode);
    for (const regionGroup of this.regionGroups) {
      const feature = regionGroup.userData.feature as GeoFeature | undefined;
      const code = feature?.properties.code;
      const focused = !this.forceSiblingPresentation
        && regionGroup.visible
        && (this.emphasizeAll || (hasFocus && code === this.focusFeatureCode));
      const hovered = code === this.hoveredFeatureCode;
      if (this.targetExternalPresentation > 0.5) {
        const scale = externalPresentationThickness / baseThickness;
        regionGroup.userData.targetScaleZ = scale;
        regionGroup.userData.targetBaseZ = regionalContextSurfaceZ - topZ * scale;
        regionGroup.renderOrder = 1;
      } else if (!hasFocus) {
        const thickness = hovered
          ? this.tuning.districtHoverThickness
          : this.tuning.districtThickness;
        regionGroup.userData.targetScaleZ = thickness / baseThickness;
        regionGroup.userData.targetBaseZ = topZ
          * (this.tuning.districtThickness - thickness) / baseThickness;
        regionGroup.renderOrder = hovered ? 22 : 20;
      } else if (focused) {
        const thickness = hovered
          ? this.tuning.townshipFocusHoverThickness
          : this.tuning.townshipFocusThickness;
        regionGroup.userData.targetScaleZ = thickness / baseThickness;
        regionGroup.userData.targetBaseZ = this.tuning.townshipFocusLift
          + topZ * (this.tuning.townshipFocusThickness - thickness) / baseThickness;
        regionGroup.renderOrder = 40;
      } else {
        const thickness = hovered
          ? this.tuning.townshipSiblingHoverThickness
          : this.tuning.townshipSiblingThickness;
        regionGroup.userData.targetScaleZ = thickness / baseThickness;
        regionGroup.userData.targetBaseZ = this.tuning.townshipSiblingBaseZ
          + topZ * (this.tuning.townshipSiblingThickness - thickness) / baseThickness;
        regionGroup.renderOrder = hovered ? 30 : 10;
      }
      const highlight = this.highlightMaterials.get(regionGroup);
      if (highlight) {
        const targetOpacity = this.targetExternalPresentation > 0.5
          ? 0
          : hovered
          ? hasFocus ? this.tuning.townshipHoverOpacity : this.tuning.districtHoverOpacity
          : 0;
        highlight.userData.targetOpacity = targetOpacity;
        if (targetOpacity > 0) this.highlightMeshes.get(regionGroup)!.visible = true;
      }
      const overlay = this.inactiveOverlayMaterials.get(regionGroup);
      if (overlay) {
        const targetOpacity = this.targetExternalPresentation > 0.5
          ? 0
          : hasFocus && !focused
          ? this.tuning.townshipSiblingOverlayOpacity * (hovered ? 0.45 : 1)
          : 0;
        overlay.userData.targetOpacity = targetOpacity;
        if (targetOpacity > 0) this.inactiveOverlayMeshes.get(regionGroup)!.visible = true;
      }
    }
  }

  setFocus(
    featureCode: string | undefined,
    tuning: MapVisualTuning,
    emphasizeAll = false,
  ) {
    this.forceSiblingPresentation = false;
    this.focusFeatureCode = featureCode;
    this.emphasizeAll = emphasizeAll;
    this.hoveredFeatureCode = undefined;
    this.tuning = tuning;
    this.applyInteractionTargets();
  }

  setAllAsSiblings(tuning: MapVisualTuning) {
    this.forceSiblingPresentation = true;
    this.focusFeatureCode = undefined;
    this.emphasizeAll = false;
    this.hoveredFeatureCode = undefined;
    this.tuning = tuning;
    this.applyInteractionTargets();
  }

  setExternalPresentation(external: boolean, immediate = false) {
    this.targetExternalPresentation = external ? 1 : 0;
    if (immediate) this.externalPresentation = this.targetExternalPresentation;
    this.applyInteractionTargets();
    if (immediate) this.applyTheme(this.theme, this.tuning);
  }

  setExcludedFeature(featureCode?: string) {
    this.setExcludedFeatures(featureCode ? [featureCode] : []);
  }

  setExcludedFeatures(featureCodes: Iterable<string>) {
    const excludedCodes = new Set(featureCodes);
    for (const [code, groups] of this.regionGroupsByCode) {
      const visible = !excludedCodes.has(code);
      for (const group of groups) group.visible = visible;
    }
    // Hidden current-region geometry must keep tracking the sibling target.
    // Otherwise revealing it during a same-level switch briefly resurrects its
    // old focused height and leaves a vertical glow trail.
    this.applyInteractionTargets();
  }

  hasFeature(featureCode: string) {
    return this.regionGroupsByCode.has(featureCode);
  }

  setPresentationOpacity(opacity: number, immediate = false) {
    this.targetPresentationOpacity = THREE.MathUtils.clamp(opacity, 0, 1);
    if (!immediate) return;
    this.presentationOpacity = this.targetPresentationOpacity;
    this.root.visible = this.presentationOpacity > 0.001;
    this.applyTheme(this.theme, this.tuning);
  }

  isPresentationHidden() {
    return this.presentationOpacity <= 0.001 && this.targetPresentationOpacity <= 0.001;
  }

  isTransitionSettled() {
    if (Math.abs(this.presentationOpacity - this.targetPresentationOpacity) > 0.001) return false;
    if (Math.abs(this.externalPresentation - this.targetExternalPresentation) > 0.001) return false;
    for (const group of this.regionGroups) {
      if (
        Math.abs(group.scale.z - Number(group.userData.targetScaleZ ?? 1)) > 0.001
        || Math.abs(group.position.z - Number(group.userData.targetBaseZ ?? 0)) > 0.01
      ) return false;
      const highlight = this.highlightMaterials.get(group);
      const highlightTarget = Number(highlight?.userData.targetOpacity ?? 0)
        * this.presentationOpacity;
      if (highlight && Math.abs(highlight.opacity - highlightTarget) > 0.001) return false;
      const overlay = this.inactiveOverlayMaterials.get(group);
      const overlayTarget = Number(overlay?.userData.targetOpacity ?? 0)
        * this.presentationOpacity;
      if (overlay && Math.abs(overlay.opacity - overlayTarget) > 0.001) return false;
    }
    return true;
  }

  setTuning(tuning: MapVisualTuning) {
    this.applyTuning(this.theme, tuning);
  }

  applyTuning(theme: DigitalTwinMapTheme, tuning: MapVisualTuning) {
    this.tuning = tuning;
    this.applyTheme(theme, tuning);
    this.applyInteractionTargets();
  }

  getActiveSurfaceZ() {
    return this.focusFeatureCode || this.emphasizeAll
      ? this.tuning.townshipFocusLift
        + topZ * (this.tuning.townshipFocusThickness / baseThickness)
      : topZ * (this.tuning.districtThickness / baseThickness);
  }

  getFocusedSurfaceZ() {
    return this.tuning.townshipFocusLift
      + topZ * (this.tuning.townshipFocusThickness / baseThickness);
  }

  private groupSurfaceZ(group: THREE.Group) {
    return group.position.z + topZ * group.scale.z;
  }

  private maximumSurfaceZ(groups: Iterable<THREE.Group>) {
    let maximum = Number.NEGATIVE_INFINITY;
    for (const group of groups) maximum = Math.max(maximum, this.groupSurfaceZ(group));
    return Number.isFinite(maximum) ? maximum : this.getActiveSurfaceZ();
  }

  getFeatureSurfaceZ(featureCode: string | undefined) {
    const groups = featureCode ? this.regionGroupsByCode.get(featureCode) : undefined;
    if (!groups?.length) return this.getCurrentActiveSurfaceZ();
    return this.maximumSurfaceZ(groups);
  }

  getCurrentActiveSurfaceZ() {
    return this.maximumSurfaceZ(this.regionGroups);
  }

  getBoundarySurfaceZ() {
    return this.getCurrentActiveSurfaceZ();
  }

  private updateGroup(group: THREE.Group, delta?: number) {
    let dirty = false;
    const targetScaleZ = Number(group.userData.targetScaleZ ?? 1);
    const nextScaleZ = interactionValue(
      group.scale.z,
      targetScaleZ,
      interactionDamping.scale,
      delta,
      0.001,
    );
    if (Math.abs(nextScaleZ - group.scale.z) > 0.0001) dirty = true;
    group.scale.z = nextScaleZ;
    const targetBaseZ = Number(group.userData.targetBaseZ ?? 0);
    const targetZ = targetBaseZ;
    const next = interactionValue(
      group.position.z,
      targetZ,
      interactionDamping.elevation,
      delta,
      0.01,
    );
    if (Math.abs(next - group.position.z) > 0.001) dirty = true;
    group.position.z = next;
    const material = this.highlightMaterials.get(group);
    if (material) {
      const targetOpacity = Number(material.userData.targetOpacity ?? 0);
      const nextOpacity = interactionValue(
        material.opacity,
        targetOpacity * this.presentationOpacity,
        interactionDamping.highlight,
        delta,
        0.001,
      );
      if (Math.abs(nextOpacity - material.opacity) > 0.0001) dirty = true;
      material.opacity = nextOpacity;
      this.highlightMeshes.get(group)!.visible = nextOpacity > 0.001 || targetOpacity > 0;
    }
    const overlay = this.inactiveOverlayMaterials.get(group);
    if (overlay) {
      const overlayTarget = Number(overlay.userData.targetOpacity ?? 0);
      const overlayOpacity = interactionValue(
        overlay.opacity,
        overlayTarget * this.presentationOpacity,
        interactionDamping.overlay,
        delta,
        0.001,
      );
      if (Math.abs(overlayOpacity - overlay.opacity) > 0.0001) dirty = true;
      overlay.opacity = overlayOpacity;
      this.inactiveOverlayMeshes.get(group)!.visible = (
        overlayOpacity > 0.001 || overlayTarget > 0
      );
    }
    return dirty;
  }

  private updatePresentation(delta?: number) {
    const nextOpacity = interactionValue(
      this.presentationOpacity,
      this.targetPresentationOpacity,
      interactionDamping.presentation,
      delta,
      0.001,
    );
    const nextExternalPresentation = interactionValue(
      this.externalPresentation,
      this.targetExternalPresentation,
      interactionDamping.presentation,
      delta,
      0.001,
    );
    if (
      Math.abs(nextOpacity - this.presentationOpacity) <= 0.0001
      && Math.abs(nextExternalPresentation - this.externalPresentation) <= 0.0001
    ) return false;
    this.presentationOpacity = nextOpacity;
    this.externalPresentation = nextExternalPresentation;
    this.root.visible = this.presentationOpacity > 0.001;
    this.applyTheme(this.theme, this.tuning);
    return true;
  }

  animate(delta = referenceFrameSeconds) {
    let dirty = this.updatePresentation(delta);
    for (const group of this.regionGroups) dirty = this.updateGroup(group, delta) || dirty;
    return dirty;
  }

  settle() {
    let dirty = this.updatePresentation();
    for (const group of this.regionGroups) dirty = this.updateGroup(group) || dirty;
    return dirty;
  }

  dispose() {
    this.root.removeFromParent();
    this.owner.dispose();
    this.interactiveMeshes.length = 0;
    this.regionGroups.clear();
    this.regionGroupsByCode.clear();
    this.highlightMaterials.clear();
    this.highlightMeshes.clear();
    this.inactiveOverlayMaterials.clear();
    this.inactiveOverlayMeshes.clear();
  }
}

export { topZ as regionTopZ };
