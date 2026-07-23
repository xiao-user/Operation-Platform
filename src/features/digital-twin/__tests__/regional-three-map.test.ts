import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { ElSelect } from "element-plus";
import { rongchengEducationLocations } from "../education-locations";
import { initialMapState } from "./rongcheng-map-fixture";
import { getDigitalTwinMapTheme } from "../map-themes";
import { defaultMapVisualTuning } from "../rendering/map-visual-tuning";
import RegionalThreeMap from "../components/RegionalThreeMap.vue";

const engineMocks = vi.hoisted(() => ({
  animateCameraView: vi.fn(() => Promise.resolve()),
  dispose: vi.fn(),
  setSelectedEnergyTower: vi.fn(),
  setLocations: vi.fn(),
  setMapState: vi.fn(),
  setEnergyTowerValueFrame: vi.fn(),
  setVisualTuning: vi.fn(),
}));

vi.mock("../rendering/regional-map-engine", () => ({
  defaultRegionalMapCameraView: {
    fov: 30,
    position: [34, -760, 520],
    target: [-16, -42, 8],
  },
  RegionalMapEngine: class {
    animateCameraView = engineMocks.animateCameraView;
    dispose = engineMocks.dispose;
    getCameraView = vi.fn();
    previewFeature = vi.fn(() => Promise.resolve());
    focusFeature = vi.fn(() => Promise.resolve());
    setDataLayerMode = vi.fn();
    setVisualTuning = engineMocks.setVisualTuning;
    setLocations = engineMocks.setLocations;
    setMapState = engineMocks.setMapState;
    setEnergyTowerValueFrame = engineMocks.setEnergyTowerValueFrame;
    setSelectedLocation = vi.fn();
    setSelectedEnergyTower = engineMocks.setSelectedEnergyTower;
    setTheme = vi.fn();
  },
}));

describe("RegionalThreeMap controls", () => {
  it("keeps one animated reset action without camera persistence controls", async () => {
    const wrapper = mount(RegionalThreeMap, {
      props: {
        mapState: initialMapState,
        theme: getDigitalTwinMapTheme("cyan"),
        locations: rongchengEducationLocations,
        dataLayerMode: "institutions",
        visualTuning: defaultMapVisualTuning,
      },
    });

    expect(wrapper.find(".map-camera-control > span").exists()).toBe(false);
    expect(wrapper.find(".map-layer-switch").exists()).toBe(false);
    expect(wrapper.findAll(".map-camera-control > .map-layer-button")).toHaveLength(2);
    expect(wrapper.findAll(".map-camera-control button").map((button) => button.text()))
      .toEqual(["学校网络", "能量锥峰", "重置视角", ""]);
    expect(wrapper.get(".material-tuning__trigger").attributes("aria-label"))
      .toBe("地图材质");
    expect(wrapper.get(".map-camera-control").element.lastElementChild)
      .toBe(wrapper.get(".map-school-search").element);
    const resetButton = wrapper.findAll(".map-camera-control > button")
      .find((button) => button.text() === "重置视角");
    expect(resetButton).toBeDefined();
    await resetButton!.trigger("click");
    expect(engineMocks.animateCameraView).toHaveBeenCalledWith({
      fov: 30,
      position: [34, -760, 520],
      target: [-16, -42, 8],
    });

    wrapper.unmount();
  });

  it("searches schools without including the education bureau", async () => {
    const wrapper = mount(RegionalThreeMap, {
      props: {
        mapState: initialMapState,
        theme: getDigitalTwinMapTheme("cyan"),
        locations: rongchengEducationLocations,
        dataLayerMode: "institutions",
        visualTuning: defaultMapVisualTuning,
      },
    });
    const school = rongchengEducationLocations.find(
      (location) => location.type !== "bureau",
    )!;
    const search = wrapper.findComponent(ElSelect);

    expect(search.exists()).toBe(true);
    expect(search.props("ariaLabel")).toBe("搜索学校");
    expect(search.props("options")).toBeUndefined();
    expect(wrapper.findAllComponents({ name: "ElOption" })).toHaveLength(
      rongchengEducationLocations.length - 1,
    );
    search.vm.$emit("change", school.id);
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("schoolSearchSelect")).toEqual([[school]]);
    wrapper.unmount();
  });

  it("keeps school search visible when the current scope disables the institution network", () => {
    const wrapper = mount(RegionalThreeMap, {
      props: {
        mapState: initialMapState,
        theme: getDigitalTwinMapTheme("cyan"),
        locations: [],
        dataLayerMode: "energy-towers",
        visualTuning: defaultMapVisualTuning,
        institutionNetworkAvailable: false,
      },
    });

    expect(wrapper.findAll(".map-camera-control button").map((button) => button.text()))
      .toEqual(["能量锥峰", "重置视角", ""]);
    expect(wrapper.find(".map-school-search").exists()).toBe(true);
    expect(wrapper.findComponent(ElSelect).props("disabled")).toBe(true);
    wrapper.unmount();
  });

  it("syncs a complete map-state replacement even when the scope code is unchanged", async () => {
    engineMocks.setMapState.mockClear();
    engineMocks.setLocations.mockClear();
    const wrapper = mount(RegionalThreeMap, {
      props: {
        mapState: initialMapState,
        theme: getDigitalTwinMapTheme("cyan"),
        locations: rongchengEducationLocations,
        dataLayerMode: "energy-towers",
        visualTuning: defaultMapVisualTuning,
      },
    });
    const replacement = {
      ...initialMapState,
      geometryKey: `${initialMapState.geometryKey}-replacement`,
      geoData: { ...initialMapState.geoData },
    };

    await wrapper.setProps({ mapState: replacement });

    expect(engineMocks.setMapState).toHaveBeenCalledWith(
      replacement,
      rongchengEducationLocations,
    );
    expect(engineMocks.setLocations).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("updates metric values without replacing the map state or locations", async () => {
    const valueFrame = {
      values: { "445202001": 12_000 },
      total: 12_000,
      metricLabel: "运动人数",
    };
    const wrapper = mount(RegionalThreeMap, {
      props: {
        mapState: initialMapState,
        theme: getDigitalTwinMapTheme("cyan"),
        locations: rongchengEducationLocations,
        dataLayerMode: "energy-towers",
        visualTuning: defaultMapVisualTuning,
      },
    });
    engineMocks.setEnergyTowerValueFrame.mockClear();
    engineMocks.setMapState.mockClear();
    engineMocks.setLocations.mockClear();

    await wrapper.setProps({ energyTowerValueFrame: valueFrame });

    expect(engineMocks.setEnergyTowerValueFrame).toHaveBeenCalledOnce();
    expect(engineMocks.setEnergyTowerValueFrame).toHaveBeenCalledWith(valueFrame);
    expect(engineMocks.setMapState).not.toHaveBeenCalled();
    expect(engineMocks.setLocations).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("updates the live renderer when material tuning changes", async () => {
    const frames: FrameRequestCallback[] = [];
    const requestFrame = vi.spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        frames.push(callback);
        return frames.length;
      });
    const cancelFrame = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    engineMocks.setVisualTuning.mockClear();
    const wrapper = mount(RegionalThreeMap, {
      props: {
        mapState: initialMapState,
        theme: getDigitalTwinMapTheme("cyan"),
        locations: rongchengEducationLocations,
        dataLayerMode: "energy-towers",
        visualTuning: defaultMapVisualTuning,
      },
    });

    expect(wrapper.get(".map-host").attributes("style")).toContain(
      "--map-ground-background: #23252F",
    );
    const tuning = {
      ...defaultMapVisualTuning,
      regionTerrainOpacity: 0.86,
      colorOverrides: {
        ...defaultMapVisualTuning.colorOverrides,
        groundFill: "#334455",
      },
    };
    await wrapper.setProps({ visualTuning: tuning });
    const latestTuning = {
      ...tuning,
      regionTerrainOpacity: 0.72,
    };
    await wrapper.setProps({ visualTuning: latestTuning });
    expect(frames).toHaveLength(1);
    expect(engineMocks.setVisualTuning).not.toHaveBeenCalled();
    frames[0]?.(16);
    expect(engineMocks.setVisualTuning).toHaveBeenCalledOnce();
    expect(engineMocks.setVisualTuning).toHaveBeenCalledWith(latestTuning);
    expect(wrapper.get(".map-host").attributes("style")).toContain(
      "--map-ground-background: #334455",
    );
    wrapper.unmount();
    requestFrame.mockRestore();
    cancelFrame.mockRestore();
  });

  it("forwards an automatic energy-tower selection to the renderer", () => {
    const wrapper = mount(RegionalThreeMap, {
      props: {
        mapState: initialMapState,
        theme: getDigitalTwinMapTheme("cyan"),
        locations: rongchengEducationLocations,
        dataLayerMode: "energy-towers",
        visualTuning: defaultMapVisualTuning,
      },
    });

    (wrapper.vm as unknown as {
      setSelectedEnergyTower: (id?: string) => void;
    }).setSelectedEnergyTower("445202001");
    expect(engineMocks.setSelectedEnergyTower).toHaveBeenCalledWith("445202001");
    wrapper.unmount();
  });
});
