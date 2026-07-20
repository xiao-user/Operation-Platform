import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { ElButton, ElOption, ElSelect } from "element-plus";
import AcademicQualityDashboard from "../components/AcademicQualityDashboard.vue";
import DashboardPanel from "../components/dashboard/DashboardPanel.vue";
import DashboardPanelSelect from "../components/dashboard/DashboardPanelSelect.vue";
import DashboardPanelTabs from "../components/dashboard/DashboardPanelTabs.vue";
import DashboardSectionTabs from "../components/dashboard/DashboardSectionTabs.vue";
import DigitalTwinStatusBar from "../components/DigitalTwinStatusBar.vue";
import { getDigitalTwinMapTheme } from "../map-themes";
import {
  isRegionalDashboardSectionEnabled,
  regionalDashboardSections,
} from "../dashboard-sections";

describe("regional dashboard sections", () => {
  it("enables the overview and academic-quality tabs only", async () => {
    const wrapper = mount(DigitalTwinStatusBar, {
      props: {
        code: "445202",
        entityCount: 43,
        scopeName: "榕城区",
        activeSection: "regional-overview",
      },
    });

    const tabs = wrapper.findAll<HTMLButtonElement>('[role="tab"]');
    expect(tabs).toHaveLength(regionalDashboardSections.length);
    expect(tabs[0]?.attributes("aria-selected")).toBe("true");
    expect(tabs[0]?.element.disabled).toBe(false);
    expect(tabs[1]?.element.disabled).toBe(false);
    expect(tabs.slice(2).every((tab) => tab.element.disabled)).toBe(true);

    await tabs[1]?.trigger("click");
    const selectEvents = wrapper.emitted("select") ?? [];
    expect(selectEvents[selectEvents.length - 1]).toEqual(["academic-quality"]);
    expect(isRegionalDashboardSectionEnabled("academic-quality")).toBe(true);
    expect(isRegionalDashboardSectionEnabled("teacher-development")).toBe(false);
  });

  it("renders the same configurable sections in primary and bottom navigation", () => {
    const primary = mount(DashboardSectionTabs, {
      props: {
        activeSection: "academic-quality",
        label: "驾驶舱主导航",
        variant: "primary",
      },
    });
    const bottom = mount(DashboardSectionTabs, {
      props: {
        activeSection: "academic-quality",
        label: "数据驾驶舱导航",
        variant: "bottom",
      },
    });

    const attributes = (wrapper: typeof primary) => wrapper.findAll('[role="tab"]')
      .map((tab) => [
        tab.attributes("aria-label"),
        tab.attributes("aria-selected"),
        tab.attributes("disabled") !== undefined,
      ]);
    expect(attributes(primary)).toEqual(attributes(bottom));
    expect(attributes(primary)).toHaveLength(regionalDashboardSections.length);
  });

  it("renders the academic-quality dashboard with filters and the requested panel structure", () => {
    const wrapper = mount(AcademicQualityDashboard, {
      props: {
        chartPalette: getDigitalTwinMapTheme("cyan").chartPalette,
      },
      global: {
        components: { ElButton, ElOption, ElSelect },
        stubs: {
          EChartCanvas: {
            props: ["ariaLabelText"],
            template: '<div class="dashboard-echart-stub" role="img" :aria-label="ariaLabelText" />',
          },
        },
      },
    });

    expect(wrapper.get('[role="tabpanel"]').attributes("aria-label"))
      .toBe("学业质量监测");
    const filters = wrapper.findAllComponents(DashboardPanelSelect);
    expect(filters.map((filter) => [filter.props("label"), filter.props("modelValue")]))
      .toEqual([
        ["学期筛选", "2026-2027-2"],
        ["年级筛选", "grade-9"],
        ["考试", "all"],
      ]);
    expect(wrapper.get(".dashboard-panel-action-button").text()).toContain("报告中心");
    expect(wrapper.findAll(".academic-quality__column--side .quality-panel"))
      .toHaveLength(6);
    expect(wrapper.findAll(".academic-quality__column--center .quality-panel"))
      .toHaveLength(2);
    expect(wrapper.findAll(".dashboard-panel-header h2")).toHaveLength(8);
    expect(wrapper.findAll(".dashboard-panel-header__marker")).toHaveLength(8);
    expect(wrapper.findAll(".dashboard-panel-header__help")).toHaveLength(8);
    expect(wrapper.findAll(".dashboard-panel-header__code")).toHaveLength(0);
    expect(wrapper.text()).toContain("区域学业全景总览");
    expect(wrapper.text()).toContain("增值评价—学校及教师增值榜");
    expect(wrapper.get('[role="tablist"][aria-label="区域学业全景查看范围"]'))
      .toBeTruthy();
    const trendPanel = wrapper.findAll(".academic-quality__column--side .quality-panel")[0]!;
    expect(trendPanel.get(".dashboard-panel-header h2").text()).toBe("学业趋势对比");
    expect(trendPanel.find(".dashboard-panel-header__code").exists()).toBe(false);
    expect(trendPanel.find(".dashboard-panel-header__actions").exists()).toBe(false);
    expect(trendPanel.get(".dashboard-panel-header__help").attributes("aria-label"))
      .toBe("查看学业趋势对比说明");
    expect(trendPanel.get('[role="img"]').attributes("aria-label"))
      .toContain("平均分、优秀率和合格率");
  });

  it("keeps panel header actions separate from interchangeable chart content", async () => {
    const wrapper = mount(DashboardPanel, {
      props: {
        code: "TREND",
        title: "学业趋势对比",
        helpText: "展示历次考试变化",
      },
      slots: {
        "header-actions": "<button type='button'>查看范围</button>",
        default: "<div class='mock-chart'>柱状图内容</div>",
      },
    });

    expect(wrapper.get(".dashboard-panel-header h2").text()).toBe("学业趋势对比");
    expect(wrapper.get(".dashboard-panel-header__actions").text()).toBe("查看范围");
    expect(wrapper.get(".dashboard-panel-header__help").attributes("aria-label"))
      .toBe("查看学业趋势对比说明");
    expect(wrapper.get(".dashboard-panel__body .mock-chart").text()).toBe("柱状图内容");

    const tabs = mount(DashboardPanelTabs, {
      props: {
        modelValue: "region",
        label: "查看范围",
        items: [
          { value: "region", label: "区域" },
          { value: "school", label: "学校" },
        ],
      },
    });
    await tabs.findAll('[role="tab"]')[1]?.trigger("click");
    expect(tabs.emitted("update:modelValue")).toEqual([["school"]]);
  });
});
