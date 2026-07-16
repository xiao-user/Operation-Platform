import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { rongchengEducationLocations } from "../education-locations";
import { boundaryFeatureForMapState, initialMapState } from "../map-data-adapter";
import { getDigitalTwinMapTheme } from "../map-themes";
import { AmbientEffectsLayer } from "../rendering/ambient-effects-layer";
import { ConnectionLayer } from "../rendering/connection-layer";
import { InstitutionLayer } from "../rendering/institution-layer";
import { createMapProjection, largestOuterRingOfFeature } from "../rendering/map-projection";
import { RegionLayer } from "../rendering/region-layer";
import { defaultMapVisualTuning } from "../rendering/map-visual-tuning";
import {
  anchorDynamicOverlay,
  compensateTransitionTargetX,
  scopeFramingX,
} from "../rendering/regional-map-engine";
import { ResourceOwner } from "../rendering/resource-owner";
import type { EducationLocation } from "../types";

const theme = getDigitalTwinMapTheme("lime");
const projection = createMapProjection(initialMapState.geoData, 860, 520, 30);

function createLargeLocationSet(count: number): EducationLocation[] {
  const bureau = rongchengEducationLocations[0]!;
  const school = rongchengEducationLocations[1]!;
  return [
    bureau,
    ...Array.from({ length: count }, (_, index) => ({
      ...school,
      id: `school-${index}`,
      name: `学校 ${index}`,
      coordinate: [
        school.coordinate[0] + (index % 20) * 0.0001,
        school.coordinate[1] + Math.floor(index / 20) * 0.0001,
      ] as const,
    })),
  ];
}

describe("regional map render budget", () => {
  it("keeps scope framing continuous until the camera transition takes ownership", () => {
    const districtRootX = scopeFramingX({ scope: "district" }, defaultMapVisualTuning);
    const townshipRootX = scopeFramingX({ scope: "township" }, defaultMapVisualTuning);

    expect(districtRootX).toBe(-108);
    expect(townshipRootX).toBe(-60);
    expect(compensateTransitionTargetX(120, districtRootX, townshipRootX)).toBe(168);
    expect(compensateTransitionTargetX(168, townshipRootX, districtRootX)).toBe(120);
  });

  it("anchors points and connections above the active focused surface", () => {
    const connectionRoot = new THREE.Group();
    const institutionRoot = new THREE.Group();
    const focusedSurfaceZ = 74;

    anchorDynamicOverlay(connectionRoot, focusedSurfaceZ, 60);
    anchorDynamicOverlay(institutionRoot, focusedSurfaceZ, 70);

    expect(connectionRoot.position.z).toBe(30);
    expect(institutionRoot.position.z).toBe(30);
    expect(connectionRoot.renderOrder).toBeGreaterThan(40);
    expect(institutionRoot.renderOrder).toBeGreaterThan(connectionRoot.renderOrder);
  });

  it("keeps institution and connection draw objects constant as schools grow", () => {
    const locations = createLargeLocationSet(500);
    const institutions = new InstitutionLayer(locations, projection, theme, locations[0]?.id, 1);
    const connections = new ConnectionLayer(locations, projection, theme);
    const points: THREE.Points[] = [];
    const labels: CSS2DObject[] = [];
    institutions.root.traverse((object) => {
      if (object instanceof THREE.Points) points.push(object);
      if (object instanceof CSS2DObject) labels.push(object);
    });

    expect(points).toHaveLength(1);
    expect(labels.length).toBeLessThanOrEqual(2);
    expect(connections.root.children).toHaveLength(2);

    institutions.dispose();
    connections.dispose();
  });

  it("matches institution hit testing to the marker's screen-space radius", () => {
    const locations = rongchengEducationLocations.slice(0, 3);
    const institutions = new InstitutionLayer(locations, projection, theme, undefined, 1);
    const camera = new THREE.PerspectiveCamera(31, 1, 1, 2400);
    camera.position.set(0, 0, 1000);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    institutions.root.updateMatrixWorld(true);
    const points = institutions.root.children.find(
      (object): object is THREE.Points => object instanceof THREE.Points,
    )!;
    const position = new THREE.Vector3().fromBufferAttribute(
      points.geometry.getAttribute("position"),
      1,
    ).project(camera);
    const viewport = { width: 1000, height: 1000 };

    expect(institutions.hitScreenPoint(
      new THREE.Vector2(position.x, position.y),
      camera,
      viewport,
    )?.id).toBe(locations[1]?.id);
    expect(institutions.hitScreenPoint(
      new THREE.Vector2(position.x + 22 / viewport.width, position.y),
      camera,
      viewport,
    )?.id).toBe(locations[1]?.id);
    expect(institutions.hitScreenPoint(
      new THREE.Vector2(position.x + 26 / viewport.width, position.y),
      camera,
      viewport,
    )).toBeUndefined();

    institutions.dispose();
  });

  it("batches chase light and HUD ticks into constant draw objects", () => {
    const effects = new AmbientEffectsLayer(
      largestOuterRingOfFeature(boundaryFeatureForMapState(initialMapState)),
      projection,
      theme,
      defaultMapVisualTuning,
      45.5,
    );
    expect(effects.root.children).toHaveLength(3);
    effects.dispose();
  });

  it("updates a theme without rebuilding administrative geometry", () => {
    const textures = {
      diffuse: new THREE.Texture(),
      normal: new THREE.Texture(),
      roughness: new THREE.Texture(),
      dispose: vi.fn(),
    };
    const regions = new RegionLayer(
      initialMapState,
      projection,
      theme,
      textures,
      defaultMapVisualTuning,
    );
    const geometryIdsBefore: number[] = [];
    const geometryIdsAfter: number[] = [];
    regions.root.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        geometryIdsBefore.push(object.geometry.id);
      }
    });

    regions.applyTheme(getDigitalTwinMapTheme("cyan"));
    regions.root.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        geometryIdsAfter.push(object.geometry.id);
      }
    });

    expect(geometryIdsAfter).toEqual(geometryIdsBefore);
    regions.dispose();
    textures.diffuse.dispose();
    textures.normal.dispose();
    textures.roughness.dispose();
  });

  it("flattens non-focused townships while preserving the focused 3D region", () => {
    const textures = {
      diffuse: new THREE.Texture(),
      normal: new THREE.Texture(),
      roughness: new THREE.Texture(),
      dispose: vi.fn(),
    };
    const regions = new RegionLayer(
      initialMapState,
      projection,
      theme,
      textures,
      defaultMapVisualTuning,
    );
    regions.setFocus("445202001", defaultMapVisualTuning);
    for (let index = 0; index < 100; index += 1) regions.animate();
    const groups = regions.root.children.filter(
      (object): object is THREE.Group => object instanceof THREE.Group,
    );
    const active = groups.find(
      (group) => group.userData.feature?.properties?.code === "445202001",
    );
    const inactive = groups.find(
      (group) => group.userData.feature?.properties?.code !== "445202001",
    );

    expect(active?.scale.z).toBeCloseTo(defaultMapVisualTuning.townshipFocusThickness / 22, 3);
    expect(active?.position.z).toBeCloseTo(defaultMapVisualTuning.townshipFocusLift, 2);
    expect(inactive?.scale.z).toBeCloseTo(defaultMapVisualTuning.townshipSiblingThickness / 22, 3);
    expect(active?.renderOrder).toBeGreaterThan(inactive?.renderOrder ?? 0);

    regions.setHovered(inactive);
    for (let index = 0; index < 100; index += 1) regions.animate();
    expect(inactive?.scale.z).toBeCloseTo(
      defaultMapVisualTuning.townshipSiblingHoverThickness / 22,
      3,
    );
    expect(inactive?.position.z).toBeCloseTo(
      defaultMapVisualTuning.townshipSiblingBaseZ
        + defaultMapVisualTuning.townshipSiblingHoverLift,
      2,
    );
    expect(inactive?.renderOrder).toBeGreaterThan(20);

    regions.dispose();
    textures.diffuse.dispose();
    textures.normal.dispose();
    textures.roughness.dispose();
  });

  it("keeps region elevation continuous and frame-rate independent", () => {
    const makeRegions = () => {
      const textures = {
        diffuse: new THREE.Texture(),
        normal: new THREE.Texture(),
        roughness: new THREE.Texture(),
        dispose: vi.fn(),
      };
      return {
        textures,
        regions: new RegionLayer(
          initialMapState,
          projection,
          theme,
          textures,
          defaultMapVisualTuning,
        ),
      };
    };
    const thirtyFps = makeRegions();
    const sixtyFps = makeRegions();
    const raisedFocusTuning = {
      ...defaultMapVisualTuning,
      townshipFocusLift: 18,
    };
    const initialSurface = thirtyFps.regions.getCurrentActiveSurfaceZ();
    thirtyFps.regions.setFocus("445202001", raisedFocusTuning);
    sixtyFps.regions.setFocus("445202001", raisedFocusTuning);

    expect(thirtyFps.regions.getCurrentActiveSurfaceZ()).toBe(initialSurface);
    for (let index = 0; index < 30; index += 1) thirtyFps.regions.animate(1 / 30);
    for (let index = 0; index < 60; index += 1) sixtyFps.regions.animate(1 / 60);

    expect(thirtyFps.regions.getCurrentActiveSurfaceZ()).toBeGreaterThan(initialSurface);
    expect(thirtyFps.regions.getCurrentActiveSurfaceZ()).toBeCloseTo(
      sixtyFps.regions.getCurrentActiveSurfaceZ(),
      4,
    );

    for (const entry of [thirtyFps, sixtyFps]) {
      entry.regions.dispose();
      entry.textures.diffuse.dispose();
      entry.textures.normal.dispose();
      entry.textures.roughness.dispose();
    }
  });

  it("disposes shared resources exactly once", () => {
    const owner = new ResourceOwner();
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.MeshBasicMaterial();
    const texture = new THREE.Texture();
    const geometryDispose = vi.spyOn(geometry, "dispose");
    const materialDispose = vi.spyOn(material, "dispose");
    const textureDispose = vi.spyOn(texture, "dispose");

    owner.geometry(geometry);
    owner.geometry(geometry);
    owner.material(material);
    owner.material(material);
    owner.texture(texture);
    owner.texture(texture);
    owner.dispose();
    owner.dispose();

    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
    expect(textureDispose).toHaveBeenCalledTimes(1);
  });
});
