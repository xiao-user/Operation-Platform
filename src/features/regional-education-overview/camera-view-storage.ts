import type { MapCameraView } from "./types";

export interface CameraViewStorage {
  read: () => MapCameraView | undefined;
  save: (view: MapCameraView) => void;
  clear: () => void;
}

const cameraViewLimits = {
  minimumFov: 10,
  maximumFov: 90,
  maximumCoordinateMagnitude: 10_000,
  minimumViewDistance: 0.001,
} as const;

function isFiniteCameraVector(value: unknown): value is [number, number, number] {
  return Array.isArray(value)
    && value.length === 3
    && value.every((item) => typeof item === "number"
      && Number.isFinite(item)
      && Math.abs(item) <= cameraViewLimits.maximumCoordinateMagnitude);
}

function isMapCameraView(value: unknown): value is MapCameraView {
  const candidate = value as Partial<MapCameraView> | undefined;
  if (!candidate
    || typeof candidate.fov !== "number"
    || !Number.isFinite(candidate.fov)
    || candidate.fov < cameraViewLimits.minimumFov
    || candidate.fov > cameraViewLimits.maximumFov
    || !isFiniteCameraVector(candidate.position)
    || !isFiniteCameraVector(candidate.target)) return false;
  const distance = Math.hypot(
    candidate.position[0] - candidate.target[0],
    candidate.position[1] - candidate.target[1],
    candidate.position[2] - candidate.target[2],
  );
  return distance >= cameraViewLimits.minimumViewDistance;
}

function cloneCameraView(view: MapCameraView): MapCameraView {
  return {
    fov: view.fov,
    position: [...view.position],
    target: [...view.target],
  };
}

export function createCameraViewStorage(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
  key: string,
): CameraViewStorage {
  return {
    read() {
      try {
        const stored = storage.getItem(key);
        if (!stored) return undefined;
        const parsed: unknown = JSON.parse(stored);
        return isMapCameraView(parsed) ? cloneCameraView(parsed) : undefined;
      } catch {
        return undefined;
      }
    },
    save(view) {
      try {
        storage.setItem(key, JSON.stringify(cloneCameraView(view)));
      } catch {
        // Camera persistence is optional and must not break map interaction.
      }
    },
    clear() {
      try {
        storage.removeItem(key);
      } catch {
        // Reset still applies the built-in camera when storage is unavailable.
      }
    },
  };
}
