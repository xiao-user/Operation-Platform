import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import LocationProfilePanel from "../components/LocationProfilePanel.vue";
import { rongchengEducationLocations } from "../education-locations";

const locations = rongchengEducationLocations.slice(0, 5);
const lastLocation = locations[locations.length - 1]!;

describe("LocationProfilePanel pagination", () => {
  it("shows every location without adjacent arrow controls", async () => {
    const wrapper = mount(LocationProfilePanel, {
      props: {
        location: locations[0],
        locations,
        scopeName: "榕城区",
        canDrill: true,
        formattedDate: "2026-07-15",
        entityCount: locations.length,
        dataLayerMode: "institutions",
      },
    });

    expect(wrapper.findAll(".pagination-item")).toHaveLength(locations.length);
    expect(wrapper.find('[aria-label="上一所学校"]').exists()).toBe(false);
    expect(wrapper.find('[aria-label="下一所学校"]').exists()).toBe(false);
    expect(wrapper.findAll(".pagination-item").map((item) => item.attributes("aria-label")))
      .toEqual(locations.map((item) => `切换至${item.name}`));

    await wrapper.get(`[aria-label="切换至${lastLocation.name}"]`).trigger("click");
    expect(wrapper.emitted("locationSelect")?.[0]?.[0]).toEqual(lastLocation);
    await wrapper.setProps({ location: lastLocation });
    expect(wrapper.get(".pagination-item.is-active").attributes("aria-label"))
      .toBe(`切换至${locations[locations.length - 1]?.name}`);

    wrapper.unmount();
  });
});
