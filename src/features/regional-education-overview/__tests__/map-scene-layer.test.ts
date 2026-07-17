import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import {
  disposeMapSceneLayers,
  type MapSceneLayer,
} from "../rendering/map-scene-layer";

function createLayer() {
  return {
    root: new THREE.Group(),
    dispose: vi.fn<() => void>(),
  } satisfies MapSceneLayer;
}

describe("map scene layer lifecycle", () => {
  it("disposes each defined layer identity once per batch", () => {
    const first = createLayer();
    const second = createLayer();

    disposeMapSceneLayers([first, undefined, second, first]);

    expect(first.dispose).toHaveBeenCalledOnce();
    expect(second.dispose).toHaveBeenCalledOnce();
  });
});
