import * as THREE from "three";
import type { DigitalTwinMapTheme } from "../map-themes";
import type { TuningAwareMapSceneLayer } from "./map-scene-layer";
import type { MapVisualTuning } from "./map-visual-tuning";
import { mapVisualColor } from "./map-visual-tuning";
import { ResourceOwner } from "./resource-owner";

export const groundPlaneSize = 12_000;
export const groundGridCellSize = 60;
export const groundGridFadeStart = 1600;
export const groundGridFadeEnd = 2200;
const groundPlaneZ = 0;

export class GroundGridLayer implements TuningAwareMapSceneLayer {
  readonly root = new THREE.Group();
  private readonly owner = new ResourceOwner();
  private readonly material: THREE.ShaderMaterial;

  constructor(theme: DigitalTwinMapTheme, tuning: Readonly<MapVisualTuning>) {
    this.material = this.owner.material(new THREE.ShaderMaterial({
      transparent: true,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uFillColor: { value: new THREE.Color() },
        uGridColor: { value: new THREE.Color() },
        uFillOpacity: { value: tuning.groundFillOpacity },
        uGridOpacity: { value: tuning.groundGridOpacity },
        uCellSize: { value: groundGridCellSize },
        uFadeStart: { value: groundGridFadeStart },
        uFadeEnd: { value: groundGridFadeEnd },
      },
      vertexShader: `
        varying vec2 vGridPosition;
        void main() {
          vGridPosition = position.xy;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uFillColor;
        uniform vec3 uGridColor;
        uniform float uFillOpacity;
        uniform float uGridOpacity;
        uniform float uCellSize;
        uniform float uFadeStart;
        uniform float uFadeEnd;
        varying vec2 vGridPosition;

        float gridLine(vec2 position) {
          vec2 coordinate = position / uCellSize;
          vec2 derivative = max(fwidth(coordinate), vec2(0.0001));
          vec2 distanceToLine = abs(fract(coordinate - 0.5) - 0.5) / derivative;
          return 1.0 - min(min(distanceToLine.x, distanceToLine.y), 1.0);
        }

        void main() {
          float line = gridLine(vGridPosition);
          float edgeFade = 1.0 - smoothstep(
            uFadeStart,
            uFadeEnd,
            length(vGridPosition)
          );
          float gridStrength = line * uGridOpacity * edgeFade;
          vec3 color = mix(uFillColor, uGridColor, gridStrength);
          float opacity = uFillOpacity + gridStrength * (1.0 - uFillOpacity);
          gl_FragColor = vec4(color, opacity);
        }
      `,
    }));

    const plane = new THREE.Mesh(
      this.owner.geometry(new THREE.PlaneGeometry(groundPlaneSize, groundPlaneSize)),
      this.material,
    );
    plane.position.z = groundPlaneZ;
    plane.renderOrder = -2;
    this.root.add(plane);
    this.applyTheme(theme, tuning);
  }

  applyTheme(theme: DigitalTwinMapTheme, tuning: Readonly<MapVisualTuning>) {
    this.material.uniforms.uFillColor!.value.set(
      mapVisualColor(tuning, "groundFill", theme.pageBackground),
    );
    this.material.uniforms.uGridColor!.value.set(
      mapVisualColor(tuning, "groundGrid", theme.outline),
    );
    this.material.uniforms.uFillOpacity!.value = tuning.groundFillOpacity;
    this.material.uniforms.uGridOpacity!.value = tuning.groundGridOpacity;
    this.material.depthWrite = tuning.groundFillOpacity >= 0.999;
  }

  applyTuning(theme: DigitalTwinMapTheme, tuning: MapVisualTuning) {
    this.applyTheme(theme, tuning);
  }

  dispose() {
    this.root.removeFromParent();
    this.owner.dispose();
  }
}
