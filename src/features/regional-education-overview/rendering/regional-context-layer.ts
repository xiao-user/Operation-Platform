import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { GeoFeatureCollection, Position } from "../geo";
import type { DigitalTwinMapTheme } from "../map-themes";
import type { MapProjection } from "./map-projection";
import { featureCenter, polygonsOf } from "./map-projection";
import type { MapVisualTuning } from "./map-visual-tuning";
import { mapVisualColor } from "./map-visual-tuning";
import { ResourceOwner } from "./resource-owner";

const contextZ = 12;

export class RegionalContextLayer {
  readonly root = new THREE.Group();
  private readonly owner = new ResourceOwner();
  private readonly labelElements = new Set<HTMLElement>();
  private readonly fillMaterial: THREE.MeshBasicMaterial;
  private readonly lineMaterial: THREE.LineBasicMaterial;

  constructor(
    geoData: GeoFeatureCollection,
    private readonly projection: MapProjection,
    theme: DigitalTwinMapTheme,
    tuning: MapVisualTuning,
  ) {
    this.fillMaterial = this.owner.material(new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }));
    this.lineMaterial = this.owner.material(new THREE.LineBasicMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }));
    for (const feature of geoData.features) {
      for (const polygon of polygonsOf(feature)) {
        const shape = projection.makeShape(polygon);
        if (!shape) continue;
        const fill = new THREE.Mesh(
          this.owner.geometry(new THREE.ShapeGeometry(shape)),
          this.fillMaterial,
        );
        fill.position.z = contextZ;
        fill.renderOrder = 1;
        this.root.add(fill);
        for (const ring of polygon) this.root.add(this.createBoundary(ring));
      }
      const center = featureCenter(feature);
      if (center) this.createLabel(feature.properties.name ?? "相邻区域", center);
    }
    this.applyTheme(theme, tuning);
  }

  private createBoundary(ring: Position[]) {
    const points = ring.map((coordinate) => this.projection.projectPoint(coordinate, contextZ + 0.5));
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

  private createLabel(name: string, coordinate: Position) {
    const element = document.createElement("span");
    element.className = "map-context-label";
    element.textContent = name;
    this.labelElements.add(element);
    const object = new CSS2DObject(element);
    object.position.copy(this.projection.projectPoint(coordinate, contextZ + 2));
    this.root.add(object);
  }

  applyTheme(theme: DigitalTwinMapTheme, tuning: MapVisualTuning) {
    this.fillMaterial.color.set(mapVisualColor(tuning, "contextFill", theme.labelText));
    this.fillMaterial.opacity = tuning.contextFillOpacity;
    this.lineMaterial.color.set(mapVisualColor(tuning, "contextLine", theme.labelText));
    this.lineMaterial.opacity = tuning.contextLineOpacity;
  }

  dispose() {
    this.root.removeFromParent();
    for (const element of this.labelElements) element.remove();
    this.labelElements.clear();
    this.owner.dispose();
  }
}
