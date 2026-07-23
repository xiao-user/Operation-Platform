import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { rongchengEducationLocations } from "../education-locations";
import { buildEnergyTowerData } from "../energy-tower-data";
import {
  boundaryFeatureForMapState,
  filterLocationsForMapState,
  initialMapState,
  loadMapLevel,
  regionalContextGeoData,
} from "./rongcheng-map-fixture";
import { digitalTwinMapThemes, getDigitalTwinMapTheme } from "../map-themes";
import { AmbientEffectsLayer } from "../rendering/ambient-effects-layer";
import { ConnectionLayer } from "../rendering/connection-layer";
import {
  energyTowerDimensions,
  energyTowerHeight,
  energyTowerRenderOrder,
  energyTowerScopeScale,
  energyTowerValueBand,
  EnergyTowerLayer,
} from "../rendering/energy-tower-layer";
import {
  groundGridCellSize,
  groundGridFadeEnd,
  groundGridFadeStart,
  groundPlaneSize,
  GroundGridLayer,
} from "../rendering/ground-grid-layer";
import {
  dampInstitutionElevation,
  institutionMarkerElevation,
  institutionRippleFrame,
  InstitutionLayer,
} from "../rendering/institution-layer";
import {
  createMapProjection,
  featureVisualCenter,
  largestOuterRingOfFeature,
} from "../rendering/map-projection";
import { RegionLayer, regionTopZ } from "../rendering/region-layer";
import {
  RegionalContextLayer,
  regionalContextSurfaceZ,
} from "../rendering/regional-context-layer";
import { defaultMapVisualTuning } from "../rendering/map-visual-tuning";
import {
  anchorDynamicOverlay,
  mapScreenFraming,
  minimumCameraDistanceDuringScopeChange,
  resolveMapOrbitPivot,
  shouldRunMapAutoRotation,
  townshipFocusPositionZ,
  townshipFocusTargetZ,
  transitionsExternalPresentationToPeer,
  transitionsPeerPresentationToExternal,
} from "../rendering/regional-map-engine";
import { ResourceOwner } from "../rendering/resource-owner";
import type { GeoFeature } from "../geo";
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
  it("uses the interior geometry centroid for overlays and the orbit pivot", () => {
    const feature: GeoFeature = {
      type: "Feature",
      properties: {
        code: "visual-center",
        name: "视觉中心测试区",
        center: [1, 1],
        centroid: [5, 5],
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ]],
      },
    };
    const visualCenter = featureVisualCenter(feature);
    expect(visualCenter).toEqual([5, 5]);
    expect(visualCenter).not.toEqual(feature.properties.center);

    const geoData = { type: "FeatureCollection" as const, features: [feature] };
    const centerProjection = createMapProjection(geoData, 100, 100, 0);
    const mapRoot = new THREE.Group();
    const pivot = resolveMapOrbitPivot(
      {
        ...initialMapState,
        geoData,
        boundaryFeature: feature,
      },
      centerProjection,
      mapRoot,
      22,
    );
    expect(pivot?.distanceTo(centerProjection.projectPoint([5, 5], 22))).toBeCloseTo(0);
  });

  it("recognizes the same city geometry moving between peer and external bands", () => {
    const cities = regionalContextGeoData;
    const districts = initialMapState.geoData;
    const cityState = {
      ...initialMapState,
      scope: "city" as const,
      code: "445200",
      geoData: districts,
      contextGeoData: cities,
      contextPresentation: "peers" as const,
      terminal: false,
    };
    const districtState = {
      ...initialMapState,
      scope: "district" as const,
      externalGeoData: cities,
      terminal: true,
    };

    expect(transitionsPeerPresentationToExternal(cityState, districtState)).toBe(true);
    expect(transitionsExternalPresentationToPeer(districtState, cityState)).toBe(true);
    expect(transitionsPeerPresentationToExternal(cityState, {
      ...districtState,
      externalGeoData: { type: "FeatureCollection", features: [] },
    })).toBe(false);
  });

  it("maps larger grid school counts to taller township towers at a smaller near-view scale", () => {
    expect(energyTowerHeight(6, 6, "township")).toBeGreaterThan(
      energyTowerHeight(2, 6, "township"),
    );
    expect(energyTowerDimensions("township").radius).toBeLessThan(
      energyTowerDimensions("district").radius,
    );
    expect(energyTowerDimensions("township").maximumHeight).toBeLessThan(
      energyTowerDimensions("district").maximumHeight,
    );
  });

  it("keeps coverage towers readable across district and province population scales", () => {
    const dimensions = energyTowerDimensions("district");
    const districtHeight = energyTowerHeight(
      300_000,
      2_000_000,
      "district",
      defaultMapVisualTuning,
      10_000,
    );
    const largerDistrictHeight = energyTowerHeight(
      600_000,
      2_000_000,
      "district",
      defaultMapVisualTuning,
      10_000,
    );
    const provinceMaximumHeight = energyTowerHeight(
      2_000_000,
      2_000_000,
      "province",
      defaultMapVisualTuning,
      10_000,
    );

    expect(districtHeight).toBeGreaterThan(dimensions.minimumHeight);
    expect(largerDistrictHeight).toBeGreaterThan(districtHeight);
    expect(provinceMaximumHeight).toBe(dimensions.maximumHeight);
  });

  it("increases the visible height gap between coverage values without raising the maximum", () => {
    const maximumHeight = energyTowerHeight(
      1_300_000,
      1_300_000,
      "city",
      defaultMapVisualTuning,
      10_000,
      defaultMapVisualTuning.energyTowerCoverageHeightContrast,
    );
    const contrastedHeight = energyTowerHeight(
      600_000,
      1_300_000,
      "city",
      defaultMapVisualTuning,
      10_000,
      defaultMapVisualTuning.energyTowerCoverageHeightContrast,
    );
    const previousHeight = energyTowerHeight(
      600_000,
      1_300_000,
      "city",
      defaultMapVisualTuning,
      10_000,
      defaultMapVisualTuning.energyTowerHeightExponent,
    );

    expect(maximumHeight).toBe(energyTowerDimensions("city").maximumHeight);
    expect(maximumHeight - contrastedHeight).toBeGreaterThan(
      (maximumHeight - previousHeight) * 1.8,
    );
  });

  it("uses independently tunable coverage-tower dimensions for every administrative scope", () => {
    expect(energyTowerScopeScale("province")).toEqual({ height: 0.9, radius: 0.9 });
    expect(energyTowerScopeScale("city")).toEqual({ height: 0.8, radius: 0.34 });
    expect(energyTowerScopeScale("district")).toEqual({ height: 0.63, radius: 0.52 });
    expect(energyTowerScopeScale("township")).toEqual({ height: 0.82, radius: 0.86 });
    expect(energyTowerScopeScale("city", {
      ...defaultMapVisualTuning,
      energyTowerCityHeightScale: 0.45,
      energyTowerCityRadiusScale: 0.5,
    })).toEqual({ height: 0.45, radius: 0.5 });
  });

  it("resizes existing coverage towers in place while tuning a scope", () => {
    const energyTowerValues = Object.fromEntries(
      initialMapState.geoData.features.flatMap((feature) => {
        const code = feature.properties.code;
        return typeof code === "string" ? [[code, 100_000]] : [];
      }),
    );
    const layer = new EnergyTowerLayer(
      {
        ...initialMapState,
        energyTowerMetric: "coverage-population",
        energyTowerValues,
      },
      [],
      projection,
      theme,
      defaultMapVisualTuning,
    );
    const firstTower = layer.root.children[0] as THREE.Group;
    const towerId = firstTower.uuid;

    layer.settle(true);
    expect(firstTower.scale.toArray()).toEqual([0.52, 0.52, 0.63]);

    layer.applyTuning(theme, {
      ...defaultMapVisualTuning,
      energyTowerDistrictHeightScale: 0.49,
      energyTowerDistrictRadiusScale: 0.51,
      energyTowerCoverageHeightContrast: 3,
    });

    expect(firstTower.uuid).toBe(towerId);
    expect(firstTower.scale.x).toBe(0.51);
    expect(firstTower.scale.y).toBe(0.51);
    expect(firstTower.scale.z).toBeGreaterThan(0);
    expect(firstTower.scale.z).toBeLessThanOrEqual(0.49);
    layer.dispose();
  });

  it("classifies tower counts into relative low, medium, and high bands", () => {
    expect(energyTowerValueBand(2, 2, 8)).toBe("low");
    expect(energyTowerValueBand(4.5, 2, 8)).toBe("medium");
    expect(energyTowerValueBand(8, 2, 8)).toBe("high");
    expect(energyTowerValueBand(3, 3, 3)).toBe("low");
  });

  it("keeps screen framing separate from the geographic orbit pivot", () => {
    expect(mapScreenFraming({ scope: "district" }, defaultMapVisualTuning)).toEqual({
      x: -220,
      y: -30,
    });
    expect(mapScreenFraming({ scope: "township" }, defaultMapVisualTuning)).toEqual({
      x: -160,
      y: 0,
    });

    const mapRoot = new THREE.Group();
    mapRoot.position.set(36, -28, -24);
    mapRoot.rotation.z = 0.21;
    mapRoot.scale.setScalar(0.8);
    const districtBoundary = boundaryFeatureForMapState(initialMapState);
    expect(districtBoundary).toBeDefined();
    const center = featureVisualCenter(districtBoundary!)!;
    const expected = mapRoot.localToWorld(
      projection.projectPoint(center, regionTopZ),
    );
    const pivot = resolveMapOrbitPivot(
      initialMapState,
      projection,
      mapRoot,
      regionTopZ,
    );

    expect(pivot?.distanceTo(expected)).toBeLessThan(0.000_001);
    expect(pivot?.x).not.toBe(defaultMapVisualTuning.cameraTargetX);
  });

  it("keeps return constraints stable and only resets camera Z on parent drilldown", () => {
    expect(minimumCameraDistanceDuringScopeChange("township", "district")).toBe(280);
    expect(minimumCameraDistanceDuringScopeChange("district", "district")).toBe(480);
    expect(townshipFocusPositionZ(true, 146, defaultMapVisualTuning)).toBe(80);
    expect(townshipFocusPositionZ(false, 146, defaultMapVisualTuning)).toBe(146);
  });

  it("uses the configured focus Z only for township energy towers", () => {
    expect(townshipFocusTargetZ("energy-towers", 12, defaultMapVisualTuning)).toBe(32);
    expect(townshipFocusTargetZ("institutions", 12, defaultMapVisualTuning)).toBe(12);
  });

  it("resumes planar auto rotation only after controls have been idle", () => {
    expect(shouldRunMapAutoRotation(true, true, false, 10_000, 10_000)).toBe(true);
    expect(shouldRunMapAutoRotation(true, true, false, 9_999, 10_000)).toBe(false);
    expect(shouldRunMapAutoRotation(true, true, true, 12_000, 10_000)).toBe(false);
    expect(shouldRunMapAutoRotation(true, false, false, 12_000, 10_000)).toBe(false);
    expect(shouldRunMapAutoRotation(false, true, false, 12_000, 10_000)).toBe(false);
  });

  it("keeps the geographic pivot fixed on screen during Z-up orbit rotation", () => {
    const camera = new THREE.PerspectiveCamera(30, 1.5, 1, 2400);
    camera.up.set(0, 0, 1);
    camera.position.set(50, -700, 500);
    camera.setViewOffset(1200, 800, 108, -30, 1200, 800);
    const controls = new OrbitControls(camera, document.createElement("canvas"));
    const pivot = new THREE.Vector3(-8, 28, 11);
    controls.target.copy(pivot);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.2;
    controls.update(1);
    camera.updateMatrixWorld();
    const screenPositionBefore = pivot.clone().project(camera);
    const cameraZBefore = camera.position.z;
    const distanceBefore = camera.position.distanceTo(pivot);

    controls.update(1);
    camera.updateMatrixWorld();

    const screenPositionAfter = pivot.clone().project(camera);
    expect(controls.target.distanceTo(pivot)).toBeLessThan(0.000_001);
    expect(camera.position.z).toBeCloseTo(cameraZBefore, 6);
    expect(camera.position.distanceTo(pivot)).toBeCloseTo(distanceBefore, 6);
    expect(screenPositionAfter.x).toBeCloseTo(screenPositionBefore.x, 6);
    expect(screenPositionAfter.y).toBeCloseTo(screenPositionBefore.y, 6);
    controls.dispose();
  });

  it("starts bureau ripples at zero scale and hides both ends of every cycle", () => {
    const tuning = {
      institutionRippleSpeed: 1,
      institutionRippleStartScale: 0,
      institutionRippleScaleRange: 1.45,
    };

    expect(institutionRippleFrame(0, 0, tuning)).toEqual({ scale: 0, opacity: 0 });
    expect(institutionRippleFrame(0.25, 0.5, tuning)).toEqual({ scale: 0, opacity: 0 });
    expect(institutionRippleFrame(0.5, 0, tuning)).toMatchObject({ scale: 0.725 });
    expect(institutionRippleFrame(0.5, 0, tuning).opacity).toBeGreaterThan(0);
    expect(institutionRippleFrame(0.999, 0, tuning).opacity).toBeLessThan(0.001);
    expect(institutionRippleFrame(1, 0, tuning)).toEqual({ scale: 0, opacity: 0 });
  });

  it("uses scope-aware marker heights and dampens selected-school transitions", () => {
    expect(institutionMarkerElevation(
      "primary",
      false,
      "district",
      defaultMapVisualTuning,
    )).toBe(24);
    expect(institutionMarkerElevation(
      "primary",
      false,
      "township",
      defaultMapVisualTuning,
    )).toBe(14);
    expect(institutionMarkerElevation(
      "primary",
      true,
      "township",
      defaultMapVisualTuning,
    )).toBeCloseTo(34.3);
    expect(institutionMarkerElevation(
      "bureau",
      true,
      "district",
      defaultMapVisualTuning,
    )).toBe(64);
    const firstFrame = dampInstitutionElevation(14, 34.3, 1 / 60, 8);
    expect(firstFrame).toBeGreaterThan(14);
    expect(firstFrame).toBeLessThan(34.3);
    expect(dampInstitutionElevation(34.299, 34.3, 1 / 60, 8)).toBe(34.3);
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

  it("depth-tests external context outlines against the active map surface", () => {
    const context = new RegionalContextLayer(
      regionalContextGeoData,
      projection,
      theme,
      defaultMapVisualTuning,
    );
    const lineMaterials: THREE.LineBasicMaterial[] = [];
    context.root.traverse((object) => {
      if (object instanceof THREE.Line && object.material instanceof THREE.LineBasicMaterial) {
        lineMaterials.push(object.material);
      }
    });

    expect(lineMaterials.length).toBeGreaterThan(0);
    expect(lineMaterials.every((material) => material.depthTest)).toBe(true);
    expect(lineMaterials.every((material) => !material.depthWrite)).toBe(true);
    context.dispose();
  });

  it("keeps external context regions available for raycast sibling navigation", () => {
    const feature = regionalContextGeoData.features[0]!;
    const center = featureVisualCenter(feature)!;
    const context = new RegionalContextLayer(
      regionalContextGeoData,
      projection,
      theme,
      defaultMapVisualTuning,
    );
    const raycaster = new THREE.Raycaster(
      projection.projectPoint(center, 100),
      new THREE.Vector3(0, 0, -1),
    );
    context.root.updateMatrixWorld(true);

    expect(context.hit(raycaster)?.feature).toBe(feature);
    const labelObject = context.root.children.find(
      (object): object is CSS2DObject => (
        object instanceof CSS2DObject
        && object.element.textContent === feature.properties.name
      ),
    )!;
    const labelWorldPosition = labelObject.getWorldPosition(new THREE.Vector3());
    const labelCamera = new THREE.PerspectiveCamera(30, 1.5, 1, 2400);
    labelCamera.up.set(0, 0, 1);
    labelCamera.position.copy(labelWorldPosition).add(new THREE.Vector3(0, -180, 140));
    labelCamera.lookAt(labelWorldPosition);
    labelCamera.updateMatrixWorld(true);
    labelCamera.updateProjectionMatrix();
    const labelPointer = labelWorldPosition.clone().project(labelCamera);
    expect(labelObject.element.classList.contains("is-visible")).toBe(false);
    expect(context.hitLabel(
      new THREE.Vector2(labelPointer.x, labelPointer.y),
      labelCamera,
      { width: 1200, height: 800 },
    )?.feature).toBe(feature);
    context.setHovered(feature);
    expect(labelObject.element.classList.contains("is-visible")).toBe(true);
    const hoverMaterials: THREE.MeshBasicMaterial[] = [];
    context.root.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshBasicMaterial) {
        if (object.material.opacity > 0 && object.position.z > 12) hoverMaterials.push(object.material);
      }
    });
    expect(hoverMaterials.length).toBeGreaterThan(0);
    context.setHovered();
    expect(labelObject.element.classList.contains("is-visible")).toBe(false);
    context.dispose();
  });

  it("cross-fades external outlines without rebuilding their geometry", () => {
    const context = new RegionalContextLayer(
      regionalContextGeoData,
      projection,
      theme,
      defaultMapVisualTuning,
    );
    const geometryIds: number[] = [];
    context.root.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        geometryIds.push(object.geometry.id);
      }
    });

    context.setPresentationOpacity(0);
    for (let index = 0; index < 90; index += 1) context.animate(1 / 60);
    expect(context.isPresentationHidden()).toBe(true);

    context.setPresentationOpacity(1);
    for (let index = 0; index < 90; index += 1) context.animate(1 / 60);
    expect(context.isPresentationHidden()).toBe(false);
    const geometryIdsAfterReveal: number[] = [];
    context.root.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        geometryIdsAfterReveal.push(object.geometry.id);
      }
    });
    expect(geometryIdsAfterReveal).toEqual(geometryIds);
    context.dispose();
  });

  it("keeps institution and connection draw objects constant as schools grow", () => {
    const locations = createLargeLocationSet(500);
    const materialTuning = {
      ...defaultMapVisualTuning,
      institutionPointSize: 21,
      institutionEmphasisPointSize: 27,
      institutionDefaultOpacity: 0.58,
      institutionSelectedOpacity: 0.96,
      connectionBaseOpacity: 0.13,
      connectionFlowSpeed: 0.31,
      connectionPulseWidth: 0.12,
      connectionSurfaceOffset: 1.8,
    };
    const institutions = new InstitutionLayer(
      locations,
      projection,
      theme,
      locations[0]?.id,
      1,
      materialTuning,
    );
    const connections = new ConnectionLayer(locations, projection, theme, materialTuning);
    const points: THREE.Points[] = [];
    const stems: THREE.LineSegments[] = [];
    const labels: CSS2DObject[] = [];
    institutions.root.traverse((object) => {
      if (object instanceof THREE.Points) points.push(object);
      if (object instanceof THREE.LineSegments) stems.push(object);
      if (object instanceof CSS2DObject) labels.push(object);
    });

    expect(points).toHaveLength(1);
    expect(stems).toHaveLength(1);
    expect(stems[0]?.geometry.getAttribute("position").count).toBe(locations.length * 2);
    expect(labels.length).toBeLessThanOrEqual(2);
    expect(connections.root.children).toHaveLength(2);
    const pointMaterial = points[0]?.material as THREE.ShaderMaterial;
    expect(pointMaterial.uniforms.uPointSize?.value).toBeCloseTo(
      21 * defaultMapVisualTuning.institutionDistrictPointScale,
    );
    expect(pointMaterial.uniforms.uEmphasisPointSize?.value).toBe(27);
    expect(pointMaterial.uniforms.uBureauPointSize?.value)
      .toBe(defaultMapVisualTuning.institutionBureauPointSize);
    expect(pointMaterial.fragmentShader)
      .toContain("float schoolRing = ring * threeSegmentMask");
    expect(pointMaterial.fragmentShader).toContain("float bureauSignal = max");
    expect(pointMaterial.uniforms.uDefaultOpacity?.value).toBe(0.58);
    expect(pointMaterial.uniforms.uSelectedOpacity?.value).toBe(0.96);
    const stemMaterial = stems[0]!.material as THREE.ShaderMaterial;
    expect(stemMaterial.uniforms.uDefaultOpacity?.value).toBe(0.58);
    expect(stemMaterial.uniforms.uSelectedOpacity?.value).toBe(0.96);
    const connectionBase = (connections.root.children[0] as THREE.LineSegments)
      .material as THREE.LineBasicMaterial;
    const connectionFlow = (connections.root.children[1] as THREE.LineSegments)
      .material as THREE.ShaderMaterial;
    expect(connectionBase.opacity).toBe(0);
    expect(connectionFlow.uniforms.speed?.value).toBe(0.31);
    expect(connectionFlow.uniforms.pulseWidth?.value).toBe(0.12);
    const connectionPositions = (connections.root.children[0] as THREE.LineSegments)
      .geometry.getAttribute("position");
    expect(connectionPositions.getZ(0)).toBeCloseTo(regionTopZ + 1.8);
    connections.animate(1, 1 / 60);
    expect(connectionBase.opacity).toBeGreaterThan(0);
    expect(connectionBase.opacity).toBeLessThan(0.76 * 0.13);
    connections.settle();
    expect(connectionBase.opacity).toBeCloseTo(0.76 * 0.13);

    institutions.dispose();
    connections.dispose();
  });

  it("uses each theme's scatter color for selected school beacons", () => {
    const locations = rongchengEducationLocations.slice(0, 3);
    const selectedIndex = locations.findIndex((location) => location.type !== "bureau");
    const selected = locations[selectedIndex]!;
    const spectrum = getDigitalTwinMapTheme("spectrum");
    const institutions = new InstitutionLayer(
      locations,
      projection,
      spectrum,
      selected.id,
      1,
      defaultMapVisualTuning,
    );
    const points = institutions.root.children.find(
      (object): object is THREE.Points => object instanceof THREE.Points,
    )!;
    const colors = points.geometry.getAttribute("pointColor");
    const expected = new THREE.Color(spectrum.scatter);

    expect(colors.getX(selectedIndex)).toBeCloseTo(expected.r);
    expect(colors.getY(selectedIndex)).toBeCloseTo(expected.g);
    expect(colors.getZ(selectedIndex)).toBeCloseTo(expected.b);
    institutions.dispose();
  });

  it("rotates only the selected school's segmented halo", () => {
    const theme = getDigitalTwinMapTheme("cyan");
    const layer = new InstitutionLayer(
      rongchengEducationLocations,
      createMapProjection(initialMapState.geoData, 760, 760, 20),
      theme,
      rongchengEducationLocations.find((location) => location.type !== "bureau")?.id,
      1,
      defaultMapVisualTuning,
    );
    const pointMaterial = layer.root.children
      .filter((object): object is THREE.Points => object instanceof THREE.Points)
      .map((points) => points.material)
      .find((material): material is THREE.ShaderMaterial => material instanceof THREE.ShaderMaterial);

    expect(pointMaterial?.fragmentShader).toContain(
      "schoolRingAngle = angle + uTime * 0.72 * vSelected",
    );
    layer.dispose();
  });

  it("animates a selected school stem to its configured emphasized height", () => {
    const locations = rongchengEducationLocations.slice(0, 3);
    const institutions = new InstitutionLayer(
      locations,
      projection,
      theme,
      undefined,
      1,
      defaultMapVisualTuning,
      "district",
    );
    const points = institutions.root.children.find(
      (object): object is THREE.Points => object instanceof THREE.Points,
    )!;
    const pointPositions = points.geometry.getAttribute("position");
    const schoolIndex = locations.findIndex((location) => location.type !== "bureau");
    const school = locations[schoolIndex]!;
    const baseZ = pointPositions.getZ(schoolIndex);
    expect(baseZ).toBeCloseTo(
      regionTopZ + defaultMapVisualTuning.institutionStemStartHeight,
    );

    institutions.settleElevations();
    const settledBaseZ = pointPositions.getZ(schoolIndex);

    institutions.setSelected(school.id, theme);
    institutions.animate(1);
    const transitioningZ = pointPositions.getZ(schoolIndex);
    expect(transitioningZ).toBeGreaterThan(settledBaseZ);
    expect(transitioningZ).toBeLessThan(
      regionTopZ
        + defaultMapVisualTuning.institutionDistrictStemHeight
        * defaultMapVisualTuning.institutionSelectedStemHeightScale,
    );

    institutions.settleElevations();
    expect(pointPositions.getZ(schoolIndex)).toBeCloseTo(
      regionTopZ
        + defaultMapVisualTuning.institutionDistrictStemHeight
        * defaultMapVisualTuning.institutionSelectedStemHeightScale,
    );
    institutions.dispose();
  });

  it("renders energy towers as a depth-independent map overlay", () => {
    const gradient = { addColorStop: vi.fn() };
    const context = {
      createRadialGradient: vi.fn(() => gradient),
      fillRect: vi.fn(),
      fillStyle: "",
    } as unknown as CanvasRenderingContext2D;
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue(context);
    const layer = new EnergyTowerLayer(
      initialMapState,
      rongchengEducationLocations,
      projection,
      theme,
      defaultMapVisualTuning,
    );
    const towerMaterials: THREE.ShaderMaterial[] = [];
    const glowMaterials: THREE.MeshBasicMaterial[] = [];
    const glowMeshes: THREE.Mesh[] = [];
    const towerLabels: HTMLElement[] = [];
    layer.root.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.ShaderMaterial) {
        towerMaterials.push(object.material);
      }
      if (
        object instanceof THREE.Mesh
        && object.material instanceof THREE.MeshBasicMaterial
        && object.material.map
      ) {
        glowMaterials.push(object.material);
        glowMeshes.push(object);
      }
      if (object instanceof CSS2DObject) towerLabels.push(object.element);
    });

    expect(towerMaterials.length).toBeGreaterThan(0);
    expect(glowMeshes.length).toBeGreaterThan(1);
    expect(new Set(glowMeshes.map((mesh) => mesh.geometry)).size).toBe(1);
    expect(new Set(glowMaterials).size).toBe(1);
    expect(new Set(glowMaterials.map((material) => material.map)).size).toBe(1);
    expect(towerMaterials.every((material) => !material.depthTest && !material.depthWrite)).toBe(true);
    expect(layer.root.renderOrder).toBe(energyTowerRenderOrder);
    expect(layer.root.children.every((group) => group.renderOrder === energyTowerRenderOrder)).toBe(true);
    expect(layer.root.children.every((group) => group.position.z > regionTopZ)).toBe(true);
    expect(layer.root.children.every((group) => group.scale.z === 0.001)).toBe(true);
    expect(towerMaterials.every((material) => material.uniforms.uReveal?.value === 0)).toBe(true);
    const firstTowerGroup = layer.root.children[0];
    const firstTowerMesh = firstTowerGroup?.children.find(
      (object): object is THREE.Mesh => object instanceof THREE.Mesh
        && object.material instanceof THREE.ShaderMaterial,
    );
    const firstTowerLabel = firstTowerGroup?.children.find(
      (object): object is CSS2DObject => object instanceof CSS2DObject,
    );
    const firstTowerId = firstTowerMesh?.userData.energyTowerDatum?.id as string | undefined;
    expect(firstTowerId).toBeDefined();
    expect(firstTowerMesh).toBeDefined();
    layer.setSelected(firstTowerId);
    expect((firstTowerMesh!.material as THREE.ShaderMaterial).uniforms.uHover?.value).toBe(1);
    expect(firstTowerLabel?.element.classList.contains("is-selected")).toBe(true);
    layer.setSelected();
    expect((firstTowerMesh!.material as THREE.ShaderMaterial).uniforms.uHover?.value).toBe(0);
    expect(firstTowerLabel?.element.classList.contains("is-selected")).toBe(false);
    expect(towerMaterials.every((material) => (
      material.uniforms.uGridLineWidth?.value
      === defaultMapVisualTuning.energyTowerGridLineWidth
    ))).toBe(true);
    expect(towerMaterials.every((material) => (
      material.uniforms.uTipGlowStrength?.value
      === defaultMapVisualTuning.energyTowerTipGlowStrength
    ))).toBe(true);
    const liveMaterialTuning = {
      ...defaultMapVisualTuning,
      energyTowerGridLineWidth: 0.2,
      energyTowerTipGlowStrength: 2.4,
      energyTowerGlowOpacity: 0.61,
    };
    layer.applyTuning(theme, liveMaterialTuning);
    expect(towerMaterials.every((material) => material.uniforms.uGridLineWidth?.value === 0.2))
      .toBe(true);
    expect(towerMaterials.every((material) => material.uniforms.uTipGlowStrength?.value === 2.4))
      .toBe(true);
    expect(glowMaterials.every((material) => material.userData.baseOpacity === 0.61))
      .toBe(true);
    expect(glowMaterials.every((material) => material.color.getHexString() === "04e86c"))
      .toBe(true);
    const spectrumTheme = getDigitalTwinMapTheme("spectrum");
    const spectrumPalette = spectrumTheme.energyTowerPalette!;
    layer.applyTheme(spectrumTheme);
    expect(towerMaterials.every((material) => (
      material.uniforms.uBottomOpacity?.value
      === spectrumPalette.bottomOpacity
    ))).toBe(true);
    expect(towerMaterials.every((material) => (
      material.uniforms.uBaseColor?.value.getHexString()
      === spectrumPalette.base.slice(1).toLowerCase()
    ))).toBe(true);
    expect(towerMaterials.every((material) => [
      spectrumPalette.low,
      spectrumPalette.medium,
      spectrumPalette.high,
    ].map((color) => color.slice(1).toLowerCase()).includes(
      material.uniforms.uTopColor?.value.getHexString(),
    ))).toBe(true);
    expect(glowMaterials.every((material) => material.color.getHexString() === "0d2ac2"))
      .toBe(true);
    layer.applyTheme(getDigitalTwinMapTheme("cyan"));
    expect(towerMaterials.every((material) => material.uniforms.uBottomOpacity?.value === 0))
      .toBe(true);
    expect(towerMaterials.every((material) => (
      material.uniforms.uBaseColor?.value.getHexString()
      === material.uniforms.uTopColor?.value.getHexString()
    ))).toBe(true);
    expect(glowMaterials.every((material) => material.color.getHexString() === "2ffefe"))
      .toBe(true);
    expect(gradient.addColorStop).toHaveBeenCalledWith(0, "#FFFFFF");
    expect(gradient.addColorStop).toHaveBeenCalledWith(
      defaultMapVisualTuning.energyTowerGlowMidpoint,
      "rgba(255,255,255,0.53)",
    );
    for (let index = 0; index < 180; index += 1) layer.animate(1 / 60);
    expect(layer.root.children.every((group) => group.scale.z === 1)).toBe(true);
    expect(towerMaterials.every((material) => material.uniforms.uReveal?.value === 1)).toBe(true);
    const revealStyleWrite = vi.spyOn(towerLabels[0]!.style, "setProperty");
    layer.animate(1 / 60);
    expect(revealStyleWrite).not.toHaveBeenCalled();
    revealStyleWrite.mockRestore();
    layer.startExit();
    for (let index = 0; index < 180; index += 1) layer.animate(1 / 60);
    expect(layer.isHidden()).toBe(true);
    layer.dispose();
    contextSpy.mockRestore();
  });

  it("cycles one child tower card, pauses on hover, and scrolls long school lists", () => {
    const gradient = { addColorStop: vi.fn() };
    const context = {
      createRadialGradient: vi.fn(() => gradient),
      fillRect: vi.fn(),
      fillStyle: "",
    } as unknown as CanvasRenderingContext2D;
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue(context);
    const townshipState = initialMapState.geoData.features
      .map((feature) => loadMapLevel(String(feature.properties.code)))
      .find((state) => {
        const locations = filterLocationsForMapState(rongchengEducationLocations, state);
        const towers = buildEnergyTowerData(state, locations);
        return towers.length > 1 && towers.some((tower) => (tower.schoolNames?.length ?? 0) > 3);
      });
    expect(townshipState).toBeDefined();
    const townshipLocations = filterLocationsForMapState(
      rongchengEducationLocations,
      townshipState!,
    );
    const layer = new EnergyTowerLayer(
      townshipState!,
      townshipLocations,
      projection,
      theme,
      defaultMapVisualTuning,
    );
    const labels: HTMLElement[] = [];
    layer.root.traverse((object) => {
      if (object instanceof CSS2DObject) labels.push(object.element);
    });

    expect(labels.length).toBeGreaterThan(1);
    expect(labels.filter((label) => label.classList.contains("is-pinned"))).toHaveLength(1);
    expect(labels.every((label) => label.querySelector("strong")?.textContent?.endsWith("所学校")))
      .toBe(true);
    expect(labels.every((label) => !label.textContent?.includes("片区"))).toBe(true);
    const scrollingList = labels
      .map((label) => label.querySelector<HTMLElement>(".tower-school-list.is-scrolling"))
      .find(Boolean);
    expect(scrollingList).toBeTruthy();
    expect(scrollingList?.querySelectorAll(".tower-school-list-cycle")).toHaveLength(2);

    const initialPinnedId = labels.find((label) => label.classList.contains("is-pinned"))
      ?.dataset.energyTowerId;
    for (let index = 0; index < 306; index += 1) layer.animate(1 / 60);
    const cycledPinnedId = labels.find((label) => label.classList.contains("is-pinned"))
      ?.dataset.energyTowerId;
    expect(cycledPinnedId).not.toBe(initialPinnedId);

    const hoverLabel = labels.find((label) => label.dataset.energyTowerId !== cycledPinnedId)!;
    const hoverId = hoverLabel.dataset.energyTowerId!;
    layer.setHovered(hoverId);
    expect(hoverLabel.classList.contains("is-pinned")).toBe(true);
    expect(hoverLabel.classList.contains("is-hovered")).toBe(true);
    for (let index = 0; index < 360; index += 1) layer.animate(1 / 60);
    expect(hoverLabel.classList.contains("is-pinned")).toBe(true);
    layer.setHovered();
    expect(hoverLabel.classList.contains("is-pinned")).toBe(true);

    layer.dispose();
    contextSpy.mockRestore();
  });

  it("releases energy-tower resources once across repeated scope and theme cycles", () => {
    const gradient = { addColorStop: vi.fn() };
    const context = {
      createRadialGradient: vi.fn(() => gradient),
      fillRect: vi.fn(),
      fillStyle: "",
    } as unknown as CanvasRenderingContext2D;
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue(context);
    const geometryDispose = vi.spyOn(THREE.BufferGeometry.prototype, "dispose");
    const materialDispose = vi.spyOn(THREE.Material.prototype, "dispose");
    const textureDispose = vi.spyOn(THREE.Texture.prototype, "dispose");
    const townshipState = loadMapLevel("445202013");
    const scopes = [
      {
        state: initialMapState,
        locations: rongchengEducationLocations,
      },
      {
        state: townshipState,
        locations: filterLocationsForMapState(rongchengEducationLocations, townshipState),
      },
    ] as const;

    try {
      for (let cycle = 0; cycle < 4; cycle += 1) {
        const scope = scopes[cycle % scopes.length]!;
        const layer = new EnergyTowerLayer(
          scope.state,
          scope.locations,
          projection,
          theme,
          defaultMapVisualTuning,
        );
        const towerMaterials = new Set<THREE.ShaderMaterial>();
        layer.root.traverse((object) => {
          if (object instanceof THREE.Mesh && object.material instanceof THREE.ShaderMaterial) {
            towerMaterials.add(object.material);
          }
        });
        for (const nextTheme of digitalTwinMapThemes) layer.applyTheme(nextTheme);
        layer.applyTuning(getDigitalTwinMapTheme("spectrum"), {
          ...defaultMapVisualTuning,
          energyTowerBaseOpacity: 0.74,
          energyTowerGlowOpacity: 0.52,
        });
        layer.settle(true);

        const beforeDispose = {
          geometries: geometryDispose.mock.calls.length,
          materials: materialDispose.mock.calls.length,
          textures: textureDispose.mock.calls.length,
        };
        layer.dispose();
        const afterDispose = {
          geometries: geometryDispose.mock.calls.length,
          materials: materialDispose.mock.calls.length,
          textures: textureDispose.mock.calls.length,
        };
        expect(afterDispose.geometries - beforeDispose.geometries)
          .toBe(towerMaterials.size + 1);
        expect(afterDispose.materials - beforeDispose.materials)
          .toBe(towerMaterials.size + 1);
        expect(afterDispose.textures - beforeDispose.textures).toBe(1);

        layer.dispose();
        expect(geometryDispose).toHaveBeenCalledTimes(afterDispose.geometries);
        expect(materialDispose).toHaveBeenCalledTimes(afterDispose.materials);
        expect(textureDispose).toHaveBeenCalledTimes(afterDispose.textures);
      }
    } finally {
      textureDispose.mockRestore();
      materialDispose.mockRestore();
      geometryDispose.mockRestore();
      contextSpy.mockRestore();
    }
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
    expect(effects.root.renderOrder).toBeGreaterThan(40);
    effects.dispose();
  });

  it("renders the extended ground and procedural grid in one draw object", () => {
    const ground = new GroundGridLayer(theme, defaultMapVisualTuning);
    expect(ground.root.children).toHaveLength(1);
    const plane = ground.root.children.find(
      (object): object is THREE.Mesh => object instanceof THREE.Mesh,
    );
    if (!plane) throw new Error("Procedural ground grid is required");
    expect(plane.geometry).toBeInstanceOf(THREE.PlaneGeometry);
    expect((plane.geometry as THREE.PlaneGeometry).parameters).toMatchObject({
      width: groundPlaneSize,
      height: groundPlaneSize,
    });
    const material = plane.material as THREE.ShaderMaterial;
    expect(material).toBeInstanceOf(THREE.ShaderMaterial);
    expect(material.uniforms.uFillColor?.value.getHexString()).toBe("23252f");
    expect(material.uniforms.uGridColor?.value.getHexString()).toBe("ffffff");
    expect(material.uniforms.uFillOpacity?.value).toBe(0);
    expect(material.uniforms.uGridOpacity?.value).toBe(0.3);
    expect(material.uniforms.uCellSize?.value).toBe(groundGridCellSize);
    expect(material.uniforms.uFadeStart?.value).toBe(groundGridFadeStart);
    expect(material.uniforms.uFadeEnd?.value).toBe(groundGridFadeEnd);
    expect(material.fragmentShader).toContain("gridStrength = line * uGridOpacity * edgeFade");
    ground.dispose();
  });

  it("updates a theme without rebuilding administrative geometry", () => {
    const regions = new RegionLayer(
      initialMapState,
      projection,
      theme,
      defaultMapVisualTuning,
    );
    const geometryIdsBefore: number[] = [];
    const geometryIdsAfter: number[] = [];
    regions.root.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        geometryIdsBefore.push(object.geometry.id);
      }
    });

    const materialTuning = {
      ...defaultMapVisualTuning,
      regionBaseOpacity: 0.41,
      regionTerrainEmissiveIntensity: 0.36,
      regionSideTopOpacity: 0.67,
      regionTopContourOpacity: 0.73,
    };
    regions.applyTheme({
      ...getDigitalTwinMapTheme("cyan"),
      topFill: "#112233",
      bottomFill: "#445566",
    }, materialTuning);
    regions.root.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        geometryIdsAfter.push(object.geometry.id);
      }
    });

    expect(geometryIdsAfter).toEqual(geometryIdsBefore);
    const terrainMaterials: THREE.MeshStandardMaterial[] = [];
    const sideMaterials: THREE.ShaderMaterial[] = [];
    const basicOpacities = new Set<number>();
    const baseColors = new Set<string>();
    const baseSides = new Set<THREE.Side>();
    const lineOpacities = new Set<number>();
    const lineMinimumZs: number[] = [];
    const lineDepthTests: boolean[] = [];
    const sideDepthPrepasses: THREE.MeshBasicMaterial[] = [];
    const surfaceOverlayDepthTests: boolean[] = [];
    regions.root.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial) {
        terrainMaterials.push(object.material);
      } else if (object instanceof THREE.Mesh && object.material instanceof THREE.ShaderMaterial) {
        sideMaterials.push(object.material);
      } else if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshBasicMaterial) {
        basicOpacities.add(object.material.opacity);
        if (
          object.material.transparent
          && object.material.opacity === 0
          && object.material.side === THREE.DoubleSide
        ) {
          surfaceOverlayDepthTests.push(object.material.depthTest);
        }
        if (object.material.opacity === materialTuning.regionBaseOpacity) {
          baseColors.add(object.material.color.getHexString());
          baseSides.add(object.material.side);
        }
        if (!object.material.colorWrite && object.material.depthWrite) {
          sideDepthPrepasses.push(object.material);
        }
      } else if (object instanceof THREE.Line && object.material instanceof THREE.LineBasicMaterial) {
        lineOpacities.add(object.material.opacity);
        lineDepthTests.push(object.material.depthTest);
        const positions = object.geometry.getAttribute("position");
        lineMinimumZs.push(Math.min(...Array.from({ length: positions.count }, (_, index) =>
          positions.getZ(index))));
      }
    });
    expect(terrainMaterials.every((material) => material.roughness === 0.94)).toBe(true);
    expect(terrainMaterials.every((material) => material.metalness === 0.03)).toBe(true);
    const terrainColors = new Set(
      terrainMaterials.map((material) => material.color.getHexString()),
    );
    expect(terrainColors.has("112233")).toBe(true);
    expect(terrainColors.size).toBe(2);
    expect(terrainMaterials.every((material) => material.map === null)).toBe(true);
    expect(terrainMaterials.every((material) => material.normalMap === null)).toBe(true);
    expect(terrainMaterials.every((material) => material.roughnessMap === null)).toBe(true);
    expect(terrainMaterials.every((material) => material.emissiveIntensity === 0.36)).toBe(true);
    expect(terrainMaterials.every((material) => !(material instanceof THREE.MeshPhysicalMaterial)))
      .toBe(true);
    expect(sideMaterials.every((material) => material.uniforms.topOpacity?.value === 0.67))
      .toBe(true);
    expect(basicOpacities.has(0.41)).toBe(true);
    expect(baseColors.has("445566")).toBe(true);
    expect(baseSides).toEqual(new Set([THREE.BackSide]));
    expect(lineOpacities.has(0.73)).toBe(true);
    expect(lineMinimumZs.every((z) => z > 0)).toBe(true);
    expect(lineDepthTests.every(Boolean)).toBe(true);
    expect(sideDepthPrepasses.length).toBeGreaterThan(0);
    expect(sideDepthPrepasses.every((material) => material.depthTest)).toBe(true);
    expect(sideDepthPrepasses.every((material) => material.polygonOffset)).toBe(true);
    expect(sideDepthPrepasses.every((material) => material.polygonOffsetFactor > 0)).toBe(true);
    expect(sideDepthPrepasses.every((material) => material.polygonOffsetUnits > 0)).toBe(true);
    expect(surfaceOverlayDepthTests.length).toBeGreaterThan(0);
    expect(surfaceOverlayDepthTests.every(Boolean)).toBe(true);
    regions.applyTheme(getDigitalTwinMapTheme("spectrum"), materialTuning);
    expect(sideMaterials.every((material) => (
      material.uniforms.bottomColor?.value.getHexString() === "1fdde0"
    ))).toBe(true);
    expect(sideMaterials.every((material) => (
      material.uniforms.topColor?.value.getHexString() === "0071db"
    ))).toBe(true);
    expect(terrainMaterials.every((material) => !material.transparent && material.depthWrite))
      .toBe(true);
    regions.applyTheme(getDigitalTwinMapTheme("spectrum"), {
      ...materialTuning,
      regionTerrainOpacity: 0.72,
    });
    expect(terrainMaterials.every((material) => material.transparent && !material.depthWrite))
      .toBe(true);
    regions.dispose();
  });

  it("shares cap geometry and removes zero-opacity interaction overlays from rendering", () => {
    const regions = new RegionLayer(
      initialMapState,
      projection,
      theme,
      defaultMapVisualTuning,
    );
    const group = regions.root.children.find(
      (object): object is THREE.Group => object instanceof THREE.Group,
    )!;
    const capMeshes = group.children.filter(
      (object): object is THREE.Mesh => (
        object instanceof THREE.Mesh && object.geometry instanceof THREE.ShapeGeometry
      ),
    );
    expect(capMeshes).toHaveLength(4);
    expect(new Set(capMeshes.map((mesh) => mesh.geometry)).size).toBe(1);
    const interactionMeshes = capMeshes.filter(
      (mesh): mesh is THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> => (
        mesh.material instanceof THREE.MeshBasicMaterial
        && mesh.material.side === THREE.DoubleSide
      ),
    );
    expect(interactionMeshes).toHaveLength(2);
    expect(interactionMeshes.every((mesh) => !mesh.visible)).toBe(true);

    regions.setHovered(group);
    regions.settle();
    expect(interactionMeshes.some((mesh) => mesh.visible && mesh.material.opacity > 0)).toBe(true);
    regions.setHovered();
    regions.settle();
    expect(interactionMeshes.every((mesh) => !mesh.visible)).toBe(true);
    regions.dispose();
  });

  it("flattens non-focused townships while preserving the focused 3D region", () => {
    const regions = new RegionLayer(
      initialMapState,
      projection,
      theme,
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

    const inactiveSurfaceBeforeHover = (inactive?.position.z ?? 0) + 44 * (inactive?.scale.z ?? 0);
    regions.setHovered(inactive);
    for (let index = 0; index < 100; index += 1) regions.animate();
    expect(inactive?.scale.z).toBeCloseTo(
      defaultMapVisualTuning.townshipSiblingHoverThickness / 22,
      3,
    );
    expect(inactive?.position.z).toBeCloseTo(
      defaultMapVisualTuning.townshipSiblingBaseZ
        + 44 * (
          defaultMapVisualTuning.townshipSiblingThickness
          - defaultMapVisualTuning.townshipSiblingHoverThickness
        ) / 22,
      2,
    );
    expect((inactive?.position.z ?? 0) + 44 * (inactive?.scale.z ?? 0)).toBeCloseTo(
      inactiveSurfaceBeforeHover,
      3,
    );
    expect(inactive?.renderOrder).toBeGreaterThan(20);

    regions.dispose();
  });

  it("uses the focused-region elevation for every child in an active branch", () => {
    const regions = new RegionLayer(
      initialMapState,
      projection,
      theme,
      defaultMapVisualTuning,
    );

    regions.setFocus(undefined, defaultMapVisualTuning, true);
    regions.settle();

    const groups = regions.root.children.filter(
      (object): object is THREE.Group => object instanceof THREE.Group,
    );
    expect(groups.length).toBeGreaterThan(1);
    expect(groups.every((group) => (
      Math.abs(
        group.scale.z - defaultMapVisualTuning.townshipFocusThickness / 22,
      ) < 0.001
    ))).toBe(true);
    expect(groups.every((group) => (
      Math.abs(group.position.z - defaultMapVisualTuning.townshipFocusLift) < 0.01
    ))).toBe(true);
    regions.dispose();
  });

  it("keeps visible peers thin when the focused parent is replaced by its child layer", () => {
    const regions = new RegionLayer(
      initialMapState,
      projection,
      theme,
      defaultMapVisualTuning,
    );
    const focusedCode = "445202001";

    regions.setExcludedFeature(focusedCode);
    regions.setFocus(focusedCode, defaultMapVisualTuning);
    regions.settle();

    const groups = regions.root.children.filter(
      (object): object is THREE.Group => object instanceof THREE.Group,
    );
    const focused = groups.find(
      (group) => group.userData.feature?.properties?.code === focusedCode,
    );
    const visiblePeers = groups.filter((group) => group !== focused);

    expect(focused?.visible).toBe(false);
    expect(focused?.scale.z).toBeCloseTo(
      defaultMapVisualTuning.townshipSiblingThickness / 22,
      3,
    );
    expect(visiblePeers.length).toBeGreaterThan(0);
    expect(visiblePeers.every((group) => group.visible)).toBe(true);
    expect(visiblePeers.every((group) => (
      Math.abs(
        group.scale.z - defaultMapVisualTuning.townshipSiblingThickness / 22,
      ) < 0.001
    ))).toBe(true);

    const nextFocused = visiblePeers[0]!;
    const nextFocusedCode = nextFocused.userData.feature.properties.code as string;
    const previousSiblingScale = focused!.scale.z;
    regions.setExcludedFeature(nextFocusedCode);
    regions.setFocus(nextFocusedCode, defaultMapVisualTuning);
    regions.animate();

    expect(focused?.visible).toBe(true);
    expect(focused?.scale.z).toBeCloseTo(previousSiblingScale, 6);
    expect(nextFocused.visible).toBe(false);
    expect(nextFocused.scale.z).toBeCloseTo(
      defaultMapVisualTuning.townshipSiblingThickness / 22,
      3,
    );
    regions.dispose();
  });

  it("shrinks outgoing active geometry without making the solid layer transparent", () => {
    const regions = new RegionLayer(
      initialMapState,
      projection,
      theme,
      defaultMapVisualTuning,
    );
    regions.setFocus(undefined, defaultMapVisualTuning, true);
    regions.settle();
    const group = regions.root.children.find(
      (object): object is THREE.Group => object instanceof THREE.Group,
    )!;
    const sideMaterial = group.children
      .map((object) => object instanceof THREE.Mesh ? object.material : undefined)
      .find((material): material is THREE.ShaderMaterial => (
        material instanceof THREE.ShaderMaterial
        && material.uniforms.topOpacity !== undefined
      ));
    const focusedScale = group.scale.z;
    const focusedSideOpacity = sideMaterial!.uniforms.topOpacity!.value as number;

    regions.setAllAsSiblings(defaultMapVisualTuning);
    regions.animate(1 / 60);

    expect(group.scale.z).toBeLessThan(focusedScale);
    expect(group.scale.z).toBeGreaterThan(
      defaultMapVisualTuning.townshipSiblingThickness / 22,
    );
    expect(sideMaterial!.uniforms.topOpacity!.value).toBe(focusedSideOpacity);

    for (let index = 0; index < 100; index += 1) regions.animate(1 / 60);
    expect(group.scale.z).toBeCloseTo(
      defaultMapVisualTuning.townshipSiblingThickness / 22,
      3,
    );
    expect(regions.isPresentationHidden()).toBe(false);
    expect(regions.isTransitionSettled()).toBe(true);
    regions.dispose();
  });

  it("cross-fades city peers directly to the real external-map presentation", () => {
    const regions = new RegionLayer(
      initialMapState,
      projection,
      theme,
      defaultMapVisualTuning,
    );
    regions.setAllAsSiblings(defaultMapVisualTuning);
    regions.settle();
    const group = regions.root.children.find(
      (object): object is THREE.Group => object instanceof THREE.Group,
    )!;
    const sideMaterial = group.children
      .map((object) => object instanceof THREE.Mesh ? object.material : undefined)
      .find((material): material is THREE.ShaderMaterial => (
        material instanceof THREE.ShaderMaterial
        && material.uniforms.topOpacity !== undefined
      ))!;
    const terrainMaterial = group.children
      .map((object) => object instanceof THREE.Mesh ? object.material : undefined)
      .find((material): material is THREE.MeshStandardMaterial => (
        material instanceof THREE.MeshStandardMaterial
      ))!;
    const solidScale = group.scale.z;
    const solidSideOpacity = sideMaterial.uniforms.topOpacity!.value as number;
    const solidTerrainColor = terrainMaterial.color.clone();
    const solidTerrainOpacity = terrainMaterial.opacity;

    regions.setExternalPresentation(true);
    regions.animate(1 / 60);

    expect(group.scale.z).toBeLessThan(solidScale);
    expect(group.position.z + regionTopZ * group.scale.z)
      .toBeGreaterThan(regionalContextSurfaceZ);
    expect(sideMaterial.uniforms.topOpacity!.value as number).toBeLessThan(solidSideOpacity);
    expect(terrainMaterial.color.equals(solidTerrainColor)).toBe(true);
    expect(terrainMaterial.opacity).toBe(solidTerrainOpacity);

    for (let index = 0; index < 8; index += 1) regions.animate(1 / 60);
    expect(terrainMaterial.opacity).toBeLessThan(solidTerrainOpacity);
    expect(terrainMaterial.color.equals(solidTerrainColor)).toBe(true);

    regions.settle();
    expect(group.position.z + regionTopZ * group.scale.z)
      .toBeCloseTo(regionalContextSurfaceZ, 3);
    expect(sideMaterial.uniforms.topOpacity!.value).toBe(0);
    expect(terrainMaterial.opacity).toBe(0);
    expect(terrainMaterial.color.equals(solidTerrainColor)).toBe(true);
    expect(regions.isTransitionSettled()).toBe(true);

    regions.setExternalPresentation(false);
    regions.animate(1 / 60);
    expect(group.scale.z).toBeGreaterThan(0.05 / 22);
    expect(sideMaterial.uniforms.topOpacity!.value as number).toBeGreaterThan(0);
    regions.settle();
    expect(group.scale.z).toBeCloseTo(
      defaultMapVisualTuning.townshipSiblingThickness / 22,
      3,
    );
    expect(regions.isTransitionSettled()).toBe(true);
    regions.dispose();
  });

  it("keeps region elevation continuous and frame-rate independent", () => {
    const makeRegions = () => ({
      regions: new RegionLayer(
        initialMapState,
        projection,
        theme,
        defaultMapVisualTuning,
      ),
    });
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
