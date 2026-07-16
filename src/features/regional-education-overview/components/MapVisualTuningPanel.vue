<script setup lang="ts">
import type { DigitalTwinMapTheme } from "../map-themes";
import {
  cloneMapVisualTuning,
  defaultMapVisualTuning,
} from "../rendering/map-visual-tuning";
import type {
  MapVisualColorKey,
  MapVisualTuning,
} from "../rendering/map-visual-tuning";
import { themeColor } from "../rendering/theme-color";

const props = defineProps<{
  modelValue: MapVisualTuning;
  theme: DigitalTwinMapTheme;
}>();
const emit = defineEmits<{ "update:modelValue": [value: MapVisualTuning] }>();
type NumericTuningKey = Exclude<keyof MapVisualTuning, "colorOverrides">;

interface NumericControl {
  key: NumericTuningKey;
  label: string;
  min: number;
  max: number;
  step: number;
}

interface ControlGroup {
  id: string;
  label: string;
  controls: readonly NumericControl[];
}

const controlGroups: readonly ControlGroup[] = [
  {
    id: "composition",
    label: "构图与操作",
    controls: [
      { key: "offsetX", label: "水平偏移", min: -320, max: 240, step: 2 },
      { key: "offsetY", label: "垂直偏移", min: -240, max: 180, step: 2 },
      { key: "scale", label: "整体缩放", min: 0.4, max: 1.4, step: 0.01 },
      { key: "rotationZ", label: "平面旋转", min: -0.5, max: 0.5, step: 0.01 },
      { key: "autoRotationSpeed", label: "自动旋转速度", min: 0.05, max: 1, step: 0.05 },
      { key: "autoRotationResumeDelaySeconds", label: "空闲恢复秒数", min: 2, max: 30, step: 1 },
    ],
  },
  {
    id: "camera",
    label: "三维视角",
    controls: [
      { key: "cameraFov", label: "相机视野", min: 20, max: 55, step: 1 },
      { key: "cameraPositionX", label: "相机 X", min: -1200, max: 1200, step: 2 },
      { key: "cameraPositionY", label: "相机 Y", min: -1200, max: 1200, step: 2 },
      { key: "cameraPositionZ", label: "相机 Z", min: 80, max: 1200, step: 2 },
      { key: "cameraTargetX", label: "焦点 X", min: -500, max: 500, step: 2 },
      { key: "cameraTargetY", label: "焦点 Y", min: -500, max: 500, step: 2 },
      { key: "cameraTargetZ", label: "焦点 Z", min: -100, max: 500, step: 2 },
    ],
  },
  {
    id: "district",
    label: "区域视角",
    controls: [
      { key: "districtThickness", label: "区域厚度", min: 2, max: 50, step: 1 },
      { key: "districtFramingOffsetX", label: "区域构图横移", min: -160, max: 80, step: 2 },
      { key: "districtHoverThickness", label: "悬浮厚度", min: 2, max: 50, step: 1 },
      { key: "districtHoverOpacity", label: "悬浮亮度", min: 0, max: 0.4, step: 0.01 },
    ],
  },
  {
    id: "township",
    label: "下级聚焦",
    controls: [
      { key: "townshipFocusDistance", label: "聚焦距离", min: 280, max: 760, step: 10 },
      { key: "townshipCameraPositionZ", label: "子级相机 Z", min: 40, max: 800, step: 2 },
      { key: "townshipEnergyTowerTargetZ", label: "锥峰焦点 Z", min: -40, max: 160, step: 2 },
      { key: "townshipFocusFramingOffsetX", label: "焦点构图横移", min: -80, max: 180, step: 2 },
      { key: "townshipFocusFramingOffsetY", label: "焦点构图纵移", min: -160, max: 160, step: 2 },
      { key: "townshipFocusThickness", label: "焦点厚度", min: 4, max: 60, step: 1 },
      { key: "townshipFocusHoverThickness", label: "焦点悬浮厚度", min: 4, max: 60, step: 1 },
      { key: "townshipFocusLift", label: "焦点抬升", min: 0, max: 50, step: 1 },
      { key: "townshipSiblingThickness", label: "同级厚度", min: 0.2, max: 12, step: 0.2 },
      { key: "townshipSiblingBaseZ", label: "同级层高", min: -8, max: 24, step: 1 },
      { key: "townshipSiblingHoverThickness", label: "同级悬浮厚度", min: 0.4, max: 18, step: 0.2 },
      { key: "townshipSiblingOverlayOpacity", label: "同级压暗", min: 0, max: 1, step: 0.01 },
      { key: "townshipHoverOpacity", label: "同级高亮", min: 0, max: 0.5, step: 0.01 },
    ],
  },
  {
    id: "environment",
    label: "环境与边界",
    controls: [
      { key: "contextFillOpacity", label: "环境填充", min: 0, max: 0.3, step: 0.005 },
      { key: "contextLineOpacity", label: "环境边界", min: 0, max: 0.6, step: 0.01 },
      { key: "boundarySpeed", label: "流光速度", min: 0.005, max: 0.2, step: 0.005 },
      { key: "boundaryTailLength", label: "流光长度", min: 0.02, max: 0.3, step: 0.01 },
    ],
  },
  {
    id: "surface-material",
    label: "地表与灯光材质",
    controls: [
      { key: "ambientLightIntensity", label: "环境光强度", min: 0, max: 4, step: 0.05 },
      { key: "directionalLightIntensity", label: "方向光强度", min: 0, max: 6, step: 0.1 },
      { key: "regionBaseOpacity", label: "底板透明度", min: 0, max: 1, step: 0.01 },
      { key: "regionTerrainOpacity", label: "地表透明度", min: 0, max: 1, step: 0.01 },
      { key: "regionTerrainRoughness", label: "地表粗糙度", min: 0, max: 1, step: 0.01 },
      { key: "regionTerrainMetalness", label: "地表金属度", min: 0, max: 1, step: 0.01 },
      { key: "regionTerrainNormalScale", label: "法线纹理强度", min: 0, max: 3, step: 0.05 },
      { key: "regionTerrainEmissiveIntensity", label: "地表自发光", min: 0, max: 2, step: 0.02 },
      { key: "regionSideTopOpacity", label: "侧面顶部透明度", min: 0, max: 1, step: 0.01 },
      { key: "regionSideBottomOpacityScale", label: "侧面底部透明度", min: 0, max: 1, step: 0.01 },
      { key: "regionInternalBoundaryOpacityScale", label: "内部边界透明度", min: 0, max: 1, step: 0.01 },
      { key: "regionTopContourOpacity", label: "顶部轮廓透明度", min: 0, max: 1, step: 0.01 },
      { key: "regionBottomContourOpacity", label: "底部轮廓透明度", min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    id: "ambient-ring-material",
    label: "环境光环材质",
    controls: [
      { key: "hudRingPlateOpacityScale", label: "光环面透明度", min: 0, max: 2, step: 0.01 },
      { key: "hudRingTickOpacityScale", label: "光环刻度透明度", min: 0, max: 2, step: 0.01 },
      { key: "hudRingRotationSpeed", label: "光环旋转速度", min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    id: "institution-material",
    label: "学校点位材质",
    controls: [
      { key: "institutionPointSize", label: "普通点位尺寸", min: 4, max: 40, step: 1 },
      { key: "institutionEmphasisPointSize", label: "重点点位尺寸", min: 4, max: 60, step: 1 },
      { key: "institutionHaloInnerRadius", label: "点位光晕内径", min: 0.05, max: 0.49, step: 0.01 },
      { key: "institutionCoreRadius", label: "点位光核半径", min: 0.02, max: 0.48, step: 0.01 },
      { key: "institutionHaloOpacity", label: "普通光晕亮度", min: 0, max: 1, step: 0.01 },
      { key: "institutionEmphasisHaloOpacity", label: "重点光晕亮度", min: 0, max: 1, step: 0.01 },
      { key: "institutionRippleOpacityScale", label: "局端涟漪亮度", min: 0, max: 3, step: 0.05 },
      { key: "institutionRippleSpeed", label: "局端涟漪速度", min: 0, max: 1, step: 0.01 },
      { key: "institutionRippleStartScale", label: "涟漪初始缩放", min: 0, max: 3, step: 0.05 },
      { key: "institutionRippleScaleRange", label: "涟漪扩散范围", min: 0, max: 3, step: 0.05 },
    ],
  },
  {
    id: "connection-material",
    label: "飞线材质",
    controls: [
      { key: "connectionBaseOpacity", label: "飞线底轨亮度", min: 0, max: 0.5, step: 0.01 },
      { key: "connectionFlowOpacityScale", label: "流光整体亮度", min: 0, max: 3, step: 0.05 },
      { key: "connectionFlowSpeed", label: "飞线流光速度", min: 0.01, max: 1, step: 0.01 },
      { key: "connectionTailLength", label: "流光尾迹长度", min: 0.02, max: 0.8, step: 0.01 },
      { key: "connectionCoreLength", label: "流光核心长度", min: 0.005, max: 0.2, step: 0.005 },
      { key: "connectionTailStrength", label: "尾迹亮度占比", min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    id: "district-energy-tower",
    label: "区级锥峰",
    controls: [
      { key: "energyTowerDistrictMinimumHeight", label: "区级最小高度", min: 10, max: 120, step: 1 },
      { key: "energyTowerDistrictMaximumHeight", label: "区级最大高度", min: 40, max: 320, step: 2 },
      { key: "energyTowerDistrictRadius", label: "区级底座半径", min: 4, max: 60, step: 1 },
    ],
  },
  {
    id: "township-energy-tower",
    label: "子级锥峰",
    controls: [
      { key: "energyTowerTownshipMinimumHeight", label: "子级最小高度", min: 8, max: 100, step: 1 },
      { key: "energyTowerTownshipMaximumHeight", label: "子级最大高度", min: 30, max: 240, step: 2 },
      { key: "energyTowerTownshipRadius", label: "子级底座半径", min: 3, max: 40, step: 1 },
      { key: "energyTowerTownshipGridCellSizeDegrees", label: "网格经纬跨度", min: 0.005, max: 0.08, step: 0.005 },
    ],
  },
  {
    id: "energy-tower-material",
    label: "锥峰材质与动画",
    controls: [
      { key: "energyTowerHeightExponent", label: "数量高度曲线", min: 0.3, max: 2.5, step: 0.05 },
      { key: "energyTowerCurveFactor", label: "锥体收束", min: 1, max: 10, step: 0.1 },
      { key: "energyTowerRevealRate", label: "显隐速度", min: 0.5, max: 10, step: 0.1 },
      { key: "energyTowerLabelCycleSeconds", label: "卡片轮播秒数", min: 2, max: 15, step: 1 },
      { key: "energyTowerVerticalGridCount", label: "纵向网格数", min: 2, max: 30, step: 1 },
      { key: "energyTowerRingGridCount", label: "环形网格数", min: 2, max: 40, step: 1 },
      { key: "energyTowerFadeFloor", label: "底部渐变起点", min: 0, max: 0.4, step: 0.01 },
      { key: "energyTowerFadeEnd", label: "底部渐变范围", min: 0.05, max: 0.8, step: 0.01 },
      { key: "energyTowerGlowRadiusScale", label: "光晕范围", min: 0.5, max: 4, step: 0.1 },
      { key: "energyTowerGlowOpacity", label: "光晕亮度", min: 0, max: 1, step: 0.01 },
      { key: "energyTowerGlowMidpoint", label: "光晕衰减点", min: 0.05, max: 0.9, step: 0.01 },
      { key: "energyTowerGlowMidAlpha", label: "光晕中段亮度", min: 0, max: 1, step: 0.01 },
      { key: "energyTowerGridLineWidth", label: "网格线宽度", min: 0.01, max: 0.4, step: 0.01 },
      { key: "energyTowerBaseColorStrength", label: "锥体基础亮度", min: 0, max: 2, step: 0.02 },
      { key: "energyTowerHeightColorStrength", label: "高度渐亮强度", min: 0, max: 3, step: 0.02 },
      { key: "energyTowerGridColorStrength", label: "网格发光强度", min: 0, max: 3, step: 0.02 },
      { key: "energyTowerTipGlowExponent", label: "顶部聚光曲线", min: 0.2, max: 6, step: 0.1 },
      { key: "energyTowerTipGlowStrength", label: "顶部聚光强度", min: 0, max: 5, step: 0.05 },
      { key: "energyTowerHoverColorStrength", label: "悬浮增亮强度", min: 0, max: 3, step: 0.05 },
      { key: "energyTowerBaseOpacity", label: "锥体基础透明度", min: 0, max: 1, step: 0.01 },
      { key: "energyTowerHeightOpacity", label: "高度透明增量", min: 0, max: 1, step: 0.01 },
      { key: "energyTowerGridOpacity", label: "网格透明增量", min: 0, max: 1, step: 0.01 },
      { key: "energyTowerHoverOpacity", label: "悬浮透明增量", min: 0, max: 1, step: 0.01 },
    ],
  },
];

const colorControls: ReadonlyArray<{
  key: MapVisualColorKey;
  label: string;
  themeKey: keyof DigitalTwinMapTheme;
}> = [
  { key: "regionTop", label: "地表", themeKey: "topFill" },
  { key: "sideTop", label: "侧面顶部", themeKey: "sideTop" },
  { key: "sideBottom", label: "侧面底部", themeKey: "sideBottom" },
  { key: "outline", label: "外轮廓", themeKey: "outline" },
  { key: "internalLine", label: "内部边界", themeKey: "internalLine" },
  { key: "hover", label: "悬浮高亮", themeKey: "primary" },
  { key: "inactiveRegion", label: "同级压暗", themeKey: "pageBackground" },
  { key: "contextFill", label: "环境填充", themeKey: "labelText" },
  { key: "contextLine", label: "环境边界", themeKey: "labelText" },
  { key: "boundaryHead", label: "流光头部", themeKey: "chaseLightHead" },
  { key: "boundaryTail", label: "流光尾部", themeKey: "chaseLightTail" },
  { key: "hudRing", label: "环境光环", themeKey: "hudRing" },
  { key: "institutionDefault", label: "普通学校点位", themeKey: "labelText" },
  { key: "institutionSelected", label: "选中学校点位", themeKey: "primary" },
  { key: "institutionBureau", label: "教育局点位", themeKey: "scatter" },
  { key: "institutionRipple", label: "教育局涟漪", themeKey: "ripple" },
  { key: "connection", label: "学校飞线", themeKey: "flyLine" },
  { key: "energyTower", label: "能量锥峰", themeKey: "primary" },
  { key: "energyTowerGlow", label: "锥峰底部光晕", themeKey: "primary" },
];

function updateValue(key: NumericTuningKey, event: Event) {
  const value = Number((event.target as HTMLInputElement).value);
  emit("update:modelValue", { ...props.modelValue, [key]: value });
}

function updateColor(key: MapVisualColorKey, event: Event) {
  emit("update:modelValue", {
    ...props.modelValue,
    colorOverrides: {
      ...props.modelValue.colorOverrides,
      [key]: (event.target as HTMLInputElement).value,
    },
  });
}

function resetColor(key: MapVisualColorKey) {
  const colorOverrides = { ...props.modelValue.colorOverrides };
  delete colorOverrides[key];
  emit("update:modelValue", { ...props.modelValue, colorOverrides });
}

function colorValue(key: MapVisualColorKey, themeKey: keyof DigitalTwinMapTheme) {
  const value = props.modelValue.colorOverrides[key] ?? String(props.theme[themeKey]);
  return `#${themeColor(value).color.getHexString()}`;
}

function formatValue(value: number, step: number) {
  return step < 0.01 ? value.toFixed(3) : step < 1 ? value.toFixed(2) : String(value);
}
</script>

<template>
  <details class="map-tuning-panel">
    <summary>地图调试</summary>
    <div class="tuning-panel-content">
      <details
        v-for="(group, groupIndex) in controlGroups"
        :key="group.id"
        class="tuning-group"
        :open="groupIndex === 0"
      >
        <summary>{{ group.label }}</summary>
        <div class="tuning-controls">
          <label v-for="control in group.controls" :key="control.key">
            <span>{{ control.label }}</span>
            <input
              type="range"
              :aria-label="control.label"
              :value="modelValue[control.key]"
              :min="control.min"
              :max="control.max"
              :step="control.step"
              @input="updateValue(control.key, $event)"
            >
            <output>{{ formatValue(modelValue[control.key], control.step) }}</output>
          </label>
        </div>
      </details>

      <details class="tuning-group">
        <summary>颜色覆盖</summary>
        <div class="color-controls">
          <label v-for="control in colorControls" :key="control.key">
            <span>{{ control.label }}</span>
            <input
              type="color"
              :aria-label="`${control.label}颜色`"
              :value="colorValue(control.key, control.themeKey)"
              @input="updateColor(control.key, $event)"
            >
            <button
              type="button"
              :disabled="!modelValue.colorOverrides[control.key]"
              @click="resetColor(control.key)"
            >跟随主题</button>
          </label>
        </div>
      </details>

      <p class="pan-hint">左键旋转，滚轮缩放；地图平移已关闭。</p>
      <button
        class="reset-button"
        type="button"
        @click="emit('update:modelValue', cloneMapVisualTuning(defaultMapVisualTuning))"
      >
        恢复默认参数
      </button>
    </div>
  </details>
</template>

<style scoped>
.map-tuning-panel {
  position: absolute;
  bottom: calc(var(--dt-statusbar-height) + var(--dt-control-height) + var(--dt-space-6));
  left: var(--dt-space-10);
  z-index: calc(var(--dt-z-hud) + 2);
  width: var(--dt-tuning-panel-width);
  border: var(--dt-border-width) solid var(--dt-color-border-subtle);
  border-radius: var(--dt-radius-sm);
  background: var(--dt-color-panel);
  color: var(--dt-color-text);
  font-size: var(--dt-font-size-xs);
  box-shadow: var(--dt-panel-shadow);
  backdrop-filter: blur(var(--dt-panel-blur));
  pointer-events: auto;
}

.map-tuning-panel > summary {
  min-height: var(--dt-control-height);
  padding: 0 var(--dt-space-3);
  color: var(--dt-color-text-secondary);
  line-height: var(--dt-control-height);
  cursor: pointer;
  list-style: none;
}

.map-tuning-panel summary::-webkit-details-marker { display: none; }
.map-tuning-panel > summary::after { float: right; color: var(--dt-color-accent); content: "+"; }
.map-tuning-panel[open] > summary::after { content: "−"; }

.tuning-panel-content {
  display: grid;
  max-height: min(62vh, var(--dt-tuning-panel-max-height));
  border-top: var(--dt-border-width) solid var(--dt-color-line-soft);
  padding: var(--dt-space-2);
  overflow: auto;
  gap: var(--dt-space-2);
}

.tuning-group {
  border: var(--dt-border-width) solid var(--dt-color-border-subtle);
  border-radius: var(--dt-radius-xs);
  background: var(--dt-color-panel-soft);
}

.tuning-group > summary {
  min-height: var(--dt-tuning-group-height);
  padding: 0 var(--dt-space-2);
  color: var(--dt-color-text-secondary);
  line-height: var(--dt-tuning-group-height);
  cursor: pointer;
  list-style: none;
}

.tuning-group > summary::after { float: right; color: var(--dt-color-text-muted); content: "+"; }
.tuning-group[open] > summary::after { content: "−"; }

.tuning-controls,
.color-controls {
  display: grid;
  border-top: var(--dt-border-width) solid var(--dt-color-line-soft);
  padding: var(--dt-space-2);
  gap: var(--dt-space-2);
}

.tuning-controls label {
  display: grid;
  grid-template-columns: var(--dt-tuning-label-width) minmax(0, 1fr) var(--dt-tuning-value-width);
  align-items: center;
  gap: var(--dt-space-2);
}

.tuning-controls label span,
.color-controls label span { color: var(--dt-color-text-secondary); }
.tuning-controls input { width: 100%; accent-color: var(--dt-color-accent); }
.tuning-controls output { font-variant-numeric: tabular-nums; text-align: right; }

.color-controls label {
  display: grid;
  grid-template-columns: 1fr var(--dt-tuning-color-width) var(--dt-tuning-color-action-width);
  align-items: center;
  gap: var(--dt-space-2);
}

.color-controls input {
  width: var(--dt-tuning-color-width);
  height: var(--dt-tuning-color-height);
  border: 0;
  padding: 0;
  background: transparent;
}

.color-controls button,
.reset-button {
  min-height: 26px;
  border: var(--dt-border-width) solid var(--dt-color-border-muted);
  border-radius: var(--dt-radius-xs);
  background: var(--dt-color-panel-soft);
  color: var(--dt-color-text-secondary);
  font: inherit;
  cursor: pointer;
}

.color-controls button:disabled { opacity: 0.35; cursor: default; }
.pan-hint { margin: 0; color: var(--dt-color-text-muted); line-height: var(--dt-line-height-sm); }
.reset-button { min-height: var(--dt-control-height); }

@media (max-width: 1180px) {
  .map-tuning-panel { left: var(--dt-space-6); }
}
</style>
