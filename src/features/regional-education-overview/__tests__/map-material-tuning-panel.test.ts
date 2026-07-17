import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import MapMaterialTuningPanel from "../components/MapMaterialTuningPanel.vue";
import { getDigitalTwinMapTheme } from "../map-themes";
import { defaultMapVisualTuning } from "../rendering/map-visual-tuning";

describe("MapMaterialTuningPanel", () => {
  it("edits standard material, theme, and tower parameters in real time", async () => {
    const wrapper = mount(MapMaterialTuningPanel, {
      props: {
        tuning: defaultMapVisualTuning,
        theme: getDigitalTwinMapTheme("spectrum"),
      },
    });

    await wrapper.get(".material-tuning__trigger").trigger("click");
    expect(wrapper.get('[aria-label="地图材质调试"]').element).toBeInstanceOf(HTMLElement);

    const surfaceOpacity = wrapper.findAll<HTMLInputElement>('input[type="range"]')[0]!;
    await surfaceOpacity.setValue("0.42");
    let tuningEvents = wrapper.emitted("update:tuning") ?? [];
    expect(tuningEvents[tuningEvents.length - 1]?.[0]).toMatchObject({
      regionTerrainOpacity: 0.42,
    });

    const surfaceVariationRow = wrapper.findAll(".material-tuning__row")
      .find((row) => row.text().includes("分区明暗变化"));
    expect(surfaceVariationRow).toBeDefined();
    await surfaceVariationRow!.get('input[type="range"]').setValue("0.08");
    tuningEvents = wrapper.emitted("update:tuning") ?? [];
    expect(tuningEvents[tuningEvents.length - 1]?.[0]).toMatchObject({
      regionTerrainVariationStrength: 0.08,
    });

    await wrapper.get<HTMLInputElement>('[aria-label="行政区顶面颜色"]').setValue("#112233");
    let themeEvents = wrapper.emitted("update:theme") ?? [];
    expect(themeEvents[themeEvents.length - 1]?.[0]).toMatchObject({
      topFill: "#112233",
    });

    await wrapper.get<HTMLInputElement>('[aria-label="行政区底面颜色"]').setValue("#223344");
    themeEvents = wrapper.emitted("update:theme") ?? [];
    expect(themeEvents[themeEvents.length - 1]?.[0]).toMatchObject({
      bottomFill: "#223344",
    });

    await wrapper.get<HTMLInputElement>('[aria-label="外部地面颜色"]').setValue("#445566");
    themeEvents = wrapper.emitted("update:theme") ?? [];
    expect(themeEvents[themeEvents.length - 1]?.[0]).toMatchObject({
      contextFill: "#445566",
    });

    const contextOpacityRow = wrapper.findAll(".material-tuning__row")
      .find((row) => row.text().includes("外部地面透明度"));
    expect(contextOpacityRow).toBeDefined();
    await contextOpacityRow!.get('input[type="range"]').setValue("0.16");
    themeEvents = wrapper.emitted("update:theme") ?? [];
    expect(themeEvents[themeEvents.length - 1]?.[0]).toMatchObject({
      contextFillOpacity: 0.16,
    });

    await wrapper.get<HTMLInputElement>('[aria-label="网格层底色"]').setValue("#334455");
    tuningEvents = wrapper.emitted("update:tuning") ?? [];
    expect(tuningEvents[tuningEvents.length - 1]?.[0]).toMatchObject({
      colorOverrides: { groundFill: "#334455" },
    });

    const groundFillOpacityRow = wrapper.findAll(".material-tuning__row")
      .find((row) => row.text().includes("网格层底色透明度"));
    expect(groundFillOpacityRow).toBeDefined();
    await groundFillOpacityRow!.get('input[type="range"]').setValue("0.72");
    tuningEvents = wrapper.emitted("update:tuning") ?? [];
    expect(tuningEvents[tuningEvents.length - 1]?.[0]).toMatchObject({
      groundFillOpacity: 0.72,
    });

    await wrapper.get<HTMLInputElement>('[aria-label="背景网格颜色"]').setValue("#556677");
    tuningEvents = wrapper.emitted("update:tuning") ?? [];
    expect(tuningEvents[tuningEvents.length - 1]?.[0]).toMatchObject({
      colorOverrides: { groundGrid: "#556677" },
    });

    const groundGridOpacityRow = wrapper.findAll(".material-tuning__row")
      .find((row) => row.text().includes("背景网格透明度"));
    expect(groundGridOpacityRow).toBeDefined();
    await groundGridOpacityRow!.get('input[type="range"]').setValue("0.24");
    tuningEvents = wrapper.emitted("update:tuning") ?? [];
    expect(tuningEvents[tuningEvents.length - 1]?.[0]).toMatchObject({
      groundGridOpacity: 0.24,
    });

    expect(wrapper.text()).not.toContain("折射率 IOR");
    expect(wrapper.text()).not.toContain("金属度");

    const defaultMarkerOpacityRow = wrapper.findAll(".material-tuning__row")
      .find((row) => row.text().includes("默认透明度"));
    expect(defaultMarkerOpacityRow).toBeDefined();
    await defaultMarkerOpacityRow!.get('input[type="range"]').setValue("0.6");
    tuningEvents = wrapper.emitted("update:tuning") ?? [];
    expect(tuningEvents[tuningEvents.length - 1]?.[0]).toMatchObject({
      institutionDefaultOpacity: 0.6,
    });

    const schoolCycleRow = wrapper.findAll(".material-tuning__row")
      .find((row) => row.text().includes("学校轮播间隔"));
    expect(schoolCycleRow).toBeDefined();
    await schoolCycleRow!.get('input[type="range"]').setValue("6.5");
    tuningEvents = wrapper.emitted("update:tuning") ?? [];
    expect(tuningEvents[tuningEvents.length - 1]?.[0]).toMatchObject({
      institutionSelectionCycleSeconds: 6.5,
    });

    const connectionOffsetRow = wrapper.findAll(".material-tuning__row")
      .find((row) => row.text().includes("离地高度"));
    expect(connectionOffsetRow).toBeDefined();
    await connectionOffsetRow!.get('input[type="range"]').setValue("1.4");
    tuningEvents = wrapper.emitted("update:tuning") ?? [];
    expect(tuningEvents[tuningEvents.length - 1]?.[0]).toMatchObject({
      connectionSurfaceOffset: 1.4,
    });

    const towerOpacityRow = wrapper.findAll(".material-tuning__row")
      .find((row) => row.text().includes("锥体基础透明度"));
    expect(towerOpacityRow).toBeDefined();
    await towerOpacityRow!.get('input[type="range"]').setValue("0.58");
    tuningEvents = wrapper.emitted("update:tuning") ?? [];
    expect(tuningEvents[tuningEvents.length - 1]?.[0]).toMatchObject({
      energyTowerBaseOpacity: 0.58,
    });

    await wrapper.get<HTMLInputElement>('[aria-label="多量顶色"]').setValue("#ffeedd");
    themeEvents = wrapper.emitted("update:theme") ?? [];
    expect(themeEvents[themeEvents.length - 1]?.[0]).toMatchObject({
      swatches: ["#0D2AC2", "#00FFD5", "#FFC800", "#FFEEDD"],
      energyTowerPalette: { high: "#FFEEDD" },
    });

    await wrapper.get<HTMLInputElement>('[aria-label="侧边顶部颜色"]').setValue("#aabbcc");
    themeEvents = wrapper.emitted("update:theme") ?? [];
    expect(themeEvents[themeEvents.length - 1]?.[0]).toMatchObject({
      sideTop: "#AABBCC",
    });

    await wrapper.get("header button").trigger("click");
    tuningEvents = wrapper.emitted("update:tuning") ?? [];
    expect(tuningEvents[tuningEvents.length - 1]?.[0]).toMatchObject({
      regionTerrainEmissiveIntensity: 0,
      regionTerrainVariationStrength: 0.05,
      energyTowerBaseOpacity: 0.9,
      institutionDefaultOpacity: 0.56,
      institutionSelectionCycleSeconds: 5,
      connectionSurfaceOffset: 2.2,
    });
    themeEvents = wrapper.emitted("update:theme") ?? [];
    expect(themeEvents[themeEvents.length - 1]?.[0]).toMatchObject({
      id: "spectrum",
      sideTop: "#0071DB",
      contextFill: "#707070",
      contextFillOpacity: 0.06,
      energyTowerPalette: { bottomOpacity: 0.24 },
    });
  });
});
