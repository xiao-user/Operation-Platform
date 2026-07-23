import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import SmartSportsDashboardHud from "../components/SmartSportsDashboardHud.vue";
import { getDigitalTwinMapTheme } from "../map-themes";

const props = {
  scopeName: "广东省",
  scopePath: [
    { code: "440000", name: "广东省", scope: "province" as const },
    { code: "445200", name: "揭阳市", scope: "city" as const },
  ],
  palette: getDigitalTwinMapTheme("cyan").chartPalette,
  coverageLabel: "区县同级边界 · 当前区县聚焦",
  dateRange: ["2026-07-01", "2026-07-23"] as const,
};

describe("SmartSportsDashboardHud", () => {
  it("preserves the complete navigable scope path", async () => {
    const wrapper = mount(SmartSportsDashboardHud, { props, global: { stubs: { EChartCanvas: true } } });

    const breadcrumb = wrapper.get('[aria-label="地图下钻路径"]');
    expect(breadcrumb.text()).toContain("广东省");
    expect(breadcrumb.text()).toContain("揭阳市");
    await breadcrumb.get("button").trigger("click");
    expect(wrapper.emitted("scopeNavigate")?.[0]).toEqual(["440000"]);
  });

  it("synchronizes comparison and metric choices with both ranking tables", async () => {
    const wrapper = mount(SmartSportsDashboardHud, { props, global: { stubs: { EChartCanvas: true } } });

    await buttonWithText(wrapper, "学段对比").trigger("click");
    expect(wrapper.get('[aria-label="学段体测覆盖率排行榜"]').text()).toContain("小学");
    expect(wrapper.get('[aria-label="1000米长跑覆盖率排行榜"]').text()).toContain("小学");

    await buttonWithText(wrapper, "运动参与率").trigger("click");
    expect(wrapper.get('[aria-label="学段运动参与率排行榜"]').text()).toContain("参与率");
    expect(wrapper.get('[aria-label="1000米长跑参与率排行榜"]').text()).toContain("参与率");
  });

  it("updates summary and trend data when the global sports tab changes", async () => {
    const wrapper = mount(SmartSportsDashboardHud, { props, global: { stubs: { EChartCanvas: true } } });

    await buttonWithText(wrapper, "阳光长跑").trigger("click");
    expect(wrapper.text()).toContain("长跑参与率");
    expect(wrapper.text()).toContain("省级阳光长跑目标达成");
    expect(wrapper.get('[aria-label="全省趋势指标"]').text()).toContain("参与人数");
    expect(wrapper.find(".sports-trend-card h2").exists()).toBe(false);
  });

  it("renders the floating date control and emits the selected global range", async () => {
    const wrapper = mount(SmartSportsDashboardHud, { props, global: { stubs: { EChartCanvas: true } } });
    const capsule = wrapper.get('[aria-label="智慧体育统计时间"]');
    expect(capsule.text()).toContain("统计时间");
    const datePicker = wrapper.findComponent({ name: "ElDatePicker" });
    expect(datePicker.props("modelValue")).toEqual(["2026-07-01", "2026-07-23"]);
    expect(datePicker.props("popperClass")).toBe("smart-sports-date-picker-popper");
    datePicker.vm.$emit("update:modelValue", ["2026-06-01", "2026-06-30"]);
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("dateRangeChange")?.[0])
      .toEqual([["2026-06-01", "2026-06-30"]]);
  });
});

function buttonWithText(wrapper: ReturnType<typeof mount>, label: string) {
  const button = wrapper.findAll("button").find((item) => item.text() === label);
  if (!button) throw new Error(`Expected button ${label}`);
  return button;
}
