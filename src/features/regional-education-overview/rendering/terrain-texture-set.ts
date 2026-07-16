import * as THREE from "three";
import { ResourceOwner } from "./resource-owner";

export interface TerrainTextureSet {
  diffuse: THREE.Texture;
  normal: THREE.Texture;
  roughness: THREE.Texture;
  dispose: () => void;
}

function seededNoise(x: number, y: number) {
  const value = Math.sin(x * 12.9898 + y * 78.233) * 43_758.5453;
  return value - Math.floor(value);
}

function smoothedNoise(x: number, y: number) {
  return (
    seededNoise(x, y) * 0.5
    + seededNoise(Math.floor(x / 4), Math.floor(y / 4)) * 0.32
    + seededNoise(Math.floor(x / 13), Math.floor(y / 13)) * 0.18
  );
}

function createTextureCanvas(
  size: number,
  writePixel: (data: Uint8ClampedArray, offset: number, x: number, y: number) => void,
) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is required to create terrain textures");
  const image = context.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      writePixel(image.data, offset, x, y);
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

export function createTerrainTextureSet(renderer: THREE.WebGLRenderer): TerrainTextureSet {
  const owner = new ResourceOwner();
  const size = 256;
  const heights = new Float32Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) heights[y * size + x] = smoothedNoise(x, y);
  }
  const heightAt = (x: number, y: number) => {
    const wrappedX = (x + size) % size;
    const wrappedY = (y + size) % size;
    return heights[wrappedY * size + wrappedX] ?? 0;
  };
  const diffuse = owner.texture(new THREE.CanvasTexture(createTextureCanvas(size, (data, offset, x, y) => {
    const noise = heightAt(x, y);
    const vein = Math.sin((x + y * 0.35) * 0.09) * 0.5 + 0.5;
    data[offset] = Math.round(13 + noise * 22 + vein * 5);
    data[offset + 1] = Math.round(19 + noise * 28 + vein * 7);
    data[offset + 2] = Math.round(17 + noise * 20);
  })));
  const normal = owner.texture(new THREE.CanvasTexture(createTextureCanvas(size, (data, offset, x, y) => {
    const normalX = (heightAt(x - 1, y) - heightAt(x + 1, y)) * 2.4;
    const normalY = (heightAt(x, y - 1) - heightAt(x, y + 1)) * 2.4;
    const inverseLength = 1 / Math.hypot(normalX, normalY, 1);
    data[offset] = Math.round((normalX * inverseLength * 0.5 + 0.5) * 255);
    data[offset + 1] = Math.round((normalY * inverseLength * 0.5 + 0.5) * 255);
    data[offset + 2] = Math.round((inverseLength * 0.5 + 0.5) * 255);
  })));
  const roughness = owner.texture(new THREE.CanvasTexture(createTextureCanvas(size, (data, offset, x, y) => {
    const value = Math.round(205 + heightAt(x, y) * 42);
    data[offset] = value;
    data[offset + 1] = value;
    data[offset + 2] = value;
  })));
  const maximumAnisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

  for (const texture of [diffuse, normal, roughness]) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2.8, 2.15);
    texture.offset.set(0.07, 0.11);
    texture.rotation = -0.08;
    texture.center.set(0.5, 0.5);
    texture.anisotropy = maximumAnisotropy;
    texture.needsUpdate = true;
  }
  diffuse.colorSpace = THREE.SRGBColorSpace;

  return { diffuse, normal, roughness, dispose: () => owner.dispose() };
}
