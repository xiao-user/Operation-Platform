import { defineComponent, h } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { rongchengEducationLocations } from "../education-locations";
import RegionalMapStage from "../components/RegionalMapStage.vue";
import { initialMapState } from "./rongcheng-map-fixture";
import {
  createAdministrativeBoundaryProviderChain,
  createAdministrativeMapDataSource,
  createStaticAdministrativeBoundaryProvider,
} from "../administrative-map-data-source";
import { getDigitalTwinMapTheme } from "../map-themes";
import { institutionNetworkScopes } from "../map-presentation-policy";
import { defaultMapVisualTuning } from "../rendering/map-visual-tuning";
import {
  clearSmartSportsMapCacheForTests,
  smartSportsMapDataSource,
} from "@/features/smart-sports-dashboard/smart-sports-map-data-source";
import type { MapCameraView } from "../types";

const parentCamera: MapCameraView = {
  fov: 37,
  position: [12, -620, 410],
  target: [-4, -28, 12],
};

const rongchengMapDataSource = createAdministrativeMapDataSource({
  initialState: initialMapState,
  provider: createAdministrativeBoundaryProviderChain([
    createStaticAdministrativeBoundaryProvider(
      new Map([[initialMapState.code, initialMapState.geoData]]),
    ),
  ]),
  minimumLocationScope: "district",
  institutionNetworkScopes,
  externalInteractionScopes: [],
});

afterEach(() => {
  clearSmartSportsMapCacheForTests();
  vi.unstubAllGlobals();
});

describe("RegionalMapStage", () => {
  it("aborts a pending boundary request when the map stage unmounts", async () => {
    let requestSignal: AbortSignal | undefined;
    vi.stubGlobal("fetch", vi.fn((_: string, init: RequestInit) => {
      requestSignal = init.signal as AbortSignal;
      return new Promise((_, reject) => {
        requestSignal?.addEventListener("abort", () => reject(
          new DOMException("unmounted", "AbortError"),
        ), { once: true });
      });
    }));
    const rendererStub = defineComponent({
      name: "RegionalThreeMap",
      setup(_, { expose }) {
        expose({
          getCameraView: () => parentCamera,
          previewFeature: vi.fn(() => Promise.resolve()),
          prepareMapState: vi.fn(() => Promise.resolve()),
          animateCameraView: vi.fn(() => Promise.resolve()),
          restoreMapPresentation: vi.fn(),
        });
        return () => h("div", { class: "renderer-stub" });
      },
    });
    const wrapper = mount(RegionalMapStage, {
      props: {
        locations: [],
        theme: getDigitalTwinMapTheme("lime"),
        dataLayerMode: "energy-towers",
        visualTuning: defaultMapVisualTuning,
        dataSource: smartSportsMapDataSource,
      },
      global: { stubs: { RegionalThreeMap: rendererStub } },
    });
    const city = smartSportsMapDataSource.initialState.geoData.features.find(
      (feature) => feature.properties.code === "440100",
    )!;

    wrapper.findComponent(rendererStub).vm.$emit("feature-select", city);
    await Promise.resolve();
    expect(requestSignal).toBeDefined();
    wrapper.unmount();
    await flushPromises();

    expect(requestSignal?.aborted).toBe(true);
  });

  it("lets a newer branch click supersede a still-loading request", async () => {
    let firstSignal: AbortSignal | undefined;
    vi.stubGlobal("fetch", vi.fn((url: string, init: RequestInit) => {
      const signal = init.signal as AbortSignal;
      if (url.includes("440100")) {
        firstSignal = signal;
        return new Promise((_, reject) => {
          signal.addEventListener("abort", () => reject(
            new DOMException("superseded", "AbortError"),
          ), { once: true });
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          type: "FeatureCollection",
          features: [{
            type: "Feature",
            properties: { code: "440303", name: "罗湖区", level: "district" },
            geometry: {
              type: "Polygon",
              coordinates: [[[112, 22], [114, 22], [114, 24], [112, 24], [112, 22]]],
            },
          }],
        }),
      });
    }));
    const rendererStub = defineComponent({
      name: "RegionalThreeMap",
      setup(_, { expose }) {
        expose({
          getCameraView: () => parentCamera,
          previewFeature: vi.fn(() => Promise.resolve()),
          prepareMapState: vi.fn(() => Promise.resolve()),
          focusCurrentBoundary: vi.fn(() => Promise.resolve()),
          animateCameraView: vi.fn(() => Promise.resolve()),
          restoreMapPresentation: vi.fn(),
        });
        return () => h("div", { class: "renderer-stub" });
      },
    });
    const wrapper = mount(RegionalMapStage, {
      props: {
        locations: [],
        theme: getDigitalTwinMapTheme("lime"),
        dataLayerMode: "energy-towers",
        visualTuning: defaultMapVisualTuning,
        dataSource: smartSportsMapDataSource,
      },
      global: { stubs: { RegionalThreeMap: rendererStub } },
    });
    const guangzhou = smartSportsMapDataSource.initialState.geoData.features.find(
      (feature) => feature.properties.code === "440100",
    )!;
    const shenzhen = smartSportsMapDataSource.initialState.geoData.features.find(
      (feature) => feature.properties.code === "440300",
    )!;

    wrapper.findComponent(rendererStub).vm.$emit("feature-select", guangzhou);
    await Promise.resolve();
    wrapper.findComponent(rendererStub).vm.$emit("feature-select", shenzhen);
    await flushPromises();

    const events = wrapper.emitted("scopeChange") ?? [];
    expect(firstSignal?.aborted).toBe(true);
    expect(events[events.length - 1]?.[0]).toMatchObject({ code: "440300" });
    wrapper.unmount();
  });

  it("matches the spatial trail when a school is selected from map search", async () => {
    const focusFeature = vi.fn(() => Promise.resolve());
    const rendererStub = defineComponent({
      name: "RegionalThreeMap",
      setup(_, { expose }) {
        expose({
          getCameraView: () => parentCamera,
          previewFeature: vi.fn(() => Promise.resolve()),
          focusFeature,
          prepareMapState: vi.fn(() => Promise.resolve()),
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
        visualTuning: defaultMapVisualTuning,
        dataSource: rongchengMapDataSource,
      },
      global: { stubs: { RegionalThreeMap: rendererStub } },
    });
    const school = rongchengEducationLocations.find((location) => location.type !== "bureau");
    expect(school).toBeDefined();

    wrapper.findComponent(rendererStub).vm.$emit("school-search-select", school!);
    await flushPromises();

    const selectEvents = wrapper.emitted("select") ?? [];
    expect(selectEvents[selectEvents.length - 1]).toEqual([school]);
    const scopeEvents = wrapper.emitted("scopeChange");
    expect(scopeEvents?.[scopeEvents.length - 1]?.[0]).toMatchObject({
      scope: "township",
    });
    expect(focusFeature).toHaveBeenCalledWith(expect.any(String), true);
  });

  it("switches focused siblings in place and animates back to the exact parent camera", async () => {
    const focusFeature = vi.fn();
    const previewFeature = vi.fn();
    const animateCameraView = vi.fn();
    const rendererStub = defineComponent({
      name: "RegionalThreeMap",
      setup(_, { expose }) {
        expose({
          getCameraView: () => parentCamera,
          previewFeature,
          focusFeature,
          prepareMapState: vi.fn(() => Promise.resolve()),
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
        visualTuning: defaultMapVisualTuning,
        dataSource: rongchengMapDataSource,
      },
      global: {
        stubs: { RegionalThreeMap: rendererStub },
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
    expect(previewFeature).toHaveBeenLastCalledWith("445202002", false);

    wrapper.findComponent(rendererStub).vm.$emit("scope-back");
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    await flushPromises();

    const returnEvents = wrapper.emitted("scopeChange");
    expect(returnEvents?.[returnEvents.length - 1]?.[0]).toMatchObject({ code: "445202" });
    expect(animateCameraView).toHaveBeenCalledWith(parentCamera);
  });

  it("keeps the current scope and restores its camera when return preparation fails", async () => {
    const childCamera: MapCameraView = {
      fov: 34,
      position: [30, -360, 180],
      target: [6, -12, 20],
    };
    let cameraView = parentCamera;
    const prepareMapState = vi.fn(() => Promise.reject(new Error("图层预构建失败")));
    const animateCameraView = vi.fn(() => Promise.resolve());
    const restoreMapPresentation = vi.fn();
    const rendererStub = defineComponent({
      name: "RegionalThreeMap",
      setup(_, { expose }) {
        expose({
          getCameraView: () => cameraView,
          previewFeature: vi.fn(() => Promise.resolve()),
          focusFeature: vi.fn(() => Promise.resolve()),
          prepareMapState,
          animateCameraView,
          restoreMapPresentation,
        });
        return () => h("div", { class: "renderer-stub" });
      },
    });
    const wrapper = mount(RegionalMapStage, {
      props: {
        locations: rongchengEducationLocations,
        theme: getDigitalTwinMapTheme("lime"),
        dataLayerMode: "institutions",
        visualTuning: defaultMapVisualTuning,
        dataSource: rongchengMapDataSource,
      },
      global: { stubs: { RegionalThreeMap: rendererStub } },
    });
    const township = initialMapState.geoData.features[0]!;

    wrapper.findComponent(rendererStub).vm.$emit("feature-select", township);
    await flushPromises();
    cameraView = childCamera;
    wrapper.findComponent(rendererStub).vm.$emit("scope-back");
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    await flushPromises();

    const scopeEvents = wrapper.emitted("scopeChange") ?? [];
    expect(scopeEvents[scopeEvents.length - 1]?.[0]).toMatchObject({
      code: township.properties.code,
    });
    expect(animateCameraView).toHaveBeenNthCalledWith(1, parentCamera);
    expect(animateCameraView).toHaveBeenNthCalledWith(2, childCamera);
    expect(restoreMapPresentation).toHaveBeenCalledOnce();
    expect(wrapper.emitted("loadError")).toEqual([["图层预构建失败"]]);
    expect(wrapper.get(".map-stage").attributes("aria-busy")).toBe("false");
  });

  it("lets a newer user navigation supersede an unfinished camera transition", async () => {
    const finishTransitions: Array<() => void> = [];
    const transitionFeature = vi.fn(() => new Promise<void>((resolve) => {
      finishTransitions.push(resolve);
    }));
    const rendererStub = defineComponent({
      name: "RegionalThreeMap",
      setup(_, { expose }) {
        expose({
          getCameraView: () => parentCamera,
          previewFeature: transitionFeature,
          focusFeature: transitionFeature,
          prepareMapState: vi.fn(() => Promise.resolve()),
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
        visualTuning: defaultMapVisualTuning,
        dataSource: rongchengMapDataSource,
      },
      global: { stubs: { RegionalThreeMap: rendererStub } },
    });
    const [first, sibling] = initialMapState.geoData.features;
    expect(first).toBeDefined();
    expect(sibling).toBeDefined();

    wrapper.findComponent(rendererStub).vm.$emit("feature-select", first);
    await flushPromises();
    expect(wrapper.get(".map-stage").attributes("aria-busy")).toBe("true");

    wrapper.findComponent(rendererStub).vm.$emit("feature-select", sibling);
    await flushPromises();
    expect(transitionFeature).toHaveBeenCalledTimes(2);
    expect(wrapper.get(".map-stage").attributes("aria-busy")).toBe("true");

    finishTransitions[1]?.();
    await flushPromises();
    expect(wrapper.get(".map-stage").attributes("aria-busy")).toBe("false");
    let scopeEvents = wrapper.emitted("scopeChange") ?? [];
    expect(scopeEvents[scopeEvents.length - 1]?.[0]).toMatchObject({
      code: sibling!.properties.code,
    });

    finishTransitions[0]?.();
    await flushPromises();
    scopeEvents = wrapper.emitted("scopeChange") ?? [];
    expect(scopeEvents[scopeEvents.length - 1]?.[0]).toMatchObject({
      code: sibling!.properties.code,
    });
  });

  it("lets a manual return immediately supersede an automatic child focus", async () => {
    let finishAutomaticFocus: (() => void) | undefined;
    const focusFeature = vi.fn(() => new Promise<void>((resolve) => {
      finishAutomaticFocus = resolve;
    }));
    const animateCameraView = vi.fn(() => Promise.resolve());
    const rendererStub = defineComponent({
      name: "RegionalThreeMap",
      setup(_, { expose }) {
        expose({
          getCameraView: () => parentCamera,
          previewFeature: vi.fn(() => Promise.resolve()),
          focusFeature,
          prepareMapState: vi.fn(() => Promise.resolve()),
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
        visualTuning: defaultMapVisualTuning,
        dataSource: rongchengMapDataSource,
      },
      global: { stubs: { RegionalThreeMap: rendererStub } },
    });
    const township = initialMapState.geoData.features[0]!;
    const automaticFocus = (wrapper.vm as unknown as {
      focusFeatureAutomatically: (code: string) => Promise<boolean>;
    }).focusFeatureAutomatically(township.properties.code!);
    await flushPromises();

    expect(wrapper.get(".map-stage").attributes("aria-busy")).toBe("true");
    let scopeEvents = wrapper.emitted("scopeChange") ?? [];
    expect(scopeEvents[scopeEvents.length - 1]?.[0]).toMatchObject({
      code: township.properties.code,
    });

    wrapper.findComponent(rendererStub).vm.$emit("scope-back");
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    await flushPromises();

    expect(animateCameraView).toHaveBeenCalledWith(parentCamera);
    expect(wrapper.get(".map-stage").attributes("aria-busy")).toBe("false");
    scopeEvents = wrapper.emitted("scopeChange") ?? [];
    expect(scopeEvents[scopeEvents.length - 1]?.[0]).toMatchObject({ code: "445202" });

    finishAutomaticFocus?.();
    await expect(automaticFocus).resolves.toBe(false);
    scopeEvents = wrapper.emitted("scopeChange") ?? [];
    expect(scopeEvents[scopeEvents.length - 1]?.[0]).toMatchObject({ code: "445202" });
  });

  it("keeps peer cities as an extruded navigation level and returns directly to Guangdong", async () => {
    const focusFeature = vi.fn(() => Promise.resolve());
    const previewFeature = vi.fn(() => Promise.resolve());
    const focusCurrentBoundary = vi.fn(() => Promise.resolve());
    const prepareMapState = vi.fn(() => Promise.resolve());
    const animateCameraView = vi.fn(() => Promise.resolve());
    const rendererStub = defineComponent({
      name: "RegionalThreeMap",
      setup(_, { expose }) {
        expose({
          getCameraView: () => parentCamera,
          previewFeature,
          focusFeature,
          focusCurrentBoundary,
          prepareMapState,
          animateCameraView,
        });
        return () => h("div", { class: "renderer-stub" });
      },
    });
    const districtFeature = {
      type: "Feature" as const,
      properties: { code: "440103", adcode: 440103, name: "测试区", level: "district" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[[112, 22], [114, 22], [114, 24], [112, 24], [112, 22]]],
      },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ type: "FeatureCollection", features: [districtFeature] }),
    }));
    const wrapper = mount(RegionalMapStage, {
      props: {
        locations: [],
        theme: getDigitalTwinMapTheme("lime"),
        dataLayerMode: "energy-towers",
        visualTuning: defaultMapVisualTuning,
        dataSource: smartSportsMapDataSource,
      },
      global: { stubs: { RegionalThreeMap: rendererStub } },
    });
    const guangzhou = smartSportsMapDataSource.initialState.geoData.features.find(
      (feature) => feature.properties.code === "440100",
    )!;
    const shenzhen = smartSportsMapDataSource.initialState.geoData.features.find(
      (feature) => feature.properties.code === "440300",
    )!;

    wrapper.findComponent(rendererStub).vm.$emit("feature-select", guangzhou);
    await flushPromises();
    expect(previewFeature).toHaveBeenLastCalledWith("440100", true);
    expect(focusFeature).not.toHaveBeenCalled();
    expect(prepareMapState).toHaveBeenCalledWith(expect.objectContaining({ code: "440100" }));
    expect(focusCurrentBoundary).not.toHaveBeenCalled();
    let scopeEvents = wrapper.emitted("scopeChange") ?? [];
    expect(scopeEvents[scopeEvents.length - 1]?.[0]).toMatchObject({ code: "440100" });

    wrapper.findComponent(rendererStub).vm.$emit("feature-select", shenzhen);
    await flushPromises();
    expect(previewFeature).toHaveBeenLastCalledWith("440300", true);
    expect(focusFeature).not.toHaveBeenCalled();
    expect(prepareMapState).toHaveBeenLastCalledWith(expect.objectContaining({ code: "440300" }));
    scopeEvents = wrapper.emitted("scopeChange") ?? [];
    expect(scopeEvents[scopeEvents.length - 1]?.[0]).toMatchObject({ code: "440300" });

    wrapper.findComponent(rendererStub).vm.$emit("feature-select", districtFeature);
    await flushPromises();
    scopeEvents = wrapper.emitted("scopeChange") ?? [];
    expect(scopeEvents[scopeEvents.length - 1]?.[0]).toMatchObject({ code: "440103" });

    wrapper.findComponent(rendererStub).vm.$emit("feature-select", guangzhou);
    await flushPromises();
    scopeEvents = wrapper.emitted("scopeChange") ?? [];
    expect(scopeEvents[scopeEvents.length - 1]?.[0]).toMatchObject({
      code: "440100",
      navigationPath: [
        expect.objectContaining({ code: "440000" }),
        expect.objectContaining({ code: "440100" }),
      ],
    });

    await (wrapper.vm as unknown as {
      goToScope: (code: string) => Promise<boolean>;
    }).goToScope("440000");
    await flushPromises();
    scopeEvents = wrapper.emitted("scopeChange") ?? [];
    expect(scopeEvents[scopeEvents.length - 1]?.[0]).toMatchObject({ code: "440000" });

    wrapper.findComponent(rendererStub).vm.$emit("scope-back");
    await flushPromises();
    scopeEvents = wrapper.emitted("scopeChange") ?? [];
    expect(scopeEvents[scopeEvents.length - 1]?.[0]).toMatchObject({ code: "440000" });
    expect(animateCameraView).toHaveBeenCalledWith(parentCamera);
  });
});
