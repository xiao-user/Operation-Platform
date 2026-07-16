import * as THREE from "three";
import type { DigitalTwinMapTheme } from "../map-themes";
import type { EducationLocation } from "../types";
import type { MapProjection } from "./map-projection";
import { ResourceOwner } from "./resource-owner";
import { regionTopZ } from "./region-layer";
import { themeColor } from "./theme-color";

export class ConnectionLayer {
  readonly root = new THREE.Group();
  private readonly owner = new ResourceOwner();
  private readonly baseMaterial: THREE.LineBasicMaterial;
  private readonly flowMaterial: THREE.ShaderMaterial;

  constructor(
    locations: readonly EducationLocation[],
    projection: MapProjection,
    theme: DigitalTwinMapTheme,
  ) {
    const basePositions: number[] = [];
    const flowPositions: number[] = [];
    const progressValues: number[] = [];
    const delayValues: number[] = [];
    const source = locations.find((location) => location.type === "bureau");

    if (source) {
      const sourcePoint = projection.projectPoint(source.coordinate, regionTopZ + 23);
      let routeIndex = 0;
      for (const target of locations) {
        if (target.id === source.id || target.type === "vocational") continue;
        const targetPoint = projection.projectPoint(target.coordinate, regionTopZ + 14);
        const middle = sourcePoint.clone().lerp(targetPoint, 0.5);
        middle.z += Math.max(15, sourcePoint.distanceTo(targetPoint) * 0.12);
        const points = new THREE.QuadraticBezierCurve3(sourcePoint, middle, targetPoint).getPoints(40);
        const delay = routeIndex * 0.071;
        for (let pointIndex = 0; pointIndex < points.length - 1; pointIndex += 1) {
          const start = points[pointIndex];
          const end = points[pointIndex + 1];
          if (!start || !end) continue;
          basePositions.push(start.x, start.y, start.z, end.x, end.y, end.z);
          flowPositions.push(start.x, start.y, start.z, end.x, end.y, end.z);
          progressValues.push(pointIndex / 40, (pointIndex + 1) / 40);
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
    const baseGeometry = this.owner.geometry(new THREE.BufferGeometry());
    baseGeometry.setAttribute("position", new THREE.Float32BufferAttribute(basePositions, 3));
    const baseLines = new THREE.LineSegments(baseGeometry, this.baseMaterial);
    baseLines.renderOrder = 14;
    this.root.add(baseLines);

    const flowGeometry = this.owner.geometry(new THREE.BufferGeometry());
    flowGeometry.setAttribute("position", new THREE.Float32BufferAttribute(flowPositions, 3));
    flowGeometry.setAttribute("progress", new THREE.Float32BufferAttribute(progressValues, 1));
    flowGeometry.setAttribute("delay", new THREE.Float32BufferAttribute(delayValues, 1));
    this.flowMaterial = this.owner.material(new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color() },
        opacity: { value: 1 },
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
        varying float vProgress;
        varying float vDelay;
        void main() {
          float head = fract(time * 0.18 + vDelay);
          float delta = head - vProgress;
          if (delta < 0.0) delta += 1.0;
          float tail = smoothstep(0.18, 0.0, delta);
          float core = smoothstep(0.025, 0.0, delta);
          gl_FragColor = vec4(color, (tail * 0.52 + core * 0.48) * opacity);
        }
      `,
    }));
    const flowLines = new THREE.LineSegments(flowGeometry, this.flowMaterial);
    flowLines.renderOrder = 15;
    this.root.add(flowLines);
    this.applyTheme(theme);
  }

  applyTheme(theme: DigitalTwinMapTheme) {
    const flyLine = themeColor(theme.flyLine, theme.primary);
    this.baseMaterial.color.copy(flyLine.color);
    this.baseMaterial.opacity = flyLine.opacity * 0.06;
    this.flowMaterial.uniforms.color!.value.copy(flyLine.color);
    this.flowMaterial.uniforms.opacity!.value = flyLine.opacity;
  }

  animate(time: number) {
    this.flowMaterial.uniforms.time!.value = time;
  }

  dispose() {
    this.root.removeFromParent();
    this.owner.dispose();
  }
}
