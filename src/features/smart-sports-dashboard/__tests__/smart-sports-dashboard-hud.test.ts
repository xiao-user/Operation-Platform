import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import SmartSportsDashboardHud from "../components/SmartSportsDashboardHud.vue";
import { getDigitalTwinMapTheme } from "@/features/digital-twin/map-themes";
import EChartCanvas from "@/features/digital-twin/components/dashboard/EChartCanvas.vue";
import type { MapNavigationNode, MapScope, MapState } from "@/features/digital-twin/map-state";

const cityPath = [
    { code: "440000", name: "广东省", scope: "province" as const },
    { code: "445200", name: "揭阳市", scope: "city" as const },
] satisfies MapNavigationNode[];

function mapState(
  scope: MapScope,
  regionName: string,
  code: string,
  navigationPath: readonly MapNavigationNode[],
  childNames: readonly string[] = [],
): MapState {
  return {
    scope,
    regionName,
    code,
    geometryKey: `${code}-children`,
    geoData: {
      type: "FeatureCollection",
      features: childNames.map((name, index) => ({
        type: "Feature",
        properties: { name, code: `${code}${index}` },
        geometry: { type: "Polygon", coordinates: [] },
      })),
    },
    terminal: childNames.length === 0,
    navigationPath,
  };
}

const props = {
  mapState: mapState("city", "揭阳市", "445200", cityPath, ["榕城区", "揭东区", "普宁市"]),
  scopeName: "揭阳市",
  scopePath: cityPath,
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
    expect(wrapper.text()).toContain("58.8万km");
    expect(wrapper.text()).toContain("市级累计运动路程");
    expect(wrapper.text()).toContain("78,750人次");
    expect(wrapper.text()).toContain("人均运动时长");
    expect(wrapper.get(".sports-summary").text()).not.toContain("有氧运动强度");
    expect(wrapper.get(".sports-summary").findAll(".sports-summary__primary dd")
      .every((item) => item.find(".animated-number").exists())).toBe(true);
    expect(wrapper.text()).toContain("阳光长跑 TOP5");
    expect(wrapper.find(".top-five-select").exists()).toBe(false);
    expect(wrapper.get('[aria-label="区域指标"]').text()).toContain("累计运动路程");
    expect(wrapper.get('[aria-label="区域指标"]').text()).toContain("长跑参与率");
    expect(wrapper.get('[aria-label="区县累计运动路程排行榜"]').text()).toContain("万km");
    expect(wrapper.get('[aria-label="阳光长跑累计路程排行榜"]').text()).toContain("万km");
    const runningCards = wrapper.get('[aria-label="揭阳市阳光长跑运动概览"]');
    expect(runningCards.findAll("article")).toHaveLength(3);
    expect(runningCards.text()).toContain("有氧运动强度");
    expect(runningCards.text()).toContain("3,510人");
    expect(runningCards.text()).toContain("本周运动目标完成情况");
    expect(runningCards.get(".sports-intensity-card").classes()).toContain("sports-goal-card");
    expect(runningCards.findAll(".sports-intensity-card dd")
      .every((item) => item.find(".animated-number").exists())).toBe(true);
    expect(runningCards.find(".sports-goal-card__stats > p .animated-number").exists())
      .toBe(true);
    expect(wrapper.findAll(".ranking-table__row b")
      .every((item) => item.find(".animated-number").exists())).toBe(true);
    expect(runningCards.findAll('[role="progressbar"]')).toHaveLength(3);
    expect(runningCards.get('[aria-label="大强度人数占覆盖人数比例"]').findAll("i"))
      .toHaveLength(10);
    expect(runningCards.get('[aria-label="大强度人数占覆盖人数比例"]').attributes("aria-valuemax"))
      .toBe("8058");
    expect(wrapper.get('[aria-label="揭阳市趋势指标"]').text()).toContain("运动人数");
    expect(wrapper.get('[aria-label="揭阳市趋势指标"]').text()).toContain("运动次数");
    expect(wrapper.get('[aria-label="揭阳市趋势指标"]').text()).toContain("日参与率");
    expect(wrapper.find(".sports-trend-card").exists()).toBe(true);
    const goalOption = wrapper.findAllComponents(EChartCanvas)[0]!.props("option");
    expect(JSON.stringify(goalOption)).not.toContain('"text":"55"');
    expect(runningCards.text()).toMatch(/本周运动目标完成情况\d+(?:\.\d)?%/);
    let charts = wrapper.findAllComponents(EChartCanvas);
    const participantTrendOption = charts[charts.length - 1]!.props("option") as {
      xAxis: { data: string[] };
      yAxis: { max: number; interval: number };
    };
    expect(participantTrendOption.xAxis.data)
      .toEqual(["周一", "周二", "周三", "周四", "周五", "周六", "周日"]);
    expect(participantTrendOption.yAxis.max).toBeLessThan(500);

    await buttonWithText(wrapper, "日参与率").trigger("click");
    charts = wrapper.findAllComponents(EChartCanvas);
    const rateTrendOption = charts[charts.length - 1]!.props("option") as {
      yAxis: { max: number; interval: number };
    };
    expect(rateTrendOption.yAxis).toMatchObject({ max: 100, interval: 20 });

    await buttonWithText(wrapper, "数据概览").trigger("click");
    expect(wrapper.text()).toContain("体测覆盖率");
    expect(wrapper.text()).not.toContain("有氧运动强度");
  });

  it("uses the active map scope in coverage labels", async () => {
    const wrapper = mount(SmartSportsDashboardHud, { props, global: { stubs: { EChartCanvas: true } } });
    expect(wrapper.text()).toContain("市级覆盖人数");
    expect(wrapper.findAll(".sports-summary__primary dd small").map((item) => item.text()))
      .toEqual(["人", "所", "人"]);
    const cityCoverage = wrapper.get(".sports-summary__primary dd").text();
    expect(wrapper.text()).toContain("揭阳市指标排名");
    expect(buttonWithText(wrapper, "区县对比")).toBeDefined();

    const provincePath = [{ code: "440000", name: "广东省", scope: "province" as const }];
    await wrapper.setProps({
      mapState: mapState("province", "广东省", "440000", provincePath, ["广州市", "深圳市"]),
      scopeName: "广东省",
      scopePath: provincePath,
    });
    expect(wrapper.text()).toContain("省级覆盖人数");
    expect(wrapper.get(".sports-summary__primary dd").text()).not.toBe(cityCoverage);
    expect(wrapper.text()).toContain("广东省指标排名");
    expect(buttonWithText(wrapper, "地市对比")).toBeDefined();

    const districtPath = [
      ...cityPath,
      { code: "445202", name: "榕城区", scope: "district" as const },
    ];
    await wrapper.setProps({
      mapState: mapState("district", "榕城区", "445202", districtPath),
      scopeName: "榕城区",
      scopePath: districtPath,
    });
    expect(wrapper.text()).toContain("区级覆盖人数");
    expect(wrapper.text()).toContain("榕城区指标排名");
    expect(buttonWithText(wrapper, "学校对比")).toBeDefined();
  });

  it("renders the scoped AI assessment overview with shared data styles", async () => {
    const wrapper = mount(SmartSportsDashboardHud, { props, global: { stubs: { EChartCanvas: true } } });

    await buttonWithText(wrapper, "AI体测").trigger("click");
    const summary = wrapper.get(".sports-summary");
    expect(summary.text()).toContain("市级覆盖人数");
    expect(summary.text()).toContain("市级参与体测人数");
    expect(summary.text()).toContain("体测总人数");
    expect(summary.text()).toContain("测试项目数");
    expect(summary.findAll(".sports-summary__primary dd small").map((item) => item.text()))
      .toEqual(["人", "人", "人次", "项"]);
    expect(summary.text()).toContain("市级平均分");
    expect(summary.text()).toContain("国标达标率");
    expect(summary.findAll(".sports-summary__metrics li")).toHaveLength(2);
    expect(summary.findAll(".sports-summary__metrics b")).toHaveLength(2);
    expect(summary.findAll(".sports-summary__metrics strong")
      .every((item) => item.find(".animated-number").exists())).toBe(true);

    const gradeCard = wrapper.get(".sports-grade-card");
    expect(gradeCard.text()).toContain("体测等级分布");
    expect(gradeCard.text()).toContain("优秀");
    expect(gradeCard.text()).toContain("良好");
    expect(gradeCard.text()).toContain("及格");
    expect(gradeCard.text()).toContain("不及格");
    expect(gradeCard.findAll(".sports-summary__primary dd small").map((item) => item.text()))
      .toEqual(["人", "人", "人", "人"]);
    expect(gradeCard.find(".intensity-progress").exists()).toBe(false);
    expect(gradeCard.findAll("dd")
      .every((item) => item.find(".animated-number").exists())).toBe(true);
    expect(wrapper.findAll(".sports-goals .sports-goal-card")).toHaveLength(2);
    expect(wrapper.text()).toContain("本学期体测完成率");
    expect(wrapper.text()).toContain("AI体测 TOP5");
    expect(wrapper.find(".top-five-select").exists()).toBe(false);
    expect(wrapper.get('[aria-label="AI体测合格率排行榜"]').text()).toMatch(/\d+(?:\.\d)?%/);
    expect(wrapper.get('[aria-label="AI体测合格率排行榜"]').text()).toContain("榕城区");

    const radarCard = wrapper.get(".sports-radar-card");
    expect(radarCard.text()).toContain("体测项目达标率");
    expect(radarCard.find(".sports-radar-card__legend").exists()).toBe(false);
    expect(wrapper.find(".sports-trend-card").exists()).toBe(false);
    const charts = wrapper.findAllComponents(EChartCanvas);
    const radarChart = charts[charts.length - 1]!;
    const radarOption = radarChart.props("option") as {
      legend: { data: string[]; selected: Record<string, boolean>; orient: string };
      radar: { indicator: { name: string }[]; center: string[] };
      series: { type: string; data: { name: string }[] }[];
    };
    expect(radarOption.series[0]?.type).toBe("radar");
    expect(radarOption.series[1]?.type).toBe("pie");
    expect(radarOption.series[1]?.data).toHaveLength(18);
    expect(radarOption.legend.data).toHaveLength(18);
    expect(radarOption.legend.orient).toBe("vertical");
    expect(Object.values(radarOption.legend.selected).filter(Boolean)).toHaveLength(6);
    expect(radarOption.radar.center[0]).toBe("34%");
    expect(radarOption.radar.indicator).toHaveLength(6);

    radarChart.vm.$emit("legendSelectionChange", {
      ...radarOption.legend.selected,
      立定跳远: true,
    });
    await wrapper.vm.$nextTick();
    const updatedRadarOption = radarChart.props("option") as {
      radar: { indicator: { name: string }[] };
    };
    expect(updatedRadarOption.radar.indicator).toHaveLength(7);
    expect(updatedRadarOption.radar.indicator.map((item) => item.name)).toContain("立定跳远");
    expect(wrapper.emitted("dashboardChange")?.[0]).toEqual(["assessment"]);
  });

  it("renders the floating date control and emits the selected global range", async () => {
    const wrapper = mount(SmartSportsDashboardHud, { props, global: { stubs: { EChartCanvas: true } } });
    const capsule = wrapper.get('[aria-label="智慧体育统计时间"]');
    const initialCoverage = wrapper.get(".sports-summary__primary dd").text();
    expect(capsule.text()).toContain("统计时间");
    const datePicker = wrapper.findComponent({ name: "ElDatePicker" });
    expect(datePicker.props("modelValue")).toEqual(["2026-07-01", "2026-07-23"]);
    expect(datePicker.props("popperClass")).toBe("smart-sports-date-picker-popper");
    expect(datePicker.props("shortcuts")).toHaveLength(3);
    datePicker.vm.$emit("update:modelValue", ["2026-06-01", "2026-06-30"]);
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("dateRangeChange")?.[0])
      .toEqual([["2026-06-01", "2026-06-30"]]);

    await wrapper.setProps({ dateRange: ["2026-07-17", "2026-07-23"] });
    expect(wrapper.get(".sports-summary__primary dd").text()).not.toBe(initialCoverage);
  });
});

function buttonWithText(wrapper: ReturnType<typeof mount>, label: string) {
  const button = wrapper.findAll("button").find((item) => item.text() === label);
  if (!button) throw new Error(`Expected button ${label}`);
  return button;
}
