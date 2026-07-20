<script setup lang="ts">
import { ref } from "vue";
import { SlidersHorizontal } from "@lucide/vue";
import {
  cloneDigitalTwinMapTheme,
  getDigitalTwinMapTheme,
} from "../map-themes";
import type { DigitalTwinMapTheme } from "../map-themes";
import {
  cloneMapVisualTuning,
  defaultMapVisualTuning,
} from "../rendering/map-visual-tuning";
import type { MapVisualTuning } from "../rendering/map-visual-tuning";

type NumericTuningKey = {
  [Key in keyof MapVisualTuning]: MapVisualTuning[Key] extends number ? Key : never;
}[keyof MapVisualTuning];

interface NumericControl {
  key: NumericTuningKey;
  label: string;
  min: number;
  max: number;
  step: number;
}

const props = defineProps<{
  tuning: Readonly<MapVisualTuning>;
  theme: Readonly<DigitalTwinMapTheme>;
}>();

const emit = defineEmits<{
  "update:tuning": [tuning: MapVisualTuning];
  "update:theme": [theme: DigitalTwinMapTheme];
}>();

const expanded = ref(false);

const surfaceControls: NumericControl[] = [
  { key: "regionTerrainOpacity", label: "表面透明度", min: 0.05, max: 1, step: 0.01 },
  { key: "regionTerrainVariationStrength", label: "分区明暗变化", min: 0, max: 0.15, step: 0.01 },
  { key: "regionTerrainEmissiveIntensity", label: "自发光", min: 0, max: 1.5, step: 0.01 },
];

const groundSurfaceControls: NumericControl[] = [
  { key: "groundFillOpacity", label: "网格层底色透明度", min: 0, max: 1, step: 0.01 },
  { key: "groundGridOpacity", label: "背景网格透明度", min: 0, max: 1, step: 0.01 },
];

const sideControls: NumericControl[] = [
  { key: "regionSideTopOpacity", label: "侧边顶部透明度", min: 0, max: 1, step: 0.01 },
  { key: "regionSideBottomOpacityScale", label: "侧边底部透明度", min: 0, max: 1, step: 0.01 },
];

const autoTourControls: NumericControl[] = [
  { key: "autoFocusDistrictDwellSeconds", label: "区级停留时间", min: 30, max: 600, step: 30 },
  { key: "autoFocusTownshipDwellSeconds", label: "子集停留时间", min: 10, max: 60, step: 5 },
];

const towerOpacityControls: NumericControl[] = [
  { key: "energyTowerBaseOpacity", label: "锥体基础透明度", min: 0, max: 1, step: 0.01 },
  { key: "energyTowerHeightOpacity", label: "高度透明增量", min: 0, max: 1, step: 0.01 },
  { key: "energyTowerGridOpacity", label: "网格透明增量", min: 0, max: 1, step: 0.01 },
  { key: "energyTowerHoverOpacity", label: "悬停透明增量", min: 0, max: 1, step: 0.01 },
  { key: "energyTowerGlowOpacity", label: "底部光晕透明度", min: 0, max: 1, step: 0.01 },
];

const schoolMarkerControls: NumericControl[] = [
  { key: "institutionDefaultOpacity", label: "默认透明度", min: 0.1, max: 1, step: 0.01 },
  { key: "institutionSelectedOpacity", label: "选中透明度", min: 0.1, max: 1, step: 0.01 },
  { key: "institutionPointSize", label: "普通顶标尺寸", min: 8, max: 40, step: 1 },
  { key: "institutionEmphasisPointSize", label: "选中顶标尺寸", min: 10, max: 50, step: 1 },
  { key: "institutionDistrictPointScale", label: "区级顶标缩放", min: 0.4, max: 1, step: 0.01 },
  { key: "institutionStemStartHeight", label: "立杆起点高度", min: 0, max: 6, step: 0.1 },
  { key: "institutionDistrictStemHeight", label: "区级立杆高度", min: 4, max: 60, step: 1 },
  { key: "institutionTownshipStemHeight", label: "子级立杆高度", min: 4, max: 40, step: 1 },
  { key: "institutionSelectedStemHeightScale", label: "选中高度倍数", min: 1, max: 3, step: 0.05 },
  { key: "institutionStemTransitionRate", label: "高度生长速度", min: 1, max: 16, step: 0.5 },
  { key: "institutionSelectionCycleSeconds", label: "学校轮播间隔", min: 1, max: 15, step: 0.5 },
  { key: "institutionHaloInnerRadius", label: "顶标光晕半径", min: 0.2, max: 0.5, step: 0.01 },
  { key: "institutionCoreRadius", label: "顶标核心半径", min: 0.05, max: 0.3, step: 0.01 },
  { key: "institutionHaloOpacity", label: "默认光晕透明度", min: 0, max: 1, step: 0.01 },
  { key: "institutionEmphasisHaloOpacity", label: "选中光晕透明度", min: 0, max: 1, step: 0.01 },
];

const bureauMarkerControls: NumericControl[] = [
  { key: "institutionBureauPointSize", label: "教育局顶标尺寸", min: 12, max: 60, step: 1 },
  { key: "institutionBureauStemHeight", label: "教育局立杆高度", min: 10, max: 80, step: 1 },
  { key: "institutionRippleOpacityScale", label: "地面涟漪透明度", min: 0, max: 5, step: 0.1 },
  { key: "institutionRippleSpeed", label: "地面涟漪速度", min: 0.05, max: 1, step: 0.01 },
  { key: "institutionRippleStartScale", label: "地面涟漪起始尺寸", min: 0, max: 1, step: 0.05 },
  { key: "institutionRippleScaleRange", label: "地面涟漪扩散范围", min: 0.2, max: 3, step: 0.05 },
];

const connectionControls: NumericControl[] = [
  { key: "connectionSurfaceOffset", label: "离地高度", min: 0.2, max: 10, step: 0.1 },
  { key: "connectionMinimumArcHeight", label: "最小弧高", min: 0, max: 60, step: 0.5 },
  { key: "connectionArcHeightFactor", label: "距离弧高系数", min: 0, max: 0.08, step: 0.001 },
  { key: "connectionBaseOpacity", label: "基础线透明度", min: 0, max: 1, step: 0.01 },
  { key: "connectionFlowOpacityScale", label: "流动光点透明度", min: 0, max: 3, step: 0.05 },
  { key: "connectionFlowSpeed", label: "流动速度", min: 0.02, max: 1, step: 0.01 },
  { key: "connectionPulseWidth", label: "流动光点长度", min: 0.02, max: 0.3, step: 0.005 },
  { key: "connectionRevealRate", label: "飞线淡入速度", min: 1, max: 12, step: 0.5 },
];

type PaletteColorKey = "base" | "low" | "medium" | "high";

function updateThemeColor(
  key: "topFill" | "bottomFill" | "sideTop" | "sideBottom" | "contextFill",
  event: Event,
) {
  const input = event.currentTarget as HTMLInputElement;
  emit("update:theme", {
    ...cloneDigitalTwinMapTheme(props.theme),
    [key]: input.value.toUpperCase(),
  });
}

function updateThemeOpacity(key: "contextFillOpacity", event: Event) {
  const input = event.currentTarget as HTMLInputElement;
  const value = Number(input.value);
  if (!Number.isFinite(value)) return;
  emit("update:theme", { ...cloneDigitalTwinMapTheme(props.theme), [key]: value });
}

function updateMapColor(key: "groundFill" | "groundGrid", event: Event) {
  const input = event.currentTarget as HTMLInputElement;
  const tuning = cloneMapVisualTuning(props.tuning);
  tuning.colorOverrides[key] = input.value.toUpperCase();
  emit("update:tuning", tuning);
}

function updatePaletteColor(key: PaletteColorKey, event: Event) {
  if (!props.theme.energyTowerPalette) return;
  const input = event.currentTarget as HTMLInputElement;
  const palette = {
    ...props.theme.energyTowerPalette,
    [key]: input.value.toUpperCase(),
  };
  emit("update:theme", {
    ...cloneDigitalTwinMapTheme(props.theme),
    swatches: [palette.base, palette.low, palette.medium, palette.high],
    energyTowerPalette: palette,
  });
}

function updatePaletteOpacity(event: Event) {
  if (!props.theme.energyTowerPalette) return;
  const input = event.currentTarget as HTMLInputElement;
  const value = Number(input.value);
  if (!Number.isFinite(value)) return;
  emit("update:theme", {
    ...cloneDigitalTwinMapTheme(props.theme),
    energyTowerPalette: {
      ...props.theme.energyTowerPalette,
      bottomOpacity: value,
    },
  });
}

function updateNumber(key: NumericTuningKey, event: Event) {
  const input = event.currentTarget as HTMLInputElement;
  const value = Number(input.value);
  if (!Number.isFinite(value)) return;
  emit("update:tuning", { ...cloneMapVisualTuning(props.tuning), [key]: value });
}

function updateBoolean(key: "autoRotationEnabled", event: Event) {
  const input = event.currentTarget as HTMLInputElement;
  emit("update:tuning", {
    ...cloneMapVisualTuning(props.tuning),
    [key]: input.checked,
  });
}

function resetMaterialTuning() {
  emit("update:tuning", cloneMapVisualTuning(defaultMapVisualTuning));
  emit("update:theme", cloneDigitalTwinMapTheme(getDigitalTwinMapTheme(props.theme.id)));
}
</script>

<template>
  <div class="material-tuning" :class="{ 'is-expanded': expanded }">
    <button
      type="button"
      class="material-tuning__trigger"
      :aria-expanded="expanded"
      aria-controls="map-material-tuning-panel"
      aria-label="地图材质"
      title="地图材质"
      @click="expanded = !expanded"
    >
      <SlidersHorizontal :size="16" :stroke-width="1.8" aria-hidden="true" />
    </button>

    <aside
      v-if="expanded"
      id="map-material-tuning-panel"
      class="material-tuning__panel"
      aria-label="地图材质调试"
    >
      <header>
        <div>
          <strong>MAP MATERIAL</strong>
          <span>地图材质实时调试</span>
        </div>
        <button type="button" @click="resetMaterialTuning">恢复默认</button>
      </header>

      <div class="material-tuning__scroll">
        <section>
          <h3>地图表面</h3>
          <label class="material-tuning__color-row">
            <span>行政区顶面颜色</span>
            <input type="color" aria-label="行政区顶面颜色" :value="theme.topFill" @input="updateThemeColor('topFill', $event)">
            <output>{{ theme.topFill }}</output>
          </label>
          <label class="material-tuning__color-row">
            <span>行政区底面颜色</span>
            <input type="color" aria-label="行政区底面颜色" :value="theme.bottomFill" @input="updateThemeColor('bottomFill', $event)">
            <output>{{ theme.bottomFill }}</output>
          </label>
          <label v-for="control in surfaceControls" :key="control.key" class="material-tuning__row">
            <span>{{ control.label }}</span>
            <input type="range" :min="control.min" :max="control.max" :step="control.step" :value="tuning[control.key]" @input="updateNumber(control.key, $event)">
            <output>{{ Number(tuning[control.key]).toFixed(2) }}</output>
          </label>
        </section>

        <section>
          <h3>外部环境地面</h3>
          <label class="material-tuning__color-row">
            <span>外部地面颜色</span>
            <input type="color" aria-label="外部地面颜色" :value="theme.contextFill" @input="updateThemeColor('contextFill', $event)">
            <output>{{ theme.contextFill }}</output>
          </label>
          <label class="material-tuning__row">
            <span>外部地面透明度</span>
            <input type="range" min="0" max="1" step="0.01" :value="theme.contextFillOpacity" @input="updateThemeOpacity('contextFillOpacity', $event)">
            <output>{{ theme.contextFillOpacity.toFixed(2) }}</output>
          </label>
        </section>

        <section>
          <h3>背景网格</h3>
          <label class="material-tuning__color-row">
            <span>网格层底色</span>
            <input type="color" aria-label="网格层底色" :value="tuning.colorOverrides.groundFill ?? theme.pageBackground" @input="updateMapColor('groundFill', $event)">
            <output>{{ tuning.colorOverrides.groundFill ?? theme.pageBackground }}</output>
          </label>
          <label class="material-tuning__color-row">
            <span>背景网格颜色</span>
            <input type="color" aria-label="背景网格颜色" :value="tuning.colorOverrides.groundGrid ?? theme.outline" @input="updateMapColor('groundGrid', $event)">
            <output>{{ tuning.colorOverrides.groundGrid ?? theme.outline }}</output>
          </label>
          <label v-for="control in groundSurfaceControls" :key="control.key" class="material-tuning__row">
            <span>{{ control.label }}</span>
            <input type="range" :min="control.min" :max="control.max" :step="control.step" :value="tuning[control.key]" @input="updateNumber(control.key, $event)">
            <output>{{ Number(tuning[control.key]).toFixed(2) }}</output>
          </label>
        </section>

        <section>
          <h3>地图侧边</h3>
          <label class="material-tuning__color-row">
            <span>侧边顶部颜色</span>
            <input type="color" aria-label="侧边顶部颜色" :value="theme.sideTop" @input="updateThemeColor('sideTop', $event)">
            <output>{{ theme.sideTop }}</output>
          </label>
          <label class="material-tuning__color-row">
            <span>侧边底部颜色</span>
            <input type="color" aria-label="侧边底部颜色" :value="theme.sideBottom" @input="updateThemeColor('sideBottom', $event)">
            <output>{{ theme.sideBottom }}</output>
          </label>
          <label v-for="control in sideControls" :key="control.key" class="material-tuning__row">
            <span>{{ control.label }}</span>
            <input type="range" :min="control.min" :max="control.max" :step="control.step" :value="tuning[control.key]" @input="updateNumber(control.key, $event)">
            <output>{{ Number(tuning[control.key]).toFixed(2) }}</output>
          </label>
        </section>

        <section>
          <h3>地图交互</h3>
          <label class="material-tuning__check-row">
            <span>自动平面旋转</span>
            <input
              type="checkbox"
              aria-label="自动平面旋转"
              :checked="tuning.autoRotationEnabled"
              @change="updateBoolean('autoRotationEnabled', $event)"
            >
          </label>
        </section>

        <section>
          <h3>自动聚焦巡航</h3>
          <label v-for="control in autoTourControls" :key="control.key" class="material-tuning__row">
            <span>{{ control.label }}</span>
            <input type="range" :min="control.min" :max="control.max" :step="control.step" :value="tuning[control.key]" @input="updateNumber(control.key, $event)">
            <output>{{ Number(tuning[control.key]).toFixed(2) }}</output>
          </label>
        </section>

        <section>
          <h3>学校立标</h3>
          <label v-for="control in schoolMarkerControls" :key="control.key" class="material-tuning__row">
            <span>{{ control.label }}</span>
            <input type="range" :min="control.min" :max="control.max" :step="control.step" :value="tuning[control.key]" @input="updateNumber(control.key, $event)">
            <output>{{ Number(tuning[control.key]).toFixed(2) }}</output>
          </label>
        </section>

        <section>
          <h3>教育局信标</h3>
          <label v-for="control in bureauMarkerControls" :key="control.key" class="material-tuning__row">
            <span>{{ control.label }}</span>
            <input type="range" :min="control.min" :max="control.max" :step="control.step" :value="tuning[control.key]" @input="updateNumber(control.key, $event)">
            <output>{{ Number(tuning[control.key]).toFixed(2) }}</output>
          </label>
        </section>

        <section>
          <h3>学校飞线</h3>
          <label v-for="control in connectionControls" :key="control.key" class="material-tuning__row">
            <span>{{ control.label }}</span>
            <input type="range" :min="control.min" :max="control.max" :step="control.step" :value="tuning[control.key]" @input="updateNumber(control.key, $event)">
            <output>{{ Number(tuning[control.key]).toFixed(3) }}</output>
          </label>
        </section>

        <section>
          <h3>锥峰透明度</h3>
          <label v-for="control in towerOpacityControls" :key="control.key" class="material-tuning__row">
            <span>{{ control.label }}</span>
            <input type="range" :min="control.min" :max="control.max" :step="control.step" :value="tuning[control.key]" @input="updateNumber(control.key, $event)">
            <output>{{ Number(tuning[control.key]).toFixed(2) }}</output>
          </label>
          <label v-if="theme.energyTowerPalette" class="material-tuning__row">
            <span>底端透明度</span>
            <input type="range" min="0" max="1" step="0.01" :value="theme.energyTowerPalette.bottomOpacity" @input="updatePaletteOpacity">
            <output>{{ theme.energyTowerPalette.bottomOpacity.toFixed(2) }}</output>
          </label>
        </section>

        <section v-if="theme.energyTowerPalette">
          <h3>多色锥峰</h3>
          <label class="material-tuning__color-row">
            <span>底部基色</span>
            <input type="color" aria-label="多色底部基色" :value="theme.energyTowerPalette.base" @input="updatePaletteColor('base', $event)">
            <output>{{ theme.energyTowerPalette.base }}</output>
          </label>
          <label class="material-tuning__color-row">
            <span>少量顶色</span>
            <input type="color" aria-label="少量顶色" :value="theme.energyTowerPalette.low" @input="updatePaletteColor('low', $event)">
            <output>{{ theme.energyTowerPalette.low }}</output>
          </label>
          <label class="material-tuning__color-row">
            <span>中量顶色</span>
            <input type="color" aria-label="中量顶色" :value="theme.energyTowerPalette.medium" @input="updatePaletteColor('medium', $event)">
            <output>{{ theme.energyTowerPalette.medium }}</output>
          </label>
          <label class="material-tuning__color-row">
            <span>多量顶色</span>
            <input type="color" aria-label="多量顶色" :value="theme.energyTowerPalette.high" @input="updatePaletteColor('high', $event)">
            <output>{{ theme.energyTowerPalette.high }}</output>
          </label>
        </section>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.material-tuning { position: relative; z-index: calc(var(--dt-z-hud) + 2); flex: 0 0 auto; pointer-events: auto; }
.material-tuning__trigger { display: inline-grid; box-sizing: border-box; width: var(--dt-control-height); height: var(--dt-control-height); min-height: var(--dt-control-height); border: var(--dt-border-width) solid var(--dt-color-border-muted); border-radius: var(--dt-radius-xs); padding: 0; background: var(--dt-color-panel-soft); box-shadow: inset 0 0 var(--dt-space-3) color-mix(in srgb, var(--hud-primary) 8%, transparent); color: var(--dt-color-text); cursor: pointer; place-items: center; }
.material-tuning__trigger:hover { border-color: var(--hud-primary); }
.material-tuning.is-expanded .material-tuning__trigger { border-color: var(--hud-primary); }
.material-tuning__panel { position: absolute; bottom: calc(100% + var(--dt-space-2)); left: 0; width: var(--dt-tuning-panel-width); max-height: var(--dt-tuning-panel-max-height); overflow: hidden; border: var(--dt-border-width) solid color-mix(in srgb, var(--hud-primary) 28%, transparent); border-radius: var(--dt-radius-xs); background: color-mix(in srgb, var(--dt-color-canvas) 94%, transparent); box-shadow: 0 24px 64px color-mix(in srgb, var(--normal--black--100) 42%, transparent), inset 0 1px color-mix(in srgb, var(--hud-primary) 22%, transparent); backdrop-filter: blur(18px); }
.material-tuning__panel header { display: flex; min-height: 52px; border-bottom: var(--dt-border-width) solid var(--dt-color-line-soft); padding: var(--dt-space-3); align-items: center; justify-content: space-between; }
.material-tuning__panel header div { display: grid; gap: 3px; }
.material-tuning__panel header strong { color: var(--dt-color-text-strong); font-size: var(--dt-font-size-xs); letter-spacing: 0.16em; }
.material-tuning__panel header span { color: var(--dt-color-text-muted); font-size: var(--dt-font-size-2xs); }
.material-tuning__panel header button { border: 0; padding: var(--dt-space-1) var(--dt-space-2); background: transparent; color: var(--hud-primary); font-size: var(--dt-font-size-2xs); cursor: pointer; }
.material-tuning__scroll { max-height: calc(var(--dt-tuning-panel-max-height) - 53px); overflow-y: auto; scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--hud-primary) 42%, transparent) transparent; }
.material-tuning section { padding: var(--dt-space-3); }
.material-tuning section + section { border-top: var(--dt-border-width) solid var(--dt-color-line-soft); }
.material-tuning h3 { margin: 0 0 var(--dt-space-3); color: color-mix(in srgb, var(--hud-primary) 88%, white); font-size: var(--dt-font-size-2xs); font-weight: var(--dt-font-weight-medium); letter-spacing: var(--dt-letter-spacing-title); }
.material-tuning__row { display: grid; min-height: 27px; grid-template-columns: var(--dt-tuning-label-width) 1fr var(--dt-tuning-value-width); align-items: center; gap: var(--dt-space-2); color: var(--dt-color-text-secondary); font-size: var(--dt-font-size-2xs); }
.material-tuning__row input[type="range"] { width: 100%; height: 2px; margin: 0; accent-color: var(--hud-primary); cursor: ew-resize; }
.material-tuning__row output { color: var(--dt-color-text-strong); font-variant-numeric: tabular-nums; text-align: right; }
.material-tuning__check-row { display: flex; min-height: 27px; align-items: center; justify-content: space-between; gap: var(--dt-space-2); color: var(--dt-color-text-secondary); font-size: var(--dt-font-size-2xs); cursor: pointer; }
.material-tuning__check-row input { width: 14px; height: 14px; margin: 0; accent-color: var(--hud-primary); cursor: pointer; }
.material-tuning__color-row { display: grid; min-height: 32px; grid-template-columns: var(--dt-tuning-label-width) 34px 1fr; align-items: center; gap: var(--dt-space-2); color: var(--dt-color-text-secondary); font-size: var(--dt-font-size-2xs); }
.material-tuning__color-row input { width: 30px; height: 20px; border: var(--dt-border-width) solid var(--dt-color-line-soft); border-radius: 2px; padding: 0; background: transparent; cursor: pointer; }
.material-tuning__color-row output { overflow: hidden; color: var(--dt-color-text-strong); font-variant-numeric: tabular-nums; text-align: right; text-overflow: ellipsis; }
@media (max-height: 820px) { .material-tuning__panel { --dt-tuning-panel-max-height: 480px; } }
</style>
