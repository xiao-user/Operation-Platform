import * as THREE from "three";
import type { DigitalTwinMapTheme } from "../map-themes";
import type { EducationLocation } from "../types";
import type { TuningAwareMapSceneLayer } from "./map-scene-layer";
import type { MapProjection } from "./map-projection";
import { defaultMapVisualTuning, mapVisualColor } from "./map-visual-tuning";
import type { MapVisualTuning } from "./map-visual-tuning";
import { ResourceOwner } from "./resource-owner";
import { regionTopZ } from "./region-layer";
import { themeColor } from "./theme-color";

const connectionSegments = 24;

interface ConnectionRoute {
  source: THREE.Vector3;
  target: THREE.Vector3;
}

export class ConnectionLayer implements TuningAwareMapSceneLayer {
  readonly root = new THREE.Group();
  private readonly owner = new ResourceOwner();
  private readonly routes: ConnectionRoute[] = [];
  private readonly baseGeometry: THREE.BufferGeometry;
  private readonly flowGeometry: THREE.BufferGeometry;
  private readonly baseMaterial: THREE.LineBasicMaterial;
  private readonly flowMaterial: THREE.ShaderMaterial;
  private reveal = 0;

  constructor(
    locations: readonly EducationLocation[],
    projection: MapProjection,
    theme: DigitalTwinMapTheme,
    private tuning: Readonly<MapVisualTuning> = defaultMapVisualTuning,
  ) {
    const progressValues: number[] = [];
    const delayValues: number[] = [];
    const source = locations.find((location) => location.type === "bureau");

    if (source) {
      const sourcePoint = projection.projectPoint(source.coordinate);
      let routeIndex = 0;
      for (const target of locations) {
        if (target.id === source.id || target.type === "vocational") continue;
        const delay = routeIndex * 0.071;
        this.routes.push({
          source: sourcePoint,
          target: projection.projectPoint(target.coordinate),
        });
        for (let pointIndex = 0; pointIndex < connectionSegments; pointIndex += 1) {
          progressValues.push(
            pointIndex / connectionSegments,
            (pointIndex + 1) / connectionSegments,
          );
          delayValues.push(delay, delay);
        }
        routeIndex += 1;
      }
    }

    this.baseMaterial = this.owner.material(new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.06,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    }));
    this.baseGeometry = this.owner.geometry(new THREE.BufferGeometry());
    const baseLines = new THREE.LineSegments(this.baseGeometry, this.baseMaterial);
    baseLines.renderOrder = 14;
    this.root.add(baseLines);

    this.flowGeometry = this.owner.geometry(new THREE.BufferGeometry());
    this.flowGeometry.setAttribute(
      "progress",
      new THREE.Float32BufferAttribute(progressValues, 1),
    );
    this.flowGeometry.setAttribute("delay", new THREE.Float32BufferAttribute(delayValues, 1));
    this.flowMaterial = this.owner.material(new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color() },
        opacity: { value: 1 },
        speed: { value: tuning.connectionFlowSpeed },
        pulseWidth: { value: tuning.connectionPulseWidth },
      },
      vertexShader: `
        attribute float progress;
        attribute float delay;
        varying float vProgress;
        varying float vDelay;
        void main() {
          vProgress = progress;
          vDelay = delay;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        uniform float opacity;
        uniform float speed;
        uniform float pulseWidth;
        varying float vProgress;
        varying float vDelay;
        void main() {
          float head = fract(time * speed + vDelay);
          float distanceToHead = abs(head - vProgress);
          distanceToHead = min(distanceToHead, 1.0 - distanceToHead);
          float pulse = 1.0 - smoothstep(pulseWidth, pulseWidth * 1.35, distanceToHead);
          gl_FragColor = vec4(color, pulse * opacity);
        }
      `,
    }));
    const flowLines = new THREE.LineSegments(this.flowGeometry, this.flowMaterial);
    flowLines.renderOrder = 15;
    this.root.add(flowLines);
    this.rebuildGeometry(tuning);
    this.applyTheme(theme);
  }

  private rebuildGeometry(tuning: Readonly<MapVisualTuning>) {
    const positions: number[] = [];
    for (const route of this.routes) {
      const source = route.source.clone();
      const target = route.target.clone();
      source.z = regionTopZ + tuning.connectionSurfaceOffset;
      target.z = regionTopZ + tuning.connectionSurfaceOffset;
      const middle = source.clone().lerp(target, 0.5);
      middle.z += Math.max(
        tuning.connectionMinimumArcHeight,
        source.distanceTo(target) * tuning.connectionArcHeightFactor,
      );
      const points = new THREE.QuadraticBezierCurve3(source, middle, target)
        .getPoints(connectionSegments);
      for (let index = 0; index < points.length - 1; index += 1) {
        const start = points[index];
        const end = points[index + 1];
        if (!start || !end) continue;
        positions.push(start.x, start.y, start.z, end.x, end.y, end.z);
      }
    }
    const positionAttribute = new THREE.Float32BufferAttribute(positions, 3);
    this.baseGeometry.setAttribute("position", positionAttribute);
    this.flowGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    this.baseGeometry.computeBoundingSphere();
    this.flowGeometry.computeBoundingSphere();
  }

  applyTheme(
    theme: DigitalTwinMapTheme,
    tuning: Readonly<MapVisualTuning> = this.tuning,
  ) {
    this.tuning = tuning;
    const flyLine = themeColor(
      mapVisualColor(tuning, "connection", theme.flyLine),
      theme.primary,
    );
    this.baseMaterial.color.copy(flyLine.color);
    this.baseMaterial.userData.targetOpacity = flyLine.opacity * tuning.connectionBaseOpacity;
    this.baseMaterial.opacity = Number(this.baseMaterial.userData.targetOpacity) * this.reveal;
    this.flowMaterial.uniforms.color!.value.copy(flyLine.color);
    this.flowMaterial.userData.targetOpacity = flyLine.opacity
      * tuning.connectionFlowOpacityScale;
    this.flowMaterial.uniforms.opacity!.value = Number(
      this.flowMaterial.userData.targetOpacity,
    ) * this.reveal;
    this.flowMaterial.uniforms.speed!.value = tuning.connectionFlowSpeed;
    this.flowMaterial.uniforms.pulseWidth!.value = tuning.connectionPulseWidth;
  }

  applyTuning(theme: DigitalTwinMapTheme, tuning: MapVisualTuning) {
    this.rebuildGeometry(tuning);
    this.applyTheme(theme, tuning);
  }

  private applyReveal() {
    this.baseMaterial.opacity = Number(this.baseMaterial.userData.targetOpacity ?? 0)
      * this.reveal;
    this.flowMaterial.uniforms.opacity!.value = Number(
      this.flowMaterial.userData.targetOpacity ?? 0,
    ) * this.reveal;
  }

  animate(time: number, delta: number) {
    this.flowMaterial.uniforms.time!.value = time;
    const next = THREE.MathUtils.lerp(
      this.reveal,
      1,
      1 - Math.exp(-this.tuning.connectionRevealRate * THREE.MathUtils.clamp(delta, 0, 0.1)),
    );
    this.reveal = Math.abs(1 - next) < 0.002 ? 1 : next;
    this.applyReveal();
  }

  settle() {
    this.reveal = 1;
    this.applyReveal();
  }

  dispose() {
    this.root.removeFromParent();
    this.owner.dispose();
  }
}
