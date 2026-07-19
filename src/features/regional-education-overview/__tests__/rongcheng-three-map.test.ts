import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { rongchengEducationLocations } from "../education-locations";
import { initialMapState } from "../map-data-adapter";
import { getDigitalTwinMapTheme } from "../map-themes";
import { defaultMapVisualTuning } from "../rendering/map-visual-tuning";
import RongchengThreeMap from "../components/RongchengThreeMap.vue";

const engineMocks = vi.hoisted(() => ({
  animateCameraView: vi.fn(() => Promise.resolve()),
  dispose: vi.fn(),
  setSelectedEnergyTower: vi.fn(),
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
    focusFeature = vi.fn(() => Promise.resolve());
    setDataLayerMode = vi.fn();
    setVisualTuning = engineMocks.setVisualTuning;
    setLocations = vi.fn();
    setMapState = vi.fn();
    setSelectedLocation = vi.fn();
    setSelectedEnergyTower = engineMocks.setSelectedEnergyTower;
    setTheme = vi.fn();
  },
}));

describe("RongchengThreeMap controls", () => {
  it("keeps one animated reset action without camera persistence controls", async () => {
    const wrapper = mount(RongchengThreeMap, {
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

  it("updates the live renderer when material tuning changes", async () => {
    const frames: FrameRequestCallback[] = [];
    const requestFrame = vi.spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        frames.push(callback);
        return frames.length;
      });
    const cancelFrame = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    engineMocks.setVisualTuning.mockClear();
    const wrapper = mount(RongchengThreeMap, {
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
    const wrapper = mount(RongchengThreeMap, {
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
