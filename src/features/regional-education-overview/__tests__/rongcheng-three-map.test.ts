import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { rongchengEducationLocations } from "../education-locations";
import { initialMapState } from "../map-data-adapter";
import { getDigitalTwinMapTheme } from "../map-themes";
import RongchengThreeMap from "../components/RongchengThreeMap.vue";

const engineMocks = vi.hoisted(() => ({
  animateCameraView: vi.fn(() => Promise.resolve()),
  dispose: vi.fn(),
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
    setLocations = vi.fn();
    setMapState = vi.fn();
    setSelectedLocation = vi.fn();
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
      },
    });

    expect(wrapper.find(".map-camera-control > span").exists()).toBe(false);
    expect(wrapper.findAll(".map-camera-control button").map((button) => button.text()))
      .toEqual(["学校网络", "能量锥峰", "重置视角"]);

    await wrapper.get(".map-camera-control > button").trigger("click");
    expect(engineMocks.animateCameraView).toHaveBeenCalledWith({
      fov: 30,
      position: [34, -760, 520],
      target: [-16, -42, 8],
    });

    wrapper.unmount();
  });
});
