import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { MapState } from "../map-state";
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

type InstitutionElevationTuning = Pick<
  MapVisualTuning,
  | "institutionDistrictStemHeight"
  | "institutionTownshipStemHeight"
  | "institutionSelectedStemHeightScale"
  | "institutionBureauStemHeight"
>;

export function institutionMarkerElevation(
  locationType: EducationLocation["type"],
  selected: boolean,
  scope: MapState["scope"],
  tuning: InstitutionElevationTuning,
) {
  if (locationType === "bureau") return tuning.institutionBureauStemHeight;
  const baseHeight = scope === "district"
    ? tuning.institutionDistrictStemHeight
    : tuning.institutionTownshipStemHeight;
  return selected ? baseHeight * tuning.institutionSelectedStemHeightScale : baseHeight;
}

export function dampInstitutionElevation(
  current: number,
  target: number,
  delta: number,
  rate: number,
) {
  const safeDelta = THREE.MathUtils.clamp(delta, 0, 0.1);
  const next = THREE.MathUtils.lerp(current, target, 1 - Math.exp(-rate * safeDelta));
  return Math.abs(target - next) < 0.01 ? target : next;
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
  private readonly labelObjectsByLocationId = new Map<string, CSS2DObject>();
  private readonly pointsGeometry: THREE.BufferGeometry;
  private readonly pointsMaterial: THREE.ShaderMaterial;
  private readonly stemGeometry: THREE.BufferGeometry;
  private readonly stemMaterial: THREE.ShaderMaterial;
  private readonly selectedValues: Float32Array;
  private readonly colorValues: Float32Array;
  private readonly stemColorValues: Float32Array;
  private readonly stemSelectedValues: Float32Array;
  private readonly stemBureauValues: Float32Array;
  private readonly currentElevations: Float32Array;
  private readonly targetElevations: Float32Array;
  private readonly rippleMaterials: THREE.MeshBasicMaterial[] = [];
  private readonly rippleMeshes: THREE.Mesh[] = [];
  private selectedLocationId?: string;
  private hoveredLocationId?: string;
  private animationStartTime?: number;
  private elevationAnimationTime?: number;
  private elevationAnimationActive = false;

  constructor(
    private readonly locations: readonly EducationLocation[],
    private readonly projection: MapProjection,
    theme: DigitalTwinMapTheme,
    selectedLocationId: string | undefined,
    pixelRatio: number,
    private tuning: Readonly<MapVisualTuning> = defaultMapVisualTuning,
    private readonly scope: MapState["scope"] = "district",
  ) {
    this.selectedLocationId = selectedLocationId;
    const positions = new Float32Array(locations.length * 3);
    this.colorValues = new Float32Array(locations.length * 3);
    const stemPositions = new Float32Array(locations.length * 2 * 3);
    this.stemColorValues = new Float32Array(locations.length * 2 * 3);
    this.stemSelectedValues = new Float32Array(locations.length * 2);
    this.stemBureauValues = new Float32Array(locations.length * 2);
    this.currentElevations = new Float32Array(locations.length);
    this.targetElevations = new Float32Array(locations.length);
    this.selectedValues = new Float32Array(locations.length);
    const bureauValues = new Float32Array(locations.length);
    this.pointsGeometry = this.owner.geometry(new THREE.BufferGeometry());
    this.stemGeometry = this.owner.geometry(new THREE.BufferGeometry());

    locations.forEach((location, index) => {
      const startElevation = this.tuning.institutionStemStartHeight;
      const targetElevation = institutionMarkerElevation(
        location.type,
        location.id === selectedLocationId,
        this.scope,
        this.tuning,
      );
      this.currentElevations[index] = startElevation;
      this.targetElevations[index] = targetElevation;
      if (Math.abs(startElevation - targetElevation) >= 0.01) {
        this.elevationAnimationActive = true;
      }
      this.locationById.set(location.id, location);
      this.locationPositions.set(
        location.id,
        projection.projectPoint(location.coordinate, regionTopZ + startElevation),
      );
    });
    locations.forEach((location, index) => {
      const point = this.locationPositions.get(location.id)!;
      positions.set([point.x, point.y, point.z], index * 3);
      this.selectedValues[index] = location.id === selectedLocationId ? 1 : 0;
      bureauValues[index] = location.type === "bureau" ? 1 : 0;
      this.stemSelectedValues.set(
        [this.selectedValues[index]!, this.selectedValues[index]!],
        index * 2,
      );
      this.stemBureauValues.set(
        [bureauValues[index]!, bureauValues[index]!],
        index * 2,
      );
      this.locationByPointIndex.push(location);
      const stemStart = projection.projectPoint(
        location.coordinate,
        regionTopZ + this.tuning.institutionStemStartHeight,
      );
      stemPositions.set(
        [stemStart.x, stemStart.y, stemStart.z, point.x, point.y, point.z],
        index * 6,
      );
    });
    this.applyPointColors(theme);
    this.pointsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.pointsGeometry.setAttribute("pointColor", new THREE.BufferAttribute(this.colorValues, 3));
    this.pointsGeometry.setAttribute("selected", new THREE.BufferAttribute(this.selectedValues, 1));
    this.pointsGeometry.setAttribute("bureau", new THREE.BufferAttribute(bureauValues, 1));
    this.pointsGeometry.computeBoundingSphere();
    this.stemGeometry.setAttribute("position", new THREE.BufferAttribute(stemPositions, 3));
    this.stemGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(this.stemColorValues, 3),
    );
    this.stemGeometry.setAttribute(
      "selected",
      new THREE.BufferAttribute(this.stemSelectedValues, 1),
    );
    this.stemGeometry.setAttribute(
      "bureau",
      new THREE.BufferAttribute(this.stemBureauValues, 1),
    );
    this.stemGeometry.computeBoundingSphere();

    this.pointsMaterial = this.owner.material(new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uPixelRatio: { value: pixelRatio },
        uPointSize: {
          value: tuning.institutionPointSize
            * (scope === "district" ? tuning.institutionDistrictPointScale : 1),
        },
        uEmphasisPointSize: { value: tuning.institutionEmphasisPointSize },
        uBureauPointSize: { value: tuning.institutionBureauPointSize },
        uTime: { value: 0 },
        uHaloInnerRadius: { value: tuning.institutionHaloInnerRadius },
        uCoreRadius: { value: tuning.institutionCoreRadius },
        uHaloOpacity: { value: tuning.institutionHaloOpacity },
        uEmphasisHaloOpacity: { value: tuning.institutionEmphasisHaloOpacity },
        uDefaultOpacity: { value: tuning.institutionDefaultOpacity },
        uSelectedOpacity: { value: tuning.institutionSelectedOpacity },
      },
      vertexShader: `
        attribute vec3 pointColor;
        attribute float selected;
        attribute float bureau;
        uniform float uPixelRatio;
        uniform float uPointSize;
        uniform float uEmphasisPointSize;
        uniform float uBureauPointSize;
        varying vec3 vColor;
        varying float vSelected;
        varying float vBureau;
        void main() {
          vColor = pointColor;
          vSelected = selected;
          vBureau = bureau;
          float schoolSize = mix(uPointSize, uEmphasisPointSize, selected);
          gl_PointSize = mix(schoolSize, uBureauPointSize, bureau) * uPixelRatio;
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
        uniform float uDefaultOpacity;
        uniform float uSelectedOpacity;
        uniform float uTime;
        void main() {
          vec2 centered = gl_PointCoord - vec2(0.5);
          float distanceToCenter = length(centered);
          if (distanceToCenter > 0.5) discard;
          float halo = 1.0 - smoothstep(uHaloInnerRadius, 0.5, distanceToCenter);
          float core = 1.0 - smoothstep(0.0, uCoreRadius, distanceToCenter);
          float emphasis = max(vSelected, vBureau);
          float ring = 1.0 - smoothstep(0.018, 0.04, abs(distanceToCenter - 0.34));
          float angle = atan(centered.y, centered.x);
          float schoolRingAngle = angle + uTime * 0.72 * vSelected;
          float threeSegmentMask = smoothstep(0.32, 0.52, abs(sin(schoolRingAngle * 1.5)));
          float schoolHaloShape = 1.0 - smoothstep(uCoreRadius, 0.5, distanceToCenter);
          float schoolHalo = schoolHaloShape
            * mix(uHaloOpacity * 0.3, uEmphasisHaloOpacity * 0.65, vSelected);
          float schoolRing = ring * threeSegmentMask * mix(0.68, 1.0, vSelected);
          float bureauInnerRing = 1.0 - smoothstep(
            0.016,
            0.035,
            abs(distanceToCenter - 0.28)
          );
          float bureauOuterRing = 1.0 - smoothstep(
            0.018,
            0.04,
            abs(distanceToCenter - 0.42)
          );
          float bureauSegmentMask = smoothstep(
            0.28,
            0.58,
            abs(cos((angle + uTime * 0.34) * 2.0))
          );
          float bureauSignal = max(bureauInnerRing * 0.78, bureauOuterRing * bureauSegmentMask);
          float bureauOpacity = max(
            core,
            max(halo * mix(uHaloOpacity, uEmphasisHaloOpacity, emphasis), bureauSignal)
          );
          float opacity = mix(max(core, max(schoolHalo, schoolRing)), bureauOpacity, vBureau);
          float markerOpacity = mix(uDefaultOpacity, uSelectedOpacity, emphasis);
          gl_FragColor = vec4(vColor, opacity * markerOpacity);
        }
      `,
    }));
    this.stemMaterial = this.owner.material(new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uDefaultOpacity: { value: tuning.institutionDefaultOpacity },
        uSelectedOpacity: { value: tuning.institutionSelectedOpacity },
      },
      vertexShader: `
        attribute vec3 color;
        attribute float selected;
        attribute float bureau;
        varying vec3 vColor;
        varying float vEmphasis;
        void main() {
          vColor = color;
          vEmphasis = max(selected, bureau);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uDefaultOpacity;
        uniform float uSelectedOpacity;
        varying vec3 vColor;
        varying float vEmphasis;
        void main() {
          float opacity = mix(uDefaultOpacity, uSelectedOpacity, vEmphasis);
          gl_FragColor = vec4(vColor, opacity);
        }
      `,
    }));
    const stems = new THREE.LineSegments(this.stemGeometry, this.stemMaterial);
    stems.renderOrder = 17;
    const points = new THREE.Points(this.pointsGeometry, this.pointsMaterial);
    points.renderOrder = 18;
    this.root.add(stems, points);
    this.createBureauRipples(theme);
    this.rebuildLabels();
  }

  private applyPointColors(theme: DigitalTwinMapTheme) {
    const defaultColor = new THREE.Color(
      mapVisualColor(this.tuning, "institutionDefault", theme.labelText),
    );
    const selectedColor = new THREE.Color(
      mapVisualColor(this.tuning, "institutionSelected", theme.scatter),
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
      color.toArray(this.stemColorValues, index * 6);
      color.toArray(this.stemColorValues, index * 6 + 3);
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

  private addLabelElement(
    element: HTMLElement,
    position: THREE.Vector3,
    locationId: string,
  ) {
    this.labelElements.add(element);
    const object = new CSS2DObject(element);
    object.position.copy(position);
    this.labelObjectsByLocationId.set(locationId, object);
    this.root.add(object);
  }

  private createLocationName(location: EducationLocation, selected: boolean) {
    const element = document.createElement("strong");
    element.className = `map-location-name${location.type === "bureau" ? " is-bureau" : ""}${selected ? " is-selected" : " is-hovered"}`;
    element.textContent = location.name;
    const position = this.locationPositions.get(location.id)?.clone()
      ?? this.projection.projectPoint(location.coordinate, regionTopZ);
    position.z += location.type === "bureau" ? 6 : 7;
    this.addLabelElement(element, position, location.id);
  }

  private rebuildLabels() {
    for (const element of this.labelElements) element.remove();
    this.labelElements.clear();
    this.labelObjectsByLocationId.clear();
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

  private refreshElevationTargets() {
    this.locationByPointIndex.forEach((location, index) => {
      const target = institutionMarkerElevation(
        location.type,
        location.id === this.selectedLocationId,
        this.scope,
        this.tuning,
      );
      if (Math.abs(target - this.targetElevations[index]!) >= 0.01) {
        this.elevationAnimationActive = true;
      }
      this.targetElevations[index] = target;
    });
  }

  private updateStemStartPositions() {
    const stems = this.stemGeometry.getAttribute("position") as THREE.BufferAttribute;
    const startZ = regionTopZ + this.tuning.institutionStemStartHeight;
    for (let index = 0; index < this.locationByPointIndex.length; index += 1) {
      stems.setZ(index * 2, startZ);
    }
    stems.needsUpdate = true;
  }

  private writeElevation(index: number, elevation: number) {
    const location = this.locationByPointIndex[index];
    if (!location) return;
    const z = regionTopZ + elevation;
    this.locationPositions.get(location.id)?.setZ(z);
    const points = this.pointsGeometry.getAttribute("position") as THREE.BufferAttribute;
    const stems = this.stemGeometry.getAttribute("position") as THREE.BufferAttribute;
    points.setZ(index, z);
    stems.setZ(index * 2 + 1, z);
    const label = this.labelObjectsByLocationId.get(location.id);
    if (label) label.position.z = z + (location.type === "bureau" ? 6 : 7);
  }

  private updateElevations(delta: number, settle = false) {
    if (!this.elevationAnimationActive && !settle) return false;
    let active = false;
    this.locationByPointIndex.forEach((_, index) => {
      const target = this.targetElevations[index]!;
      const current = this.currentElevations[index]!;
      const next = settle
        ? target
        : dampInstitutionElevation(
            current,
            target,
            delta,
            this.tuning.institutionStemTransitionRate,
          );
      this.currentElevations[index] = next;
      this.writeElevation(index, next);
      if (Math.abs(target - next) >= 0.01) active = true;
    });
    this.elevationAnimationActive = active;
    this.pointsGeometry.getAttribute("position").needsUpdate = true;
    this.stemGeometry.getAttribute("position").needsUpdate = true;
    return true;
  }

  settleElevations() {
    this.updateElevations(0, true);
  }

  setSelected(
    locationId: string | undefined,
    theme: DigitalTwinMapTheme,
    animate = true,
  ) {
    this.selectedLocationId = locationId;
    this.locationByPointIndex.forEach((location, index) => {
      this.selectedValues[index] = location.id === locationId ? 1 : 0;
      this.stemSelectedValues[index * 2] = this.selectedValues[index]!;
      this.stemSelectedValues[index * 2 + 1] = this.selectedValues[index]!;
    });
    this.pointsGeometry.getAttribute("selected").needsUpdate = true;
    this.stemGeometry.getAttribute("selected").needsUpdate = true;
    this.refreshElevationTargets();
    if (!animate) this.settleElevations();
    this.applyPointColors(theme);
    this.pointsGeometry.getAttribute("pointColor").needsUpdate = true;
    this.stemGeometry.getAttribute("color").needsUpdate = true;
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
    this.pointsMaterial.uniforms.uPointSize!.value = tuning.institutionPointSize
      * (this.scope === "district" ? tuning.institutionDistrictPointScale : 1);
    this.pointsMaterial.uniforms.uEmphasisPointSize!.value = tuning.institutionEmphasisPointSize;
    this.pointsMaterial.uniforms.uBureauPointSize!.value = tuning.institutionBureauPointSize;
    this.pointsMaterial.uniforms.uHaloInnerRadius!.value = tuning.institutionHaloInnerRadius;
    this.pointsMaterial.uniforms.uCoreRadius!.value = tuning.institutionCoreRadius;
    this.pointsMaterial.uniforms.uHaloOpacity!.value = tuning.institutionHaloOpacity;
    this.pointsMaterial.uniforms.uEmphasisHaloOpacity!.value = (
      tuning.institutionEmphasisHaloOpacity
    );
    this.pointsMaterial.uniforms.uDefaultOpacity!.value = tuning.institutionDefaultOpacity;
    this.pointsMaterial.uniforms.uSelectedOpacity!.value = tuning.institutionSelectedOpacity;
    this.stemMaterial.uniforms.uDefaultOpacity!.value = tuning.institutionDefaultOpacity;
    this.stemMaterial.uniforms.uSelectedOpacity!.value = tuning.institutionSelectedOpacity;
    this.updateStemStartPositions();
    this.applyPointColors(theme);
    this.pointsGeometry.getAttribute("pointColor").needsUpdate = true;
    this.stemGeometry.getAttribute("color").needsUpdate = true;
    this.refreshElevationTargets();
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
    const elevationDelta = this.elevationAnimationTime === undefined
      ? 1 / 60
      : Math.max(0, time - this.elevationAnimationTime);
    this.elevationAnimationTime = time;
    this.pointsMaterial.uniforms.uTime!.value = time;
    this.updateElevations(elevationDelta);
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
    this.labelObjectsByLocationId.clear();
    this.locationById.clear();
    this.locationPositions.clear();
    this.owner.dispose();
  }
}
