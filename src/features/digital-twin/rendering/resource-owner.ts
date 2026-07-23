import * as THREE from "three";

export class ResourceOwner {
  private readonly geometries = new Set<THREE.BufferGeometry>();
  private readonly materials = new Set<THREE.Material>();
  private readonly textures = new Set<THREE.Texture>();

  geometry<T extends THREE.BufferGeometry>(geometry: T) {
    this.geometries.add(geometry);
    return geometry;
  }

  material<T extends THREE.Material>(material: T) {
    this.materials.add(material);
    return material;
  }

  texture<T extends THREE.Texture>(texture: T) {
    this.textures.add(texture);
    return texture;
  }

  dispose() {
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    for (const texture of this.textures) texture.dispose();
    this.geometries.clear();
    this.materials.clear();
    this.textures.clear();
  }
}
