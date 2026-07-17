import * as THREE from "three";
import type { Position } from "../geo";
import type { DigitalTwinMapTheme } from "../map-themes";
import type { TuningAwareMapSceneLayer } from "./map-scene-layer";
import type { MapProjection } from "./map-projection";
import { mapVisualColor } from "./map-visual-tuning";
import type { MapVisualTuning } from "./map-visual-tuning";
import { ResourceOwner } from "./resource-owner";
import { themeColor } from "./theme-color";

export class AmbientEffectsLayer implements TuningAwareMapSceneLayer {
  readonly root = new THREE.Group();
  private readonly owner = new ResourceOwner();
  private readonly chaseGeometry: THREE.BufferGeometry;
  private readonly chasePositions: Float32Array;
  private chaseCurve?: THREE.CatmullRomCurve3;
  private readonly chaseMaterial: THREE.ShaderMaterial;
  private readonly chaseLine: THREE.LineSegments;
  private readonly ringPlateMaterial: THREE.MeshBasicMaterial;
  private readonly ringTickMaterial: THREE.LineBasicMaterial;
  private readonly ringRotor: THREE.LineSegments;
  private readonly chaseSegmentCount = 34;
  private readonly chaseStart = new THREE.Vector3();
  private readonly chaseEnd = new THREE.Vector3();
  private tuning: MapVisualTuning;

  constructor(
    outerRing: Position[] | undefined,
    projection: MapProjection,
    theme: DigitalTwinMapTheme,
    tuning: MapVisualTuning,
    boundaryZ: number,
  ) {
    this.tuning = tuning;
    this.chasePositions = new Float32Array(this.chaseSegmentCount * 2 * 3);
    const tailProgress = new Float32Array(this.chaseSegmentCount * 2);
    for (let index = 0; index < this.chaseSegmentCount; index += 1) {
      const progress = (index + 1) / this.chaseSegmentCount;
      tailProgress[index * 2] = progress;
      tailProgress[index * 2 + 1] = progress;
    }
    this.chaseGeometry = this.owner.geometry(new THREE.BufferGeometry());
    this.chaseGeometry.setAttribute("position", new THREE.BufferAttribute(this.chasePositions, 3));
    this.chaseGeometry.setAttribute("tailProgress", new THREE.BufferAttribute(tailProgress, 1));
    this.chaseMaterial = this.owner.material(new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        headColor: { value: new THREE.Color() },
        tailColor: { value: new THREE.Color() },
        headOpacity: { value: 1 },
        tailOpacity: { value: 0 },
      },
      vertexShader: `
        attribute float tailProgress;
        varying float vTailProgress;
        void main() {
          vTailProgress = tailProgress;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 headColor;
        uniform vec3 tailColor;
        uniform float headOpacity;
        uniform float tailOpacity;
        varying float vTailProgress;
        void main() {
          gl_FragColor = vec4(
            mix(tailColor, headColor, vTailProgress),
            mix(tailOpacity, headOpacity, vTailProgress) * vTailProgress
          );
        }
      `,
    }));
    this.chaseLine = new THREE.LineSegments(this.chaseGeometry, this.chaseMaterial);
    this.chaseLine.renderOrder = 20;
    this.root.add(this.chaseLine);

    this.ringPlateMaterial = this.owner.material(new THREE.MeshBasicMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }));
    const plate = new THREE.Mesh(
      this.owner.geometry(new THREE.RingGeometry(300, 365, 128)),
      this.ringPlateMaterial,
    );
    plate.position.z = 3;
    this.root.add(plate);

    const tickPositions: number[] = [];
    for (let index = 0; index < 48; index += 1) {
      if (index % 4 === 0) continue;
      const angle = (Math.PI * 2 * index) / 48;
      const inner = 342;
      const outer = index % 2 === 0 ? 368 : 360;
      tickPositions.push(
        Math.cos(angle) * inner, Math.sin(angle) * inner, 4,
        Math.cos(angle) * outer, Math.sin(angle) * outer, 4,
      );
    }
    const tickGeometry = this.owner.geometry(new THREE.BufferGeometry());
    tickGeometry.setAttribute("position", new THREE.Float32BufferAttribute(tickPositions, 3));
    this.ringTickMaterial = this.owner.material(new THREE.LineBasicMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    this.ringRotor = new THREE.LineSegments(tickGeometry, this.ringTickMaterial);
    this.root.add(this.ringRotor);
    this.setBoundary(outerRing, projection, boundaryZ);
    this.applyTheme(theme, tuning);
  }

  setBoundary(outerRing: Position[] | undefined, projection: MapProjection, z: number) {
    const curvePoints = outerRing
      ?.filter((_, index) => index % Math.max(1, Math.floor(outerRing.length / 240)) === 0)
      .map((coordinate) => projection.projectPoint(coordinate));
    this.chaseCurve = curvePoints && curvePoints.length >= 4
      ? new THREE.CatmullRomCurve3(curvePoints, true, "centripetal", 0.5)
      : undefined;
    this.setBoundarySurfaceZ(z);
    if (!this.chaseCurve) {
      this.chasePositions.fill(0);
      this.chaseGeometry.getAttribute("position").needsUpdate = true;
    }
  }

  setBoundarySurfaceZ(z: number) {
    this.chaseLine.position.z = z;
  }

  applyTheme(theme: DigitalTwinMapTheme, tuning: MapVisualTuning = this.tuning) {
    this.tuning = tuning;
    const head = themeColor(
      mapVisualColor(tuning, "boundaryHead", theme.chaseLightHead),
      "#FFFFFF",
    );
    const tail = themeColor(
      mapVisualColor(tuning, "boundaryTail", theme.chaseLightTail),
      "rgba(255,255,255,0)",
    );
    const ring = themeColor(
      mapVisualColor(tuning, "hudRing", theme.hudRing),
      theme.primary,
    );
    this.chaseMaterial.uniforms.headColor!.value.copy(head.color);
    this.chaseMaterial.uniforms.tailColor!.value.copy(tail.color);
    this.chaseMaterial.uniforms.headOpacity!.value = head.opacity;
    this.chaseMaterial.uniforms.tailOpacity!.value = tail.opacity;
    this.ringPlateMaterial.color.copy(ring.color);
    this.ringPlateMaterial.opacity = ring.opacity * tuning.hudRingPlateOpacityScale;
    this.ringTickMaterial.color.copy(ring.color);
    this.ringTickMaterial.opacity = ring.opacity * tuning.hudRingTickOpacityScale;
  }

  applyTuning(theme: DigitalTwinMapTheme, tuning: MapVisualTuning) {
    this.applyTheme(theme, tuning);
  }

  animate(time: number, delta: number) {
    this.ringRotor.rotation.z += Math.min(delta, 0.05) * this.tuning.hudRingRotationSpeed;
    if (!this.chaseCurve) return;
    const head = (time * this.tuning.boundarySpeed) % 1;
    const tailSpan = this.tuning.boundaryTailLength;
    for (let index = 0; index < this.chaseSegmentCount; index += 1) {
      const startProgress = (head - tailSpan + tailSpan * (index / this.chaseSegmentCount) + 1) % 1;
      const endProgress = (head - tailSpan + tailSpan * ((index + 1) / this.chaseSegmentCount) + 1) % 1;
      const start = this.chaseCurve.getPointAt(startProgress, this.chaseStart);
      const end = this.chaseCurve.getPointAt(endProgress, this.chaseEnd);
      const offset = index * 6;
      this.chasePositions[offset] = start.x;
      this.chasePositions[offset + 1] = start.y;
      this.chasePositions[offset + 2] = start.z;
      this.chasePositions[offset + 3] = end.x;
      this.chasePositions[offset + 4] = end.y;
      this.chasePositions[offset + 5] = end.z;
    }
    this.chaseGeometry.getAttribute("position").needsUpdate = true;
  }

  dispose() {
    this.root.removeFromParent();
    this.owner.dispose();
  }
}
