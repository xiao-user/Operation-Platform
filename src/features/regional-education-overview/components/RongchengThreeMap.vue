<template>
  <div
    class="map-host"
    :style="{
      '--map-primary': theme.primary,
      '--map-outline': theme.outline,
      '--map-label-text': theme.labelText,
      '--map-label-border': theme.labelBorder,
      '--map-label-glow': theme.labelGlow,
      '--map-label-pointer': theme.labelPointer,
      '--map-surface': theme.topFill,
      '--map-ground-background': visualTuning.colorOverrides.groundFill ?? theme.pageBackground,
    }"
  >
    <div ref="canvasHost" class="map-canvas-host" />

    <div class="map-camera-control" aria-label="地图视角与点位控制">
      <button type="button" class="map-layer-button" :class="{ 'is-active': dataLayerMode === 'institutions' }" :aria-pressed="dataLayerMode === 'institutions'" @click="emit('update:dataLayerMode', 'institutions')">学校网络</button>
      <button type="button" class="map-layer-button" :class="{ 'is-active': dataLayerMode === 'energy-towers' }" :aria-pressed="dataLayerMode === 'energy-towers'" @click="emit('update:dataLayerMode', 'energy-towers')">能量锥峰</button>
      <button type="button" @click="resetCameraView">重置视角</button>
      <MapMaterialTuningPanel
        :tuning="visualTuning"
        :theme="theme"
        @update:tuning="emit('update:visualTuning', $event)"
        @update:theme="emit('update:theme', $event)"
      />
    </div>

  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import MapMaterialTuningPanel from "./MapMaterialTuningPanel.vue";
import type { MapState } from "../map-data-adapter";
import type { DigitalTwinMapTheme } from "../map-themes";
import type { MapVisualTuning } from "../rendering/map-visual-tuning";
import {
  defaultRegionalMapCameraView,
  RegionalMapEngine,
} from "../rendering/regional-map-engine";
import type {
  EducationLocation,
  MapDataLayerMode,
  MapCameraView,
} from "../types";

const props = defineProps<{
  mapState: MapState;
  theme: DigitalTwinMapTheme;
  locations: readonly EducationLocation[];
  selectedLocationId?: string;
  dataLayerMode: MapDataLayerMode;
  visualTuning: Readonly<MapVisualTuning>;
}>();
const emit = defineEmits<{
  select: [location: EducationLocation];
  featureSelect: [feature: MapState["geoData"]["features"][number]];
  scopeBack: [];
  "update:dataLayerMode": [mode: MapDataLayerMode];
  "update:visualTuning": [tuning: MapVisualTuning];
  "update:theme": [theme: DigitalTwinMapTheme];
}>();
const canvasHost = ref<HTMLElement>();
let engine: RegionalMapEngine | undefined;
let renderedScopeCode = props.mapState.code;
let visualTuningFrame = 0;
let pendingVisualTuning: Readonly<MapVisualTuning> | undefined;

function scheduleVisualTuning(tuning: Readonly<MapVisualTuning>) {
  pendingVisualTuning = tuning;
  if (visualTuningFrame) return;
  visualTuningFrame = window.requestAnimationFrame(() => {
    visualTuningFrame = 0;
    const nextTuning = pendingVisualTuning;
    pendingVisualTuning = undefined;
    if (nextTuning) engine?.setVisualTuning(nextTuning);
  });
}

function resetCameraView() {
  void engine?.animateCameraView(defaultRegionalMapCameraView);
}

onMounted(() => {
  if (!canvasHost.value) return;
  engine = new RegionalMapEngine(
    canvasHost.value,
    props.mapState,
    props.locations,
    props.theme,
    props.selectedLocationId,
    props.dataLayerMode,
    props.visualTuning,
    {
      locationSelect: (location) => emit("select", location),
      featureSelect: (feature) => emit("featureSelect", feature),
      scopeBack: () => emit("scopeBack"),
    },
  );
});

watch(
  [() => props.mapState, () => props.locations],
  ([mapState, locations]) => {
    if (mapState.code !== renderedScopeCode) {
      renderedScopeCode = mapState.code;
      engine?.setMapState(mapState, locations);
    } else {
      engine?.setLocations(locations);
    }
  },
  { flush: "post" },
);
watch(() => props.theme, (theme) => engine?.setTheme(theme));
watch(() => props.dataLayerMode, (mode) => engine?.setDataLayerMode(mode));
watch(
  () => props.visualTuning,
  scheduleVisualTuning,
  { deep: true },
);
watch(
  () => props.selectedLocationId,
  (locationId) => engine?.setSelectedLocation(locationId),
);

defineExpose({
  getCameraView: () => engine?.getCameraView(),
  focusFeature: (featureCode: string, applyTownshipDefaults: boolean) => (
    engine?.focusFeature(featureCode, applyTownshipDefaults) ?? Promise.resolve()
  ),
  animateCameraView: (view: MapCameraView) => engine?.animateCameraView(view) ?? Promise.resolve(),
  setSelectedEnergyTower: (energyTowerId?: string) => (
    engine?.setSelectedEnergyTower(energyTowerId)
  ),
});

onBeforeUnmount(() => {
  if (visualTuningFrame) window.cancelAnimationFrame(visualTuningFrame);
  visualTuningFrame = 0;
  pendingVisualTuning = undefined;
  engine?.dispose();
  engine = undefined;
});
</script>

<style scoped>
.map-host,
.map-canvas-host {
  position: absolute;
  inset: 0;
  min-width: 0;
  min-height: 0;
}

.map-host {
  z-index: calc(var(--dt-z-map) + 1);
  overflow: hidden;
  pointer-events: auto;
  filter: drop-shadow(0 0 var(--dt-space-5) color-mix(in srgb, var(--map-primary) 24%, transparent));
}

.map-canvas-host {
  background-color: var(--map-ground-background);
}

.map-canvas-host :deep(.regional-map-canvas),
.map-canvas-host :deep(.map-label-layer) {
  position: absolute;
  inset: 0;
}

.map-canvas-host :deep(.regional-map-canvas:focus-visible) {
  outline: var(--dt-border-width) solid var(--map-primary);
  outline-offset: calc(-1 * var(--dt-border-width));
}

.map-canvas-host :deep(.map-label-layer) { pointer-events: none; }

.map-camera-control {
  position: absolute;
  bottom: calc(var(--dt-statusbar-height) + var(--dt-space-4));
  left: var(--dt-map-hud-left);
  z-index: var(--dt-z-map-hud);
  display: flex;
  min-height: var(--dt-control-height);
  align-items: center;
  gap: var(--dt-space-1);
  color: color-mix(in srgb, var(--map-label-text) 72%, transparent);
  font-size: var(--dt-font-size-xs);
  line-height: var(--dt-line-height-tight);
  text-shadow: 0 0 10px var(--map-label-glow);
}

.map-camera-control button {
  box-sizing: border-box;
  min-height: var(--dt-control-height);
  border: var(--dt-border-width) solid var(--dt-color-border-muted);
  border-radius: var(--dt-radius-xs);
  padding: 0 var(--dt-space-2);
  background: var(--dt-color-panel-soft);
  color: var(--map-label-text);
  font: inherit;
  cursor: pointer;
  box-shadow: inset 0 0 var(--dt-space-3) color-mix(in srgb, var(--map-primary) 8%, transparent);
}

.map-camera-control button:hover {
  border-color: var(--map-primary);
}

.map-camera-control .map-layer-button { color: color-mix(in srgb, var(--map-label-text) 58%, transparent); }
.map-camera-control .map-layer-button.is-active { border-color: color-mix(in srgb, var(--map-primary) 62%, transparent); background: color-mix(in srgb, var(--map-primary) 14%, var(--dt-color-panel)); color: var(--map-primary); box-shadow: inset 0 0 var(--dt-space-3) color-mix(in srgb, var(--map-primary) 18%, transparent), 0 0 var(--dt-space-3) color-mix(in srgb, var(--map-primary) 10%, transparent); }


.map-canvas-host :deep(.map-region-label) {
  border: var(--dt-border-width) solid color-mix(in srgb, var(--map-outline) 38%, transparent);
  border-radius: var(--dt-radius-xs);
  padding: var(--dt-space-1) var(--dt-space-2);
  background: color-mix(in srgb, var(--map-surface) 82%, transparent);
  color: var(--map-label-text);
  font-size: var(--dt-font-size-xs);
  line-height: var(--dt-line-height-tight);
  letter-spacing: 0.08em;
  text-shadow: 0 0 var(--dt-space-2) var(--map-label-glow);
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: opacity var(--dt-transition-fast), visibility var(--dt-transition-fast);
}

.map-canvas-host :deep(.map-region-label.is-visible) {
  opacity: 1;
  visibility: visible;
}

.map-canvas-host :deep(.map-location-name) {
  position: relative;
  top: calc(-1 * var(--dt-map-location-name-offset));
  max-width: var(--dt-control-select-width);
  overflow: hidden;
  color: var(--map-label-text);
  font-size: var(--dt-font-size-xs);
  line-height: var(--dt-line-height-xs);
  font-weight: var(--dt-font-weight-medium);
  text-overflow: ellipsis;
  text-shadow: 0 0 var(--dt-space-2) var(--map-label-glow);
  white-space: nowrap;
}

.map-canvas-host :deep(.map-location-name.is-selected) {
  color: var(--map-primary);
}

.map-canvas-host :deep(.map-location-name.is-bureau) {
  color: var(--map-label-pointer);
  text-shadow: 0 0 var(--dt-space-3) var(--map-label-glow);
}

.map-canvas-host :deep(.map-energy-tower-label) { display: grid; min-width: 92px; transform: translateY(-8px) scale(0.96); border: var(--dt-border-width) solid color-mix(in srgb, var(--map-primary) 38%, transparent); border-radius: var(--dt-radius-xs); padding: var(--dt-space-1) var(--dt-space-2); background: color-mix(in srgb, var(--dt-color-canvas) 84%, transparent); box-shadow: 0 0 var(--dt-space-4) color-mix(in srgb, var(--map-primary) 12%, transparent); color: var(--map-label-text); text-align: center; white-space: nowrap; opacity: 0; visibility: hidden; backdrop-filter: blur(var(--dt-panel-blur)); transition: opacity var(--dt-transition-fast), visibility var(--dt-transition-fast), transform var(--dt-transition-fast), border-color var(--dt-transition-fast); }
.map-canvas-host :deep(.map-energy-tower-label strong) { font-size: var(--dt-font-size-xs); font-weight: var(--dt-font-weight-medium); letter-spacing: var(--dt-letter-spacing-label); }
.map-canvas-host :deep(.map-energy-tower-label > span) { color: var(--map-primary); font-size: 10px; line-height: var(--dt-line-height-tight); }
.map-canvas-host :deep(.map-energy-tower-label.has-school-details) { min-width: 128px; padding-block: var(--dt-space-2); }
.map-canvas-host :deep(.tower-school-list) { max-height: 42px; overflow: hidden; margin-top: 3px; color: color-mix(in srgb, var(--map-label-text) 74%, transparent); font-size: 10px; line-height: 14px; }
.map-canvas-host :deep(.tower-school-list-track),
.map-canvas-host :deep(.tower-school-list-cycle) { display: grid; }
.map-canvas-host :deep(.tower-school-list-cycle span) { height: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.map-canvas-host :deep(.tower-school-list.is-scrolling .tower-school-list-track) { animation: tower-school-list-scroll var(--school-scroll-duration) linear infinite; }
.map-canvas-host :deep(.map-energy-tower-label.is-pinned.is-revealed) { opacity: calc(0.78 * var(--tower-reveal, 1)); visibility: visible; }
.map-canvas-host :deep(.map-energy-tower-label:is(.is-hovered, .is-selected).is-revealed) { transform: translateY(-12px) scale(1.06); border-color: var(--map-primary); opacity: var(--tower-reveal, 1); visibility: visible; }

@keyframes tower-school-list-scroll {
  from { transform: translateY(0); }
  to { transform: translateY(-50%); }
}

@media (prefers-reduced-motion: reduce) {
  .map-canvas-host :deep(.tower-school-list.is-scrolling .tower-school-list-track) { animation: none; }
}

.map-canvas-host :deep(.map-context-label) {
  color: color-mix(in srgb, var(--map-label-text) 28%, transparent);
  font-size: var(--dt-font-size-xs);
  line-height: var(--dt-line-height-xs);
  letter-spacing: var(--dt-letter-spacing-label);
  text-shadow: 0 0 var(--dt-space-2) var(--dt-color-canvas);
  white-space: nowrap;
}

@media (max-width: 1180px) {
  .map-camera-control { left: var(--dt-space-6); }
}

</style>
