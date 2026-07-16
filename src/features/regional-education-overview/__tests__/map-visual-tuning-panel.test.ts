import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import MapVisualTuningPanel from "../components/MapVisualTuningPanel.vue";
import { defaultMapVisualTuning } from "../rendering/map-visual-tuning";
import {
  energyTowerTuningChanged,
  mapCameraViewFromTuning,
  mapVisualTuningWithCameraView,
} from "../rendering/map-visual-tuning";
import { getDigitalTwinMapTheme } from "../map-themes";

describe("MapVisualTuningPanel", () => {
  it("uses the reviewed side gradient colors for every map theme", () => {
    expect(getDigitalTwinMapTheme("lime")).toMatchObject({
      sideTop: "#28E28B",
      sideBottom: "#E1FF00",
    });
    expect(getDigitalTwinMapTheme("cyan")).toMatchObject({
      sideTop: "#00EEFF",
      sideBottom: "#0AFFD6",
    });
    expect(getDigitalTwinMapTheme("amber")).toMatchObject({
      sideTop: "#FFF700",
      sideBottom: "#FA9E00",
    });
  });

  it("keeps the reviewed district and township presentation defaults", () => {
    expect(defaultMapVisualTuning).toMatchObject({
      offsetX: -60,
      offsetY: -30,
      autoRotationSpeed: 0.2,
      autoRotationResumeDelaySeconds: 10,
      contextFillOpacity: 0.07,
      ambientLightIntensity: 1.35,
      regionTerrainOpacity: 1,
      regionTerrainRoughness: 0.94,
      regionTerrainMetalness: 0.8,
      regionTerrainEmissiveIntensity: 0.12,
      regionSideTopOpacity: 0.86,
      regionTopContourOpacity: 0.7,
      regionBottomContourOpacity: 0.52,
      districtThickness: 7,
      districtFramingOffsetX: -48,
      districtHoverThickness: 12,
      districtHoverOpacity: 0.4,
      cameraPositionX: 34,
      cameraPositionY: -760,
      cameraPositionZ: 520,
      cameraTargetX: -16,
      cameraTargetY: -42,
      cameraTargetZ: 8,
      townshipFocusThickness: 16,
      townshipCameraPositionZ: 80,
      townshipEnergyTowerTargetZ: 32,
      townshipFocusHoverThickness: 20,
      townshipFocusFramingOffsetX: 60,
      townshipFocusFramingOffsetY: -40,
      townshipFocusLift: 0,
      townshipSiblingBaseZ: 14,
      townshipSiblingHoverThickness: 4,
      townshipSiblingOverlayOpacity: 0.5,
      energyTowerDistrictMinimumHeight: 32,
      energyTowerDistrictRadius: 36,
      energyTowerTownshipMinimumHeight: 18,
      energyTowerTownshipMaximumHeight: 120,
      energyTowerTownshipRadius: 20,
      energyTowerTownshipGridCellSizeDegrees: 0.025,
      energyTowerCurveFactor: 6.5,
      energyTowerVerticalGridCount: 8,
      energyTowerFadeFloor: 0.02,
      energyTowerFadeEnd: 0.09,
      energyTowerGlowRadiusScale: 0.7,
      energyTowerGlowOpacity: 0.83,
      energyTowerGlowMidpoint: 0.36,
      energyTowerGlowMidAlpha: 0.53,
      energyTowerGridLineWidth: 0.08,
      energyTowerTipGlowStrength: 1.8,
      energyTowerLabelCycleSeconds: 5,
      institutionPointSize: 20,
      institutionEmphasisPointSize: 30,
      institutionHaloInnerRadius: 0.49,
      institutionRippleOpacityScale: 3,
      institutionRippleSpeed: 0.24,
      institutionRippleStartScale: 0,
      connectionBaseOpacity: 0.3,
      connectionFlowOpacityScale: 3,
      connectionFlowSpeed: 0.18,
      connectionTailLength: 0.18,
      hudRingRotationSpeed: 0.18,
      colorOverrides: {
        institutionDefault: "#FFFFFF",
        internalLine: "#363A44",
        outline: "#363A44",
      },
    });
  });

  it("round-trips editable camera position and target axes", () => {
    const changed = mapVisualTuningWithCameraView(defaultMapVisualTuning, {
      fov: 36,
      position: [120, -640, 460],
      target: [18, -20, 34],
    });

    expect(mapCameraViewFromTuning(changed)).toEqual({
      fov: 36,
      position: [120, -640, 460],
      target: [18, -20, 34],
    });
  });

  it("emits immutable temporary tuning updates and can restore defaults", async () => {
    const modelValue = { ...defaultMapVisualTuning, colorOverrides: {} };
    const wrapper = mount(MapVisualTuningPanel, {
      props: { modelValue, theme: getDigitalTwinMapTheme("cyan") },
    });
    const offsetControl = wrapper.get('input[type="range"]');

    await offsetControl.setValue("-120");
    const update = wrapper.emitted("update:modelValue")?.[0]?.[0];
    expect(update).toMatchObject({ offsetX: -120, offsetY: modelValue.offsetY });
    expect(modelValue.offsetX).toBe(defaultMapVisualTuning.offsetX);

    await wrapper.get("button.reset-button").trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[1]?.[0]).toEqual(defaultMapVisualTuning);
  });

  it("can override a renderer color without mutating the active theme", async () => {
    const theme = getDigitalTwinMapTheme("amber");
    const wrapper = mount(MapVisualTuningPanel, {
      props: {
        modelValue: { ...defaultMapVisualTuning, colorOverrides: {} },
        theme,
      },
    });
    await wrapper.get("details.tuning-group:last-of-type > summary").trigger("click");
    await wrapper.get('input[aria-label="地表颜色"]').setValue("#123456");

    expect(wrapper.emitted("update:modelValue")?.[0]?.[0]).toMatchObject({
      colorOverrides: { regionTop: "#123456" },
    });
    expect(theme.topFill).toBe("#19140E");
  });

  it("exposes energy tower geometry, grid, material, and animation controls", async () => {
    const wrapper = mount(MapVisualTuningPanel, {
      props: {
        modelValue: { ...defaultMapVisualTuning, colorOverrides: {} },
        theme: getDigitalTwinMapTheme("cyan"),
      },
    });

    const gridControl = wrapper.get('input[aria-label="网格经纬跨度"]');
    await gridControl.setValue("0.04");
    const update = wrapper.emitted("update:modelValue")?.[0]?.[0];

    expect(update).toMatchObject({ energyTowerTownshipGridCellSizeDegrees: 0.04 });
    expect(wrapper.find('input[aria-label="区级底座半径"]').exists()).toBe(true);
    expect(wrapper.find('input[aria-label="子级底座半径"]').exists()).toBe(true);
    expect(wrapper.find('input[aria-label="锥体收束"]').exists()).toBe(true);
    expect(wrapper.find('input[aria-label="显隐速度"]').exists()).toBe(true);
    expect(wrapper.get('input[aria-label="卡片轮播秒数"]').attributes("value")).toBe("5");
    expect(wrapper.get('input[aria-label="自动旋转速度"]').attributes("value")).toBe("0.2");
    expect(wrapper.get('input[aria-label="空闲恢复秒数"]').attributes("value")).toBe("10");
    expect(wrapper.get('input[aria-label="子级相机 Z"]').attributes("value")).toBe("80");
    expect(wrapper.get('input[aria-label="锥峰焦点 Z"]').attributes("value")).toBe("32");
    expect(energyTowerTuningChanged(defaultMapVisualTuning, update as typeof defaultMapVisualTuning))
      .toBe(true);
    expect(energyTowerTuningChanged(defaultMapVisualTuning, {
      ...defaultMapVisualTuning,
      energyTowerGridLineWidth: 0.2,
    })).toBe(false);
  });

  it("exposes artist-facing surface, point, connection, ring, and tower materials", () => {
    const wrapper = mount(MapVisualTuningPanel, {
      props: {
        modelValue: { ...defaultMapVisualTuning, colorOverrides: {} },
        theme: getDigitalTwinMapTheme("royal"),
      },
    });

    for (const label of [
      "地表粗糙度",
      "地表金属度",
      "法线纹理强度",
      "侧面顶部透明度",
      "顶部轮廓透明度",
      "光环旋转速度",
      "普通点位尺寸",
      "点位光核半径",
      "流光尾迹长度",
      "网格线宽度",
      "顶部聚光强度",
      "锥体基础透明度",
    ]) {
      expect(wrapper.find(`input[aria-label="${label}"]`).exists()).toBe(true);
    }
    for (const label of [
      "普通学校点位颜色",
      "学校飞线颜色",
      "能量锥峰颜色",
      "锥峰底部光晕颜色",
    ]) {
      expect(wrapper.find(`input[aria-label="${label}"]`).exists()).toBe(true);
    }
  });
});
