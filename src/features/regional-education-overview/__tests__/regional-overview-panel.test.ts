import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import RegionalOverviewPanel from "../components/RegionalOverviewPanel.vue";
import { rongchengEducationLocations } from "../education-locations";

describe("RegionalOverviewPanel", () => {
  it("uses the current district as the summary heading", () => {
    const wrapper = mount(RegionalOverviewPanel, {
      props: {
        locations: rongchengEducationLocations,
        scopeName: "榕城区",
        isTownship: false,
      },
    });

    expect(wrapper.get("h2").text()).toBe("榕城区");
    expect(wrapper.find('[aria-label="地图下钻路径"]').exists()).toBe(false);
  });

  it("renders a clickable breadcrumb in township scope", async () => {
    const wrapper = mount(RegionalOverviewPanel, {
      props: {
        locations: rongchengEducationLocations,
        scopeName: "榕华街道",
        isTownship: true,
      },
    });

    const breadcrumb = wrapper.get('[aria-label="地图下钻路径"]');
    expect(breadcrumb.text()).toContain("榕城区/榕华街道");
    await breadcrumb.get("button").trigger("click");
    expect(wrapper.emitted("scopeBack")).toHaveLength(1);
  });
});
