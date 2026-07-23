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
        scopePath: [{ code: "445202", name: "榕城区", scope: "district" }],
      },
    });

    expect(wrapper.get("h2").text()).toBe("榕城区");
    expect(wrapper.find('[aria-label="地图下钻路径"]').exists()).toBe(false);
  });

  it("renders the complete navigation path and makes every ancestor clickable", async () => {
    const wrapper = mount(RegionalOverviewPanel, {
      props: {
        locations: rongchengEducationLocations,
        scopeName: "榕城区",
        scopePath: [
          { code: "440000", name: "广东省", scope: "province" },
          { code: "445200", name: "揭阳市", scope: "city" },
          { code: "445202", name: "榕城区", scope: "district" },
        ],
      },
    });

    const breadcrumb = wrapper.get('[aria-label="地图下钻路径"]');
    expect(breadcrumb.text()).toContain("广东省/揭阳市/榕城区");
    const buttons = breadcrumb.findAll("button");
    expect(buttons).toHaveLength(2);
    await buttons[0]!.trigger("click");
    expect(wrapper.emitted("scopeNavigate")).toEqual([["440000"]]);
  });
});
