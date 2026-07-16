import { gsap } from "gsap";
import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { digitalTwinMotion } from "../motion";
import type { MapCameraView } from "../types";

interface CameraTweenValues {
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  fov: number;
  rootX: number;
}

interface MapCameraTransitionOptions {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  mapRoot: THREE.Group;
  requestRender: () => void;
  requestHighFrameRate: (duration?: number) => void;
}

export class MapCameraTransition {
  private tween?: gsap.core.Tween;

  constructor(private readonly options: MapCameraTransitionOptions) {}

  getView(): MapCameraView {
    const { camera, controls } = this.options;
    return {
      fov: camera.fov,
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [controls.target.x, controls.target.y, controls.target.z],
    };
  }

  apply(view: MapCameraView, rootX: number) {
    this.cancel();
    const values: CameraTweenValues = {
      cameraX: view.position[0],
      cameraY: view.position[1],
      cameraZ: view.position[2],
      targetX: view.target[0],
      targetY: view.target[1],
      targetZ: view.target[2],
      fov: view.fov,
      rootX,
    };
    this.applyValues(values);
    const dampingEnabled = this.options.controls.enableDamping;
    this.options.controls.enableDamping = false;
    this.options.controls.update();
    this.applyValues(values);
    this.options.controls.update();
    this.options.controls.enableDamping = dampingEnabled;
  }

  animate(view: MapCameraView, rootX: number, motionEnabled: boolean): Promise<void> {
    this.cancel();
    if (!motionEnabled) {
      this.apply(view, rootX);
      return Promise.resolve();
    }

    const { camera, controls, mapRoot } = this.options;
    const values: CameraTweenValues = {
      cameraX: camera.position.x,
      cameraY: camera.position.y,
      cameraZ: camera.position.z,
      targetX: controls.target.x,
      targetY: controls.target.y,
      targetZ: controls.target.z,
      fov: camera.fov,
      rootX: mapRoot.position.x,
    };
    const duration = digitalTwinMotion.cameraDuration;
    this.options.requestHighFrameRate(duration * 1000 + 200);
    return new Promise((resolve) => {
      const finish = () => {
        if (this.tween === tween) this.tween = undefined;
        this.options.requestRender();
        resolve();
      };
      const tween = gsap.to(values, {
        cameraX: view.position[0],
        cameraY: view.position[1],
        cameraZ: view.position[2],
        targetX: view.target[0],
        targetY: view.target[1],
        targetZ: view.target[2],
        fov: view.fov,
        rootX,
        duration,
        ease: digitalTwinMotion.cameraEase,
        overwrite: true,
        onUpdate: () => this.applyValues(values),
        onComplete: finish,
        onInterrupt: finish,
      });
      this.tween = tween;
    });
  }

  cancel() {
    this.tween?.kill();
    this.tween = undefined;
  }

  private applyValues(values: CameraTweenValues) {
    const { camera, controls, mapRoot, requestRender } = this.options;
    camera.position.set(values.cameraX, values.cameraY, values.cameraZ);
    controls.target.set(values.targetX, values.targetY, values.targetZ);
    camera.fov = values.fov;
    mapRoot.position.x = values.rootX;
    camera.updateProjectionMatrix();
    requestRender();
  }
}
