import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { GeoFeature, GeoFeatureCollection, Position } from "../geo";
import type { DigitalTwinMapTheme } from "../map-themes";
import type { TuningAwareMapSceneLayer } from "./map-scene-layer";
import type { MapProjection } from "./map-projection";
import { featureVisualCenter, polygonsOf } from "./map-projection";
import type { MapVisualTuning } from "./map-visual-tuning";
import { mapVisualColor } from "./map-visual-tuning";
import { ResourceOwner } from "./resource-owner";

export const regionalContextSurfaceZ = 12;
const presentationRate = 11;

export class RegionalContextLayer implements TuningAwareMapSceneLayer {
  readonly root = new THREE.Group();
  private readonly owner = new ResourceOwner();
  private readonly labelElements = new Set<HTMLElement>();
  private readonly labelObjects = new Map<GeoFeature, CSS2DObject>();
  private readonly interactiveMeshes: THREE.Mesh[] = [];
  private readonly hoverMaterialsByCode = new Map<string, THREE.MeshBasicMaterial[]>();
  private readonly fillMaterial: THREE.MeshBasicMaterial;
  private readonly lineMaterial: THREE.LineBasicMaterial;
  private presentationOpacity = 1;
  private targetPresentationOpacity = 1;
  private hoveredCode?: string;
  private theme: DigitalTwinMapTheme;
  private tuning: MapVisualTuning;

  constructor(
    geoData: GeoFeatureCollection,
    private readonly projection: MapProjection,
    theme: DigitalTwinMapTheme,
    tuning: MapVisualTuning,
    excludedFeatureCode?: string,
    labelsOnly = false,
    private readonly labelKind: "peer" | "external" = labelsOnly ? "peer" : "external",
  ) {
    this.theme = theme;
    this.tuning = tuning;
    this.fillMaterial = this.owner.material(new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }));
    this.lineMaterial = this.owner.material(new THREE.LineBasicMaterial({
      transparent: true,
      depthTest: true,
      depthWrite: false,
    }));
    for (const feature of geoData.features) {
      if (feature.properties.code === excludedFeatureCode) continue;
      if (!labelsOnly) {
        for (const polygon of polygonsOf(feature)) {
          const shape = projection.makeShape(polygon);
          if (!shape) continue;
          const geometry = this.owner.geometry(new THREE.ShapeGeometry(shape));
          const fill = new THREE.Mesh(
            geometry,
            this.fillMaterial,
          );
          fill.position.z = regionalContextSurfaceZ;
          fill.renderOrder = 1;
          fill.userData.feature = feature;
          this.interactiveMeshes.push(fill);
          const hoverMaterial = this.owner.material(new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            depthTest: true,
            depthWrite: false,
            side: THREE.DoubleSide,
          }));
          const hover = new THREE.Mesh(
            geometry,
            hoverMaterial,
          );
          hover.position.z = regionalContextSurfaceZ + 1;
          hover.renderOrder = 3;
          const featureCode = feature.properties.code;
          if (typeof featureCode === "string") {
            const materials = this.hoverMaterialsByCode.get(featureCode) ?? [];
            materials.push(hoverMaterial);
            this.hoverMaterialsByCode.set(featureCode, materials);
          }
          this.root.add(fill, hover);
          for (const ring of polygon) this.root.add(this.createBoundary(ring));
        }
      }
      const center = featureVisualCenter(feature);
      if (center) this.createLabel(feature, feature.properties.name ?? "相邻区域", center);
    }
    this.applyTheme(theme, tuning);
  }

  hit(raycaster: THREE.Raycaster): { feature: GeoFeature } | undefined {
    const intersection = raycaster.intersectObjects(this.interactiveMeshes, false)[0];
    const feature = intersection?.object.userData.feature as GeoFeature | undefined;
    return feature ? { feature } : undefined;
  }

  hitLabel(
    pointer: THREE.Vector2,
    camera: THREE.Camera,
    viewport: { width: number; height: number },
    threshold = 34,
  ): { feature: GeoFeature } | undefined {
    let closest: { feature: GeoFeature; distance: number } | undefined;
    const projected = new THREE.Vector3();
    for (const [feature, object] of this.labelObjects) {
      object.getWorldPosition(projected);
      projected.project(camera);
      const distance = Math.hypot(
        (projected.x - pointer.x) * viewport.width / 2,
        (projected.y - pointer.y) * viewport.height / 2,
      );
      if (distance <= threshold && (!closest || distance < closest.distance)) {
        closest = { feature, distance };
      }
    }
    return closest ? { feature: closest.feature } : undefined;
  }

  setHovered(feature?: GeoFeature) {
    this.hoveredCode = typeof feature?.properties.code === "string"
      ? feature.properties.code
      : undefined;
    for (const [labelFeature, object] of this.labelObjects) {
      object.element.classList.toggle(
        "is-visible",
        typeof this.hoveredCode === "string"
          && labelFeature.properties.code === this.hoveredCode,
      );
    }
    for (const [code, materials] of this.hoverMaterialsByCode) {
      for (const material of materials) {
        material.opacity = code === this.hoveredCode ? 0.22 * this.presentationOpacity : 0;
      }
    }
  }

  private createBoundary(ring: Position[]) {
    const points = ring.map((coordinate) => (
      this.projection.projectPoint(coordinate, regionalContextSurfaceZ + 0.5)
    ));
    const first = points[0];
    const last = points[points.length - 1];
    if (first && last && !first.equals(last)) points.push(first.clone());
    const line = new THREE.Line(
      this.owner.geometry(new THREE.BufferGeometry().setFromPoints(points)),
      this.lineMaterial,
    );
    line.renderOrder = 2;
    return line;
  }

  private createLabel(feature: GeoFeature, name: string, coordinate: Position) {
    const element = document.createElement("span");
    element.className = `map-context-label is-${this.labelKind}`;
    element.textContent = name;
    this.labelElements.add(element);
    const object = new CSS2DObject(element);
    object.position.copy(this.projection.projectPoint(coordinate, regionalContextSurfaceZ + 2));
    this.labelObjects.set(feature, object);
    this.root.add(object);
  }

  applyTheme(theme: DigitalTwinMapTheme, tuning: MapVisualTuning) {
    this.theme = theme;
    this.tuning = tuning;
    const fillOpacity = theme.contextFillOpacity * this.presentationOpacity;
    const transparent = fillOpacity < 0.999;
    if (this.fillMaterial.transparent !== transparent) {
      this.fillMaterial.transparent = transparent;
      this.fillMaterial.needsUpdate = true;
    }
    this.fillMaterial.depthWrite = !transparent;
    this.fillMaterial.color.set(theme.contextFill);
    this.fillMaterial.opacity = fillOpacity;
    this.lineMaterial.color.set(mapVisualColor(tuning, "contextLine", theme.labelText));
    this.lineMaterial.opacity = tuning.contextLineOpacity * this.presentationOpacity;
    for (const element of this.labelElements) {
      element.style.setProperty("--context-layer-opacity", String(this.presentationOpacity));
    }
    for (const [code, materials] of this.hoverMaterialsByCode) {
      for (const material of materials) {
        material.color.set(mapVisualColor(tuning, "hover", theme.primary));
        material.opacity = this.hoveredCode === code ? 0.22 * this.presentationOpacity : 0;
      }
    }
  }

  applyTuning(theme: DigitalTwinMapTheme, tuning: MapVisualTuning) {
    this.applyTheme(theme, tuning);
  }

  setPresentationOpacity(opacity: number, immediate = false) {
    this.targetPresentationOpacity = THREE.MathUtils.clamp(opacity, 0, 1);
    if (!immediate) return;
    this.presentationOpacity = this.targetPresentationOpacity;
    this.root.visible = this.presentationOpacity > 0.001;
    this.applyTheme(this.theme, this.tuning);
  }

  animate(delta: number) {
    const nextOpacity = THREE.MathUtils.lerp(
      this.presentationOpacity,
      this.targetPresentationOpacity,
      1 - Math.exp(-presentationRate * THREE.MathUtils.clamp(delta, 0, 0.1)),
    );
    const settled = Math.abs(nextOpacity - this.targetPresentationOpacity) < 0.001;
    const resolvedOpacity = settled ? this.targetPresentationOpacity : nextOpacity;
    if (Math.abs(resolvedOpacity - this.presentationOpacity) <= 0.0001) return false;
    this.presentationOpacity = resolvedOpacity;
    this.root.visible = this.presentationOpacity > 0.001;
    this.applyTheme(this.theme, this.tuning);
    return true;
  }

  settle() {
    this.setPresentationOpacity(this.targetPresentationOpacity, true);
  }

  isPresentationHidden() {
    return this.presentationOpacity <= 0.001 && this.targetPresentationOpacity <= 0.001;
  }

  dispose() {
    this.root.removeFromParent();
    for (const element of this.labelElements) element.remove();
    this.labelElements.clear();
    this.labelObjects.clear();
    this.owner.dispose();
  }
}
