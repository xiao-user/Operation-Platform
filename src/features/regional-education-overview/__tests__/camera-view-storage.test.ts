import { beforeEach, describe, expect, it } from "vitest";
import { createCameraViewStorage } from "../camera-view-storage";
import type { MapCameraView } from "../types";

const key = "test:regional-map-camera";
const view: MapCameraView = {
  fov: 31,
  position: [34, -760, 520],
  target: [-16, -42, 8],
};

describe("regional map camera view storage", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips a defensive camera snapshot", () => {
    const storage = createCameraViewStorage(window.localStorage, key);
    storage.save(view);
    const restored = storage.read();

    expect(restored).toEqual(view);
    expect(restored).not.toBe(view);
    expect(restored?.position).not.toBe(view.position);
    expect(restored?.target).not.toBe(view.target);
  });

  it("rejects malformed or non-finite saved camera data", () => {
    const storage = createCameraViewStorage(window.localStorage, key);
    window.localStorage.setItem(key, JSON.stringify({ ...view, fov: Number.NaN }));
    expect(storage.read()).toBeUndefined();
    window.localStorage.setItem(key, "not-json");
    expect(storage.read()).toBeUndefined();
  });

  it("rejects finite camera data outside the renderer's safe operating range", () => {
    const storage = createCameraViewStorage(window.localStorage, key);
    for (const invalidView of [
      { ...view, fov: 0 },
      { ...view, fov: 180 },
      { ...view, position: [100_000, 0, 0] },
      { ...view, position: [...view.target] },
    ]) {
      window.localStorage.setItem(key, JSON.stringify(invalidView));
      expect(storage.read()).toBeUndefined();
    }
  });

  it("clears a saved camera view", () => {
    const storage = createCameraViewStorage(window.localStorage, key);
    storage.save(view);
    storage.clear();
    expect(storage.read()).toBeUndefined();
  });
});
