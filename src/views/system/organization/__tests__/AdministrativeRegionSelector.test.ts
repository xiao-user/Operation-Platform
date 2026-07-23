import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import ElementPlus from "element-plus";
import AdministrativeRegionSelector from "@/views/system/organization/AdministrativeRegionSelector.vue";
import type { GeoFeature } from "@/features/digital-twin/geo";

const loadAdministrativeChildren = vi.hoisted(() => vi.fn());

vi.mock("@/features/digital-twin/administrative-boundary-service", () => ({
  loadAdministrativeChildren,
  administrativeScopeForFeature: (feature: GeoFeature) => feature.properties.level,
}));

function feature(code: string, name: string, level: string): GeoFeature {
  return {
    type: "Feature",
    properties: { code, name, fullname: name, level },
    geometry: {
      type: "Polygon",
      coordinates: [[
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ]],
    },
  };
}

afterEach(() => vi.clearAllMocks());

describe("AdministrativeRegionSelector", () => {
  it("emits a complete path while allowing province or city as the root", async () => {
    loadAdministrativeChildren.mockImplementation(async (code: string) => ({
      type: "FeatureCollection",
      features: code === "100000"
        ? [feature("360000", "江西省", "province")]
        : code === "360000"
          ? [feature("360100", "南昌市", "city")]
          : [feature("360102", "东湖区", "district")],
    }));
    const wrapper = mount(AdministrativeRegionSelector, {
      global: { plugins: [ElementPlus], stubs: { transition: false } },
    });
    await flushPromises();
    const selects = wrapper.findAllComponents({ name: "ElSelect" });

    selects[0]!.vm.$emit("change", "360000");
    await flushPromises();
    const provinceEvents = wrapper.emitted("update:modelValue") ?? [];
    expect(provinceEvents[provinceEvents.length - 1]?.[0]).toEqual({
      code: "360000",
      name: "江西省",
      scope: "province",
      path: [{ code: "360000", name: "江西省", scope: "province" }],
    });

    selects[1]!.vm.$emit("change", "360100");
    await flushPromises();
    const cityEvents = wrapper.emitted("update:modelValue") ?? [];
    expect(cityEvents[cityEvents.length - 1]?.[0]).toMatchObject({
      code: "360100",
      name: "南昌市",
      scope: "city",
      path: [
        { code: "360000", name: "江西省", scope: "province" },
        { code: "360100", name: "南昌市", scope: "city" },
      ],
    });
    expect(wrapper.text()).toContain("不能返回或切换到该范围之外");
    wrapper.unmount();
  });
});
