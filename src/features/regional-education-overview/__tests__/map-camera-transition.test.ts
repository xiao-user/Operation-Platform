import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { MapCameraTransition } from "../rendering/map-camera-transition";
import type { MapCameraView } from "../types";

function createTransition() {
  const camera = new THREE.PerspectiveCamera(31, 1, 1, 2400);
  camera.position.set(0, -700, 500);
  const controls = {
    target: new THREE.Vector3(0, 0, 0),
    update: vi.fn(),
  } as unknown as OrbitControls;
  const requestRender = vi.fn();
  const requestHighFrameRate = vi.fn();
  let framing = { x: 12, y: -8 };
  return {
    camera,
    controls,
    getFraming: () => framing,
    requestRender,
    requestHighFrameRate,
    transition: new MapCameraTransition({
      camera,
      controls,
      getFraming: () => framing,
      applyFraming: (next) => { framing = next; },
      requestRender,
      requestHighFrameRate,
    }),
  };
}

const targetView: MapCameraView = {
  fov: 36,
  position: [20, -520, 360],
  target: [-30, 18, 12],
};

describe("MapCameraTransition", () => {
  it("applies a reduced-motion view atomically", async () => {
    const context = createTransition();

    await context.transition.animate(targetView, { x: -108, y: -30 }, false);

    expect(context.transition.getView()).toEqual(targetView);
    expect(context.getFraming()).toEqual({ x: -108, y: -30 });
    expect(context.requestHighFrameRate).not.toHaveBeenCalled();
  });

  it("settles an interrupted transition promise so navigation cannot deadlock", async () => {
    const context = createTransition();
    const completion = context.transition.animate(targetView, { x: -108, y: -30 }, true);

    expect(context.getFraming()).toEqual({ x: 12, y: -8 });
    context.transition.cancel();

    await expect(completion).resolves.toBeUndefined();
    expect(context.requestHighFrameRate).toHaveBeenCalledOnce();
  });
});
