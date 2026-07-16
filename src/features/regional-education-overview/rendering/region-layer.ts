import * as THREE from "three";
import type { GeoFeature, Position } from "../geo";
import type { MapState } from "../map-data-adapter";
import type { DigitalTwinMapTheme } from "../map-themes";
import type { MapProjection } from "./map-projection";
import { polygonsOf } from "./map-projection";
import type { MapVisualTuning } from "./map-visual-tuning";
import { mapVisualColor } from "./map-visual-tuning";
import { ResourceOwner } from "./resource-owner";
import type { TerrainTextureSet } from "./terrain-texture-set";
import { themeColor } from "./theme-color";

const topZ = 44;
const bottomZ = 22;
const baseThickness = topZ - bottomZ;
const referenceFrameSeconds = 1 / 60;

function dampingRate(frameFactor: number) {
  return -Math.log(1 - frameFactor) / referenceFrameSeconds;
}

const interactionDamping = {
  scale: dampingRate(0.14),
  // Keep thickness scale and base offset on the same curve so a hover can grow
  // downward while the region's top surface stays mathematically stationary.
  elevation: dampingRate(0.14),
  highlight: dampingRate(0.2),
  overlay: dampingRate(0.16),
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

export class RegionLayer {
  readonly root = new THREE.Group();
  private readonly owner = new ResourceOwner();
  private readonly interactiveMeshes: THREE.Mesh[] = [];
  private readonly regionGroups = new Set<THREE.Group>();
  private readonly regionGroupsByCode = new Map<string, THREE.Group[]>();
  private readonly highlightMaterials = new Map<THREE.Group, THREE.MeshBasicMaterial>();
  private readonly inactiveOverlayMaterials = new Map<THREE.Group, THREE.MeshBasicMaterial>();
  private readonly baseMaterial: THREE.MeshBasicMaterial;
  private readonly sideMaterial: THREE.ShaderMaterial;
  private readonly terrainMaterial: THREE.MeshStandardMaterial;
  private readonly internalBoundaryMaterial: THREE.LineBasicMaterial;
  private readonly topContourMaterial: THREE.LineBasicMaterial;
  private readonly bottomContourMaterial: THREE.LineBasicMaterial;
  private focusFeatureCode?: string;
  private hoveredFeatureCode?: string;
  private tuning: MapVisualTuning;
  private theme: DigitalTwinMapTheme;

  constructor(
    mapState: MapState,
    private readonly projection: MapProjection,
    theme: DigitalTwinMapTheme,
    textures: TerrainTextureSet,
    tuning: MapVisualTuning,
  ) {
    this.theme = theme;
    this.tuning = tuning;
    this.baseMaterial = this.owner.material(new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false,
    }));
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
    this.terrainMaterial = this.owner.material(new THREE.MeshStandardMaterial({
      map: textures.diffuse,
      normalMap: textures.normal,
      normalScale: new THREE.Vector2(1, 1),
      roughnessMap: textures.roughness,
      roughness: 0.94,
      metalness: 0.03,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      alphaTest: 0.02,
      emissiveIntensity: 0.12,
    }));
    this.internalBoundaryMaterial = this.owner.material(new THREE.LineBasicMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }));
    this.topContourMaterial = this.owner.material(new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    }));
    this.bottomContourMaterial = this.owner.material(new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    }));
    this.build(mapState);
    this.applyTheme(theme);
  }

  private applyTerrainUv(geometry: THREE.BufferGeometry) {
    const position = geometry.getAttribute("position");
    const uv = new Float32Array(position.count * 2);
    for (let index = 0; index < position.count; index += 1) {
      uv[index * 2] = (position.getX(index) + 430) / 860;
      uv[index * 2 + 1] = (position.getY(index) + 260) / 520;
    }
    geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return geometry;
  }

  private createBoundary(ring: Position[], z: number, material: THREE.Material) {
    const points = ring.map((coordinate) => this.projection.projectPoint(coordinate, z));
    const first = points[0];
    const last = points[points.length - 1];
    if (first && last && !first.equals(last)) points.push(first.clone());
    return new THREE.Line(
      this.owner.geometry(new THREE.BufferGeometry().setFromPoints(points)),
      material,
    );
  }

  private createSideWalls(ring: Position[]) {
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
    const geometry = this.owner.geometry(new THREE.BufferGeometry());
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, this.sideMaterial);
  }

  private build(mapState: MapState) {
    for (const feature of mapState.geoData.features) {
      for (const polygon of polygonsOf(feature)) {
        const outerRing = polygon[0];
        const shape = this.projection.makeShape(polygon);
        if (!outerRing || !shape) continue;
        const regionGroup = new THREE.Group();
        regionGroup.userData.feature = feature;
        regionGroup.userData.targetBaseZ = 0;
        regionGroup.userData.targetScaleZ = 1;
        this.regionGroups.add(regionGroup);
        const featureCode = feature.properties.code;
        if (typeof featureCode === "string") {
          const groups = this.regionGroupsByCode.get(featureCode) ?? [];
          groups.push(regionGroup);
          this.regionGroupsByCode.set(featureCode, groups);
        }

        const base = new THREE.Mesh(
          this.owner.geometry(new THREE.ShapeGeometry(shape)),
          this.baseMaterial,
        );
        base.position.z = bottomZ;
        regionGroup.add(base, this.createSideWalls(outerRing));

        const terrain = new THREE.Mesh(
          this.applyTerrainUv(this.owner.geometry(new THREE.ShapeGeometry(shape))),
          this.terrainMaterial,
        );
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
          depthTest: false,
          depthWrite: false,
        }));
        highlightMaterial.userData.targetOpacity = 0;
        const highlight = new THREE.Mesh(
          this.owner.geometry(new THREE.ShapeGeometry(shape)),
          highlightMaterial,
        );
        highlight.position.z = topZ + 2;
        regionGroup.add(highlight);
        this.highlightMaterials.set(regionGroup, highlightMaterial);

        const inactiveOverlayMaterial = this.owner.material(new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          depthTest: false,
          depthWrite: false,
        }));
        inactiveOverlayMaterial.userData.targetOpacity = 0;
        const inactiveOverlay = new THREE.Mesh(
          this.owner.geometry(new THREE.ShapeGeometry(shape)),
          inactiveOverlayMaterial,
        );
        inactiveOverlay.position.z = topZ + 2.5;
        regionGroup.add(inactiveOverlay);
        this.inactiveOverlayMaterials.set(regionGroup, inactiveOverlayMaterial);

        for (const ring of polygon) {
          regionGroup.add(this.createBoundary(ring, topZ + 0.6, this.internalBoundaryMaterial));
        }
        regionGroup.add(
          this.createBoundary(outerRing, topZ + 1, this.topContourMaterial),
          this.createBoundary(outerRing, bottomZ, this.bottomContourMaterial),
        );
        this.root.add(regionGroup);
      }
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
    const bottom = themeColor(
      mapVisualColor(tuning, "sideBottom", theme.sideBottom),
      regionTop,
    );
    this.baseMaterial.color.set(regionTop);
    this.baseMaterial.opacity = tuning.regionBaseOpacity;
    this.sideMaterial.uniforms.topColor!.value.set(
      mapVisualColor(tuning, "sideTop", theme.sideTop),
    );
    this.sideMaterial.uniforms.bottomColor!.value.copy(bottom.color);
    this.sideMaterial.uniforms.topOpacity!.value = tuning.regionSideTopOpacity;
    this.sideMaterial.uniforms.bottomOpacity!.value = (
      bottom.opacity * tuning.regionSideBottomOpacityScale
    );
    this.terrainMaterial.color.set(regionTop);
    this.terrainMaterial.emissive.set(regionTop);
    this.terrainMaterial.opacity = tuning.regionTerrainOpacity;
    this.terrainMaterial.roughness = tuning.regionTerrainRoughness;
    this.terrainMaterial.metalness = tuning.regionTerrainMetalness;
    this.terrainMaterial.normalScale.setScalar(tuning.regionTerrainNormalScale);
    this.terrainMaterial.emissiveIntensity = tuning.regionTerrainEmissiveIntensity;
    this.internalBoundaryMaterial.color.copy(internal.color);
    this.internalBoundaryMaterial.opacity = (
      internal.opacity * tuning.regionInternalBoundaryOpacityScale
    );
    this.topContourMaterial.color.set(outline);
    this.topContourMaterial.opacity = tuning.regionTopContourOpacity;
    this.bottomContourMaterial.color.set(outline);
    this.bottomContourMaterial.opacity = tuning.regionBottomContourOpacity;
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

  setHovered(group?: THREE.Group) {
    const hoveredFeature = group?.userData.feature as GeoFeature | undefined;
    this.hoveredFeatureCode = typeof hoveredFeature?.properties.code === "string"
      ? hoveredFeature.properties.code
      : undefined;
    this.applyInteractionTargets();
  }

  private applyInteractionTargets() {
    const hasFocus = Boolean(this.focusFeatureCode);
    for (const regionGroup of this.regionGroups) {
      const feature = regionGroup.userData.feature as GeoFeature | undefined;
      const code = feature?.properties.code;
      const focused = hasFocus && code === this.focusFeatureCode;
      const hovered = code === this.hoveredFeatureCode;
      if (!hasFocus) {
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
        highlight.userData.targetOpacity = hovered
          ? hasFocus ? this.tuning.townshipHoverOpacity : this.tuning.districtHoverOpacity
          : 0;
      }
      const overlay = this.inactiveOverlayMaterials.get(regionGroup);
      if (overlay) {
        overlay.userData.targetOpacity = hasFocus && !focused
          ? this.tuning.townshipSiblingOverlayOpacity * (hovered ? 0.45 : 1)
          : 0;
      }
    }
  }

  setFocus(featureCode: string | undefined, tuning: MapVisualTuning) {
    this.focusFeatureCode = featureCode;
    this.hoveredFeatureCode = undefined;
    this.tuning = tuning;
    this.applyInteractionTargets();
  }

  setTuning(tuning: MapVisualTuning) {
    this.tuning = tuning;
    this.applyTheme(this.theme, tuning);
    this.applyInteractionTargets();
  }

  getActiveSurfaceZ() {
    return this.focusFeatureCode
      ? this.tuning.townshipFocusLift
        + topZ * (this.tuning.townshipFocusThickness / baseThickness)
      : topZ * (this.tuning.districtThickness / baseThickness);
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
        targetOpacity,
        interactionDamping.highlight,
        delta,
        0.001,
      );
      if (Math.abs(nextOpacity - material.opacity) > 0.0001) dirty = true;
      material.opacity = nextOpacity;
    }
    const overlay = this.inactiveOverlayMaterials.get(group);
    if (overlay) {
      const overlayTarget = Number(overlay.userData.targetOpacity ?? 0);
      const overlayOpacity = interactionValue(
        overlay.opacity,
        overlayTarget,
        interactionDamping.overlay,
        delta,
        0.001,
      );
      if (Math.abs(overlayOpacity - overlay.opacity) > 0.0001) dirty = true;
      overlay.opacity = overlayOpacity;
    }
    return dirty;
  }

  animate(delta = referenceFrameSeconds) {
    let dirty = false;
    for (const group of this.regionGroups) dirty = this.updateGroup(group, delta) || dirty;
    return dirty;
  }

  settle() {
    let dirty = false;
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
    this.inactiveOverlayMaterials.clear();
  }
}

export { topZ as regionTopZ };
