import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import MapVisualTuningPanel from "../components/MapVisualTuningPanel.vue";
import { defaultMapVisualTuning } from "../rendering/map-visual-tuning";
import {
  mapCameraViewFromTuning,
  mapVisualTuningWithCameraView,
} from "../rendering/map-visual-tuning";
import { getDigitalTwinMapTheme } from "../map-themes";

describe("MapVisualTuningPanel", () => {
  it("keeps the reviewed district and township presentation defaults", () => {
    expect(defaultMapVisualTuning).toMatchObject({
      offsetX: -60,
      contextFillOpacity: 0.07,
      districtThickness: 7,
      districtHoverLift: 6,
      districtHoverOpacity: 0.4,
      cameraPositionX: 34,
      cameraPositionY: -760,
      cameraPositionZ: 520,
      cameraTargetX: -16,
      cameraTargetY: -42,
      cameraTargetZ: 8,
      townshipFocusThickness: 16,
      townshipFocusFramingOffsetY: -40,
      townshipFocusLift: 0,
      townshipSiblingBaseZ: 14,
      townshipSiblingHoverThickness: 4,
      townshipSiblingHoverLift: 5,
      townshipSiblingOverlayOpacity: 0.5,
      colorOverrides: {
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
});
