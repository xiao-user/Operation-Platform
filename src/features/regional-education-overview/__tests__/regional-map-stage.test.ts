import { defineComponent, h } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { rongchengEducationLocations } from "../education-locations";
import RegionalMapStage from "../components/RegionalMapStage.vue";
import { initialMapState } from "../map-data-adapter";
import { getDigitalTwinMapTheme } from "../map-themes";
import type { EducationLocation, MapCameraView } from "../types";

const parentCamera: MapCameraView = {
  fov: 37,
  position: [12, -620, 410],
  target: [-4, -28, 12],
};

describe("RegionalMapStage", () => {
  it("drills into the township containing a school selected outside the map", async () => {
    const focusFeature = vi.fn(() => Promise.resolve());
    const rendererStub = defineComponent({
      name: "RongchengThreeMap",
      setup(_, { expose }) {
        expose({
          getCameraView: () => parentCamera,
          focusFeature,
          animateCameraView: vi.fn(() => Promise.resolve()),
        });
        return () => h("div", { class: "renderer-stub" });
      },
    });
    const wrapper = mount(RegionalMapStage, {
      props: {
        locations: rongchengEducationLocations,
        theme: getDigitalTwinMapTheme("lime"),
        dataLayerMode: "institutions",
      },
      global: { stubs: { RongchengThreeMap: rendererStub } },
    });
    const school = rongchengEducationLocations.find((location) => location.type !== "bureau");
    expect(school).toBeDefined();

    await (wrapper.vm as unknown as {
      focusLocation: (location: EducationLocation) => Promise<void>;
    }).focusLocation(school!);
    await flushPromises();

    const scopeEvents = wrapper.emitted("scopeChange");
    expect(scopeEvents?.[scopeEvents.length - 1]?.[0]).toMatchObject({
      scope: "township",
    });
    expect(focusFeature).toHaveBeenCalledWith(expect.any(String), true);
  });

  it("switches focused siblings in place and animates back to the exact parent camera", async () => {
    const focusFeature = vi.fn();
    const animateCameraView = vi.fn();
    const rendererStub = defineComponent({
      name: "RongchengThreeMap",
      setup(_, { expose }) {
        expose({
          getCameraView: () => parentCamera,
          focusFeature,
          animateCameraView,
        });
        return () => h("div", { class: "renderer-stub" });
      },
    });
    const wrapper = mount(RegionalMapStage, {
      props: {
        locations: rongchengEducationLocations,
        theme: getDigitalTwinMapTheme("lime"),
        dataLayerMode: "institutions",
      },
      global: {
        stubs: { RongchengThreeMap: rendererStub },
      },
    });

    const township = initialMapState.geoData.features.find(
      (feature) => feature.properties.code === "445202001",
    );
    expect(township).toBeDefined();
    wrapper.findComponent(rendererStub).vm.$emit("feature-select", township);
    await flushPromises();
    const drilldownEvents = wrapper.emitted("scopeChange");
    expect(drilldownEvents?.[drilldownEvents.length - 1]?.[0]).toMatchObject({
      code: "445202001",
    });
    expect(focusFeature).toHaveBeenCalledWith("445202001", true);

    const sibling = initialMapState.geoData.features.find(
      (feature) => feature.properties.code === "445202002",
    );
    expect(sibling).toBeDefined();
    wrapper.findComponent(rendererStub).vm.$emit("feature-select", sibling);
    await flushPromises();
    const siblingEvents = wrapper.emitted("scopeChange");
    expect(siblingEvents?.[siblingEvents.length - 1]?.[0]).toMatchObject({
      code: "445202002",
    });
    expect(focusFeature).toHaveBeenLastCalledWith("445202002", false);

    wrapper.findComponent(rendererStub).vm.$emit("scope-back");
    await flushPromises();

    const returnEvents = wrapper.emitted("scopeChange");
    expect(returnEvents?.[returnEvents.length - 1]?.[0]).toMatchObject({ code: "445202" });
    expect(animateCameraView).toHaveBeenCalledWith(parentCamera);
  });

  it("keeps navigation locked until the renderer finishes its camera transition", async () => {
    let finishTransition: (() => void) | undefined;
    const focusFeature = vi.fn(() => new Promise<void>((resolve) => {
      finishTransition = resolve;
    }));
    const rendererStub = defineComponent({
      name: "RongchengThreeMap",
      setup(_, { expose }) {
        expose({
          getCameraView: () => parentCamera,
          focusFeature,
          animateCameraView: vi.fn(() => Promise.resolve()),
        });
        return () => h("div", { class: "renderer-stub" });
      },
    });
    const wrapper = mount(RegionalMapStage, {
      props: {
        locations: rongchengEducationLocations,
        theme: getDigitalTwinMapTheme("lime"),
        dataLayerMode: "institutions",
      },
      global: { stubs: { RongchengThreeMap: rendererStub } },
    });
    const [first, sibling] = initialMapState.geoData.features;
    expect(first).toBeDefined();
    expect(sibling).toBeDefined();

    wrapper.findComponent(rendererStub).vm.$emit("feature-select", first);
    await flushPromises();
    expect(wrapper.get(".map-stage").attributes("aria-busy")).toBe("true");

    wrapper.findComponent(rendererStub).vm.$emit("feature-select", sibling);
    await flushPromises();
    expect(focusFeature).toHaveBeenCalledTimes(1);

    finishTransition?.();
    await flushPromises();
    expect(wrapper.get(".map-stage").attributes("aria-busy")).toBe("false");
  });
});
