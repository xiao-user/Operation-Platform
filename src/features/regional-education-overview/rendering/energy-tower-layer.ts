import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { buildEnergyTowerData } from "../energy-tower-data";
import type { EnergyTowerDatum } from "../energy-tower-data";
import type { MapState } from "../map-data-adapter";
import type { DigitalTwinMapTheme } from "../map-themes";
import type { EducationLocation } from "../types";
import type { MapProjection } from "./map-projection";
import { defaultMapVisualTuning, mapVisualColor } from "./map-visual-tuning";
import type { MapVisualTuning } from "./map-visual-tuning";
import { ResourceOwner } from "./resource-owner";
import { regionTopZ } from "./region-layer";

const verticalSegments = 24;
const radialSegments = 32;
export const energyTowerRenderOrder = 80;

export function energyTowerDimensions(
  scope: MapState["scope"],
  tuning: Readonly<MapVisualTuning> = defaultMapVisualTuning,
) {
  return scope === "township"
    ? {
        minimumHeight: tuning.energyTowerTownshipMinimumHeight,
        maximumHeight: tuning.energyTowerTownshipMaximumHeight,
        radius: tuning.energyTowerTownshipRadius,
      }
    : {
        minimumHeight: tuning.energyTowerDistrictMinimumHeight,
        maximumHeight: tuning.energyTowerDistrictMaximumHeight,
        radius: tuning.energyTowerDistrictRadius,
      };
}

export function energyTowerHeight(
  value: number,
  maximumValue: number,
  scope: MapState["scope"],
  tuning: Readonly<MapVisualTuning> = defaultMapVisualTuning,
) {
  const dimensions = energyTowerDimensions(scope, tuning);
  return THREE.MathUtils.lerp(
    dimensions.minimumHeight,
    dimensions.maximumHeight,
    Math.pow(
      Math.max(0, value) / Math.max(1, maximumValue),
      tuning.energyTowerHeightExponent,
    ),
  );
}

const vertexShader = `
  varying vec2 vUv;
  varying float vHeight;
  void main() {
    vUv = uv;
    vHeight = position.z;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 uTopColor;
  uniform float uHeight;
  uniform float uHover;
  uniform float uReveal;
  uniform float uVerticalGridCount;
  uniform float uRingGridCount;
  uniform float uFadeFloor;
  uniform float uFadeEnd;
  uniform float uGridLineWidth;
  uniform float uBaseColorStrength;
  uniform float uHeightColorStrength;
  uniform float uGridColorStrength;
  uniform float uTipGlowExponent;
  uniform float uTipGlowStrength;
  uniform float uHoverColorStrength;
  uniform float uBaseOpacity;
  uniform float uHeightOpacity;
  uniform float uGridOpacity;
  uniform float uHoverOpacity;
  varying vec2 vUv;
  varying float vHeight;
  void main() {
    float h = clamp(vHeight / max(uHeight, 0.001), uFadeFloor, 1.0);
    float gridStart = 1.0 - clamp(uGridLineWidth, 0.001, 0.999);
    float verticalGrid = step(gridStart, mod(vUv.x * uVerticalGridCount, 1.0));
    float ringGrid = step(gridStart, mod(vUv.y * uRingGridCount, 1.0));
    float grid = max(verticalGrid, ringGrid);
    float verticalFade = smoothstep(0.0, uFadeEnd, h);
    vec3 color = uTopColor * (uBaseColorStrength + h * uHeightColorStrength);
    color += uTopColor * grid * h * uGridColorStrength;
    color += uTopColor * (
      pow(h, uTipGlowExponent) * uTipGlowStrength
      + uHover * uHoverColorStrength
    );
    float alpha = (
      uBaseOpacity
      + h * uHeightOpacity
      + grid * uGridOpacity
      + uHover * uHoverOpacity
    ) * verticalFade;
    gl_FragColor = vec4(color, alpha * uReveal);
  }
`;

export interface EnergyTowerHit {
  datum: EnergyTowerDatum;
}

export class EnergyTowerLayer {
  readonly root = new THREE.Group();
  private readonly owner = new ResourceOwner();
  private readonly meshes: THREE.Mesh[] = [];
  private readonly labels = new Map<string, HTMLElement>();
  private readonly labelIds: string[] = [];
  private readonly materials = new Map<string, THREE.ShaderMaterial>();
  private readonly towerGroups: THREE.Group[] = [];
  private readonly glowMaterials: THREE.MeshBasicMaterial[] = [];
  private hoveredId?: string;
  private activeLabelIndex = 0;
  private labelCycleElapsed = 0;
  private reveal = 0;
  private targetReveal = 1;

  constructor(
    mapState: MapState,
    locations: readonly EducationLocation[],
    projection: MapProjection,
    theme: DigitalTwinMapTheme,
    private tuning: Readonly<MapVisualTuning>,
  ) {
    this.root.renderOrder = energyTowerRenderOrder;
    const dimensions = energyTowerDimensions(mapState.scope, tuning);
    const data = buildEnergyTowerData(
      mapState,
      locations,
      tuning.energyTowerTownshipGridCellSizeDegrees,
    )
      .sort((left, right) => right.value - left.value || left.name.localeCompare(right.name, "zh-CN"));
    const maximumValue = Math.max(1, ...data.map((datum) => datum.value));
    for (const datum of data) {
      const height = energyTowerHeight(datum.value, maximumValue, mapState.scope, tuning);
      this.createTower(
        datum,
        height,
        dimensions.radius,
        projection,
        theme,
        tuning,
        mapState.scope === "township",
      );
    }
    this.syncPinnedLabel();
  }

  private createTower(
    datum: EnergyTowerDatum,
    height: number,
    radius: number,
    projection: MapProjection,
    theme: DigitalTwinMapTheme,
    tuning: Readonly<MapVisualTuning>,
    showSchoolDetails: boolean,
  ) {
    const group = new THREE.Group();
    // Three.js resets groupOrder at every nested Group. Keep the explicit overlay
    // order on each tower so RegionLayer's district renderOrder cannot draw over it.
    group.renderOrder = energyTowerRenderOrder;
    group.scale.z = 0.001;
    group.position.copy(projection.projectPoint(datum.coordinate, regionTopZ + 1.2));
    const profile = Array.from({ length: verticalSegments + 1 }, (_, index) => {
      const progress = index / verticalSegments;
      return new THREE.Vector2(
        radius * Math.exp(-progress * tuning.energyTowerCurveFactor) + 0.08,
        progress * height,
      );
    });
    const geometry = this.owner.geometry(new THREE.LatheGeometry(profile, radialSegments));
    geometry.rotateX(Math.PI / 2);
    const material = this.owner.material(new THREE.ShaderMaterial({
      uniforms: {
        uTopColor: { value: new THREE.Color(
          mapVisualColor(tuning, "energyTower", theme.primary),
        ) },
        uHeight: { value: height },
        uHover: { value: 0 },
        uReveal: { value: 0 },
        uVerticalGridCount: { value: tuning.energyTowerVerticalGridCount },
        uRingGridCount: { value: tuning.energyTowerRingGridCount },
        uFadeFloor: { value: tuning.energyTowerFadeFloor },
        uFadeEnd: { value: tuning.energyTowerFadeEnd },
        uGridLineWidth: { value: tuning.energyTowerGridLineWidth },
        uBaseColorStrength: { value: tuning.energyTowerBaseColorStrength },
        uHeightColorStrength: { value: tuning.energyTowerHeightColorStrength },
        uGridColorStrength: { value: tuning.energyTowerGridColorStrength },
        uTipGlowExponent: { value: tuning.energyTowerTipGlowExponent },
        uTipGlowStrength: { value: tuning.energyTowerTipGlowStrength },
        uHoverColorStrength: { value: tuning.energyTowerHoverColorStrength },
        uBaseOpacity: { value: tuning.energyTowerBaseOpacity },
        uHeightOpacity: { value: tuning.energyTowerHeightOpacity },
        uGridOpacity: { value: tuning.energyTowerGridOpacity },
        uHoverOpacity: { value: tuning.energyTowerHoverOpacity },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    }));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.energyTowerDatum = datum;
    mesh.renderOrder = 2;
    this.meshes.push(mesh);
    this.towerGroups.push(group);
    this.materials.set(datum.id, material);
    group.add(mesh);

    const glow = this.createGlowTexture(
      tuning.energyTowerGlowMidpoint,
      tuning.energyTowerGlowMidAlpha,
    );
    const glowMaterial = this.owner.material(new THREE.MeshBasicMaterial({
      map: glow,
      color: mapVisualColor(tuning, "energyTowerGlow", theme.primary),
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }));
    glowMaterial.userData.baseOpacity = tuning.energyTowerGlowOpacity;
    this.glowMaterials.push(glowMaterial);
    const glowPlane = new THREE.Mesh(
      this.owner.geometry(new THREE.CircleGeometry(
        radius * tuning.energyTowerGlowRadiusScale,
        40,
      )),
      glowMaterial,
    );
    glowPlane.position.z = 0.16;
    glowPlane.renderOrder = 1;
    group.add(glowPlane);

    const element = document.createElement("div");
    element.className = `map-energy-tower-label${showSchoolDetails ? " has-school-details" : ""}`;
    element.dataset.energyTowerId = datum.id;
    element.style.setProperty("--tower-reveal", "0");
    const heading = document.createElement("strong");
    heading.textContent = showSchoolDetails ? datum.valueLabel : datum.name;
    element.append(heading);
    if (showSchoolDetails && datum.schoolNames?.length) {
      const list = document.createElement("div");
      list.className = `tower-school-list${datum.schoolNames.length > 3 ? " is-scrolling" : ""}`;
      list.setAttribute("aria-label", datum.schoolNames.join("、"));
      list.style.setProperty("--school-scroll-duration", `${Math.max(7, datum.schoolNames.length * 2)}s`);
      const track = document.createElement("div");
      track.className = "tower-school-list-track";
      const cycleCount = datum.schoolNames.length > 3 ? 2 : 1;
      for (let cycleIndex = 0; cycleIndex < cycleCount; cycleIndex += 1) {
        const cycle = document.createElement("div");
        cycle.className = "tower-school-list-cycle";
        cycle.setAttribute("aria-hidden", "true");
        for (const schoolName of datum.schoolNames) {
          const school = document.createElement("span");
          school.textContent = schoolName;
          cycle.appendChild(school);
        }
        track.appendChild(cycle);
      }
      list.appendChild(track);
      element.appendChild(list);
    } else {
      const value = document.createElement("span");
      value.textContent = datum.valueLabel;
      element.append(value);
    }
    const label = new CSS2DObject(element);
    label.position.z = height + 8;
    group.add(label);
    this.labels.set(datum.id, element);
    this.labelIds.push(datum.id);
    this.root.add(group);
  }

  private syncPinnedLabel() {
    const activeId = this.hoveredId ?? this.labelIds[this.activeLabelIndex];
    for (const [id, element] of this.labels) {
      element.classList.toggle("is-pinned", id === activeId);
    }
  }

  private applyReveal() {
    const heightProgress = THREE.MathUtils.smoothstep(this.reveal, 0, 1);
    for (const group of this.towerGroups) group.scale.z = Math.max(0.001, heightProgress);
    for (const material of this.materials.values()) {
      material.uniforms.uReveal!.value = this.reveal;
    }
    for (const material of this.glowMaterials) {
      material.opacity = Number(material.userData.baseOpacity ?? 0.58) * this.reveal;
    }
    for (const element of this.labels.values()) {
      element.style.setProperty("--tower-reveal", this.reveal.toFixed(3));
      element.classList.toggle("is-revealed", this.reveal > 0.04);
    }
  }

  animate(delta: number) {
    const next = THREE.MathUtils.lerp(
      this.reveal,
      this.targetReveal,
      1 - Math.exp(
        -this.tuning.energyTowerRevealRate * THREE.MathUtils.clamp(delta, 0, 0.1),
      ),
    );
    this.reveal = Math.abs(next - this.targetReveal) < 0.002 ? this.targetReveal : next;
    this.applyReveal();
    let labelChanged = false;
    if (!this.hoveredId && this.labelIds.length > 1 && this.targetReveal > 0) {
      const cycleDuration = Math.max(0.1, this.tuning.energyTowerLabelCycleSeconds);
      this.labelCycleElapsed += THREE.MathUtils.clamp(delta, 0, 0.1);
      if (this.labelCycleElapsed >= cycleDuration) {
        this.labelCycleElapsed %= cycleDuration;
        this.activeLabelIndex = (this.activeLabelIndex + 1) % this.labelIds.length;
        this.syncPinnedLabel();
        labelChanged = true;
      }
    }
    return this.reveal !== this.targetReveal || labelChanged;
  }

  startExit() {
    this.targetReveal = 0;
  }

  settle(visible: boolean) {
    this.targetReveal = visible ? 1 : 0;
    this.reveal = this.targetReveal;
    this.applyReveal();
  }

  isHidden() {
    return this.targetReveal === 0 && this.reveal === 0;
  }

  private createGlowTexture(midpoint: number, middleAlpha: number) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    if (context) {
      const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, "#FFFFFF");
      gradient.addColorStop(midpoint, `rgba(255,255,255,${middleAlpha})`);
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 128, 128);
    }
    return this.owner.texture(new THREE.CanvasTexture(canvas));
  }

  hit(raycaster: THREE.Raycaster): EnergyTowerHit | undefined {
    const intersection = raycaster.intersectObjects(this.meshes, false)[0];
    const datum = intersection?.object.userData.energyTowerDatum as EnergyTowerDatum | undefined;
    return datum ? { datum } : undefined;
  }

  setHovered(id?: string) {
    if (this.hoveredId === id) return;
    if (this.hoveredId) {
      const previousMaterial = this.materials.get(this.hoveredId);
      if (previousMaterial) previousMaterial.uniforms.uHover!.value = 0;
      this.labels.get(this.hoveredId)?.classList.remove("is-hovered");
    }
    this.hoveredId = id;
    if (id) {
      const hoveredIndex = this.labelIds.indexOf(id);
      if (hoveredIndex >= 0) this.activeLabelIndex = hoveredIndex;
      const material = this.materials.get(id);
      if (material) material.uniforms.uHover!.value = 1;
      this.labels.get(id)?.classList.add("is-hovered");
    }
    this.labelCycleElapsed = 0;
    this.syncPinnedLabel();
  }

  applyTheme(
    theme: DigitalTwinMapTheme,
    tuning: Readonly<MapVisualTuning> = this.tuning,
  ) {
    const towerColor = mapVisualColor(tuning, "energyTower", theme.primary);
    const glowColor = mapVisualColor(tuning, "energyTowerGlow", theme.primary);
    for (const material of this.materials.values()) {
      material.uniforms.uTopColor!.value.set(towerColor);
    }
    for (const material of this.glowMaterials) material.color.set(glowColor);
  }

  applyTuning(theme: DigitalTwinMapTheme, tuning: Readonly<MapVisualTuning>) {
    this.tuning = tuning;
    for (const material of this.materials.values()) {
      material.uniforms.uVerticalGridCount!.value = tuning.energyTowerVerticalGridCount;
      material.uniforms.uRingGridCount!.value = tuning.energyTowerRingGridCount;
      material.uniforms.uFadeFloor!.value = tuning.energyTowerFadeFloor;
      material.uniforms.uFadeEnd!.value = tuning.energyTowerFadeEnd;
      material.uniforms.uGridLineWidth!.value = tuning.energyTowerGridLineWidth;
      material.uniforms.uBaseColorStrength!.value = tuning.energyTowerBaseColorStrength;
      material.uniforms.uHeightColorStrength!.value = tuning.energyTowerHeightColorStrength;
      material.uniforms.uGridColorStrength!.value = tuning.energyTowerGridColorStrength;
      material.uniforms.uTipGlowExponent!.value = tuning.energyTowerTipGlowExponent;
      material.uniforms.uTipGlowStrength!.value = tuning.energyTowerTipGlowStrength;
      material.uniforms.uHoverColorStrength!.value = tuning.energyTowerHoverColorStrength;
      material.uniforms.uBaseOpacity!.value = tuning.energyTowerBaseOpacity;
      material.uniforms.uHeightOpacity!.value = tuning.energyTowerHeightOpacity;
      material.uniforms.uGridOpacity!.value = tuning.energyTowerGridOpacity;
      material.uniforms.uHoverOpacity!.value = tuning.energyTowerHoverOpacity;
    }
    for (const material of this.glowMaterials) {
      material.userData.baseOpacity = tuning.energyTowerGlowOpacity;
      material.opacity = tuning.energyTowerGlowOpacity * this.reveal;
    }
    this.applyTheme(theme, tuning);
  }

  dispose() {
    this.root.removeFromParent();
    for (const element of this.labels.values()) element.remove();
    this.labels.clear();
    this.labelIds.length = 0;
    this.meshes.length = 0;
    this.towerGroups.length = 0;
    this.glowMaterials.length = 0;
    this.owner.dispose();
  }
}
