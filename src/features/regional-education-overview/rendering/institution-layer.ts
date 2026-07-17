import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { DigitalTwinMapTheme } from "../map-themes";
import type { EducationLocation } from "../types";
import type { TuningAwareMapSceneLayer } from "./map-scene-layer";
import type { MapProjection } from "./map-projection";
import { defaultMapVisualTuning, mapVisualColor } from "./map-visual-tuning";
import type { MapVisualTuning } from "./map-visual-tuning";
import { ResourceOwner } from "./resource-owner";
import { regionTopZ } from "./region-layer";
import { themeColor } from "./theme-color";

const schoolHitRadius = 12;
const selectedSchoolHitRadius = 16;
const bureauHitRadius = 30;

interface ViewportSize {
  width: number;
  height: number;
}

export function institutionRippleFrame(
  elapsed: number,
  delay: number,
  tuning: Pick<
    MapVisualTuning,
    | "institutionRippleSpeed"
    | "institutionRippleStartScale"
    | "institutionRippleScaleRange"
  >,
) {
  const progress = elapsed * tuning.institutionRippleSpeed - delay;
  if (progress <= 0) return { scale: 0, opacity: 0 };
  const phase = progress % 1;
  const fadeIn = THREE.MathUtils.smoothstep(phase, 0, 0.12);
  const fadeOut = 1 - THREE.MathUtils.smoothstep(phase, 0.62, 1);
  return {
    scale: tuning.institutionRippleStartScale + phase * tuning.institutionRippleScaleRange,
    opacity: fadeIn * fadeOut,
  };
}

export class InstitutionLayer implements TuningAwareMapSceneLayer {
  readonly root = new THREE.Group();
  private readonly owner = new ResourceOwner();
  private readonly locationByPointIndex: EducationLocation[] = [];
  private readonly locationById = new Map<string, EducationLocation>();
  private readonly locationPositions = new Map<string, THREE.Vector3>();
  private readonly projectedPosition = new THREE.Vector3();
  private readonly labelElements = new Set<HTMLElement>();
  private readonly pointsGeometry: THREE.BufferGeometry;
  private readonly pointsMaterial: THREE.ShaderMaterial;
  private readonly selectedValues: Float32Array;
  private readonly colorValues: Float32Array;
  private readonly rippleMaterials: THREE.MeshBasicMaterial[] = [];
  private readonly rippleMeshes: THREE.Mesh[] = [];
  private selectedLocationId?: string;
  private hoveredLocationId?: string;
  private animationStartTime?: number;

  constructor(
    private readonly locations: readonly EducationLocation[],
    private readonly projection: MapProjection,
    theme: DigitalTwinMapTheme,
    selectedLocationId: string | undefined,
    pixelRatio: number,
    private tuning: Readonly<MapVisualTuning> = defaultMapVisualTuning,
  ) {
    this.selectedLocationId = selectedLocationId;
    const positions = new Float32Array(locations.length * 3);
    this.colorValues = new Float32Array(locations.length * 3);
    this.selectedValues = new Float32Array(locations.length);
    const bureauValues = new Float32Array(locations.length);
    this.pointsGeometry = this.owner.geometry(new THREE.BufferGeometry());

    locations.forEach((location) => {
      this.locationById.set(location.id, location);
      this.locationPositions.set(
        location.id,
        projection.projectPoint(
          location.coordinate,
          location.type === "bureau" ? regionTopZ + 22 : regionTopZ + 13,
        ),
      );
    });
    locations.forEach((location, index) => {
      const point = this.locationPositions.get(location.id)!;
      positions.set([point.x, point.y, point.z], index * 3);
      this.selectedValues[index] = location.id === selectedLocationId ? 1 : 0;
      bureauValues[index] = location.type === "bureau" ? 1 : 0;
      this.locationByPointIndex.push(location);
    });
    this.applyPointColors(theme);
    this.pointsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.pointsGeometry.setAttribute("pointColor", new THREE.BufferAttribute(this.colorValues, 3));
    this.pointsGeometry.setAttribute("selected", new THREE.BufferAttribute(this.selectedValues, 1));
    this.pointsGeometry.setAttribute("bureau", new THREE.BufferAttribute(bureauValues, 1));
    this.pointsGeometry.computeBoundingSphere();

    this.pointsMaterial = this.owner.material(new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uPixelRatio: { value: pixelRatio },
        uPointSize: { value: tuning.institutionPointSize },
        uEmphasisPointSize: { value: tuning.institutionEmphasisPointSize },
        uHaloInnerRadius: { value: tuning.institutionHaloInnerRadius },
        uCoreRadius: { value: tuning.institutionCoreRadius },
        uHaloOpacity: { value: tuning.institutionHaloOpacity },
        uEmphasisHaloOpacity: { value: tuning.institutionEmphasisHaloOpacity },
      },
      vertexShader: `
        attribute vec3 pointColor;
        attribute float selected;
        attribute float bureau;
        uniform float uPixelRatio;
        uniform float uPointSize;
        uniform float uEmphasisPointSize;
        varying vec3 vColor;
        varying float vSelected;
        varying float vBureau;
        void main() {
          vColor = pointColor;
          vSelected = selected;
          vBureau = bureau;
          gl_PointSize = mix(uPointSize, uEmphasisPointSize, max(selected, bureau)) * uPixelRatio;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vSelected;
        varying float vBureau;
        uniform float uHaloInnerRadius;
        uniform float uCoreRadius;
        uniform float uHaloOpacity;
        uniform float uEmphasisHaloOpacity;
        void main() {
          float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
          if (distanceToCenter > 0.5) discard;
          float halo = 1.0 - smoothstep(uHaloInnerRadius, 0.5, distanceToCenter);
          float core = 1.0 - smoothstep(0.0, uCoreRadius, distanceToCenter);
          float emphasis = max(vSelected, vBureau);
          float opacity = max(
            halo * mix(uHaloOpacity, uEmphasisHaloOpacity, emphasis),
            core
          );
          gl_FragColor = vec4(vColor, opacity);
        }
      `,
    }));
    const points = new THREE.Points(this.pointsGeometry, this.pointsMaterial);
    points.renderOrder = 18;
    this.root.add(points);
    this.createBureauRipples(theme);
    this.rebuildLabels();
  }

  private applyPointColors(theme: DigitalTwinMapTheme) {
    const defaultColor = new THREE.Color(
      mapVisualColor(this.tuning, "institutionDefault", theme.labelText),
    );
    const selectedColor = new THREE.Color(
      mapVisualColor(this.tuning, "institutionSelected", theme.primary),
    );
    const bureauColor = themeColor(
      mapVisualColor(this.tuning, "institutionBureau", theme.scatter),
      theme.primary,
    ).color;
    this.locationByPointIndex.forEach((location, index) => {
      const color = location.type === "bureau"
        ? bureauColor
        : location.id === this.selectedLocationId ? selectedColor : defaultColor;
      color.toArray(this.colorValues, index * 3);
    });
  }

  private createBureauRipples(theme: DigitalTwinMapTheme) {
    const bureau = this.locationByPointIndex.find((location) => location.type === "bureau");
    if (!bureau) return;
    const point = this.projection.projectPoint(bureau.coordinate, regionTopZ + 1);
    const ripple = themeColor(
      mapVisualColor(this.tuning, "institutionRipple", theme.ripple),
      theme.primary,
    );
    const rippleOpacity = ripple.opacity * this.tuning.institutionRippleOpacityScale;
    for (let index = 0; index < 2; index += 1) {
      const material = this.owner.material(new THREE.MeshBasicMaterial({
        color: ripple.color,
        transparent: true,
        opacity: rippleOpacity,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      }));
      material.userData.baseOpacity = rippleOpacity;
      const mesh = new THREE.Mesh(
        this.owner.geometry(new THREE.RingGeometry(12, 13, 48)),
        material,
      );
      mesh.position.copy(point);
      mesh.scale.setScalar(0);
      mesh.userData.delay = index * 0.5;
      material.opacity = 0;
      mesh.renderOrder = 17;
      this.rippleMaterials.push(material);
      this.rippleMeshes.push(mesh);
      this.root.add(mesh);
    }
  }

  private addLabelElement(element: HTMLElement, position: THREE.Vector3) {
    this.labelElements.add(element);
    const object = new CSS2DObject(element);
    object.position.copy(position);
    this.root.add(object);
  }

  private createLocationName(location: EducationLocation, selected: boolean) {
    const element = document.createElement("strong");
    element.className = `map-location-name${location.type === "bureau" ? " is-bureau" : ""}${selected ? " is-selected" : " is-hovered"}`;
    element.textContent = location.name;
    this.addLabelElement(
      element,
      this.projection.projectPoint(
        location.coordinate,
        location.type === "bureau" ? regionTopZ + 27 : regionTopZ + 20,
      ),
    );
  }

  private rebuildLabels() {
    for (const element of this.labelElements) element.remove();
    this.labelElements.clear();
    for (let index = this.root.children.length - 1; index >= 0; index -= 1) {
      const child = this.root.children[index];
      if (child instanceof CSS2DObject) this.root.remove(child);
    }
    const bureau = this.locationByPointIndex.find((location) => location.type === "bureau");
    if (bureau) this.createLocationName(bureau, bureau.id === this.selectedLocationId);
    const labelIds = new Set([this.selectedLocationId, this.hoveredLocationId]);
    for (const locationId of labelIds) {
      const location = locationId ? this.locationById.get(locationId) : undefined;
      if (location?.type === "bureau") continue;
      if (location) this.createLocationName(location, location.id === this.selectedLocationId);
    }
  }

  setSelected(locationId: string | undefined, theme: DigitalTwinMapTheme) {
    this.selectedLocationId = locationId;
    this.locationByPointIndex.forEach((location, index) => {
      this.selectedValues[index] = location.id === locationId ? 1 : 0;
    });
    this.pointsGeometry.getAttribute("selected").needsUpdate = true;
    this.applyPointColors(theme);
    this.pointsGeometry.getAttribute("pointColor").needsUpdate = true;
    this.rebuildLabels();
  }

  setHovered(locationId?: string) {
    if (this.hoveredLocationId === locationId) return;
    this.hoveredLocationId = locationId;
    this.rebuildLabels();
  }

  setPixelRatio(pixelRatio: number) {
    this.pointsMaterial.uniforms.uPixelRatio!.value = pixelRatio;
  }

  applyTheme(
    theme: DigitalTwinMapTheme,
    tuning: Readonly<MapVisualTuning> = this.tuning,
  ) {
    this.tuning = tuning;
    this.pointsMaterial.uniforms.uPointSize!.value = tuning.institutionPointSize;
    this.pointsMaterial.uniforms.uEmphasisPointSize!.value = tuning.institutionEmphasisPointSize;
    this.pointsMaterial.uniforms.uHaloInnerRadius!.value = tuning.institutionHaloInnerRadius;
    this.pointsMaterial.uniforms.uCoreRadius!.value = tuning.institutionCoreRadius;
    this.pointsMaterial.uniforms.uHaloOpacity!.value = tuning.institutionHaloOpacity;
    this.pointsMaterial.uniforms.uEmphasisHaloOpacity!.value = (
      tuning.institutionEmphasisHaloOpacity
    );
    this.applyPointColors(theme);
    this.pointsGeometry.getAttribute("pointColor").needsUpdate = true;
    const ripple = themeColor(
      mapVisualColor(tuning, "institutionRipple", theme.ripple),
      theme.primary,
    );
    for (const material of this.rippleMaterials) {
      material.color.copy(ripple.color);
      material.userData.baseOpacity = ripple.opacity * tuning.institutionRippleOpacityScale;
    }
  }

  applyTuning(theme: DigitalTwinMapTheme, tuning: MapVisualTuning) {
    this.applyTheme(theme, tuning);
  }

  hitScreenPoint(pointer: THREE.Vector2, camera: THREE.Camera, viewport: ViewportSize) {
    let nearest: { location: EducationLocation; distanceRatio: number } | undefined;
    for (const location of this.locations) {
      const localPosition = this.locationPositions.get(location.id);
      if (!localPosition) continue;
      const projected = this.projectedPosition
        .copy(localPosition)
        .applyMatrix4(this.root.matrixWorld)
        .project(camera);
      if (projected.z < -1 || projected.z > 1) continue;
      const distance = Math.hypot(
        (projected.x - pointer.x) * viewport.width / 2,
        (projected.y - pointer.y) * viewport.height / 2,
      );
      const radius = location.type === "bureau"
        ? bureauHitRadius
        : location.id === this.selectedLocationId ? selectedSchoolHitRadius : schoolHitRadius;
      if (distance > radius) continue;
      const distanceRatio = distance / radius;
      if (!nearest || distanceRatio < nearest.distanceRatio) nearest = { location, distanceRatio };
    }
    return nearest?.location;
  }

  animate(time: number) {
    this.animationStartTime ??= time;
    const elapsed = Math.max(0, time - this.animationStartTime);
    for (const [index, mesh] of this.rippleMeshes.entries()) {
      const frame = institutionRippleFrame(
        elapsed,
        Number(mesh.userData.delay ?? 0),
        this.tuning,
      );
      mesh.scale.setScalar(frame.scale);
      const material = this.rippleMaterials[index];
      if (material) {
        material.opacity = Number(material.userData.baseOpacity ?? 0) * frame.opacity;
      }
    }
  }

  dispose() {
    this.root.removeFromParent();
    for (const element of this.labelElements) element.remove();
    this.labelElements.clear();
    this.locationById.clear();
    this.locationPositions.clear();
    this.owner.dispose();
  }
}
