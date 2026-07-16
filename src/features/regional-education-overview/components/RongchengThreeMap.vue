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
    }"
  >
    <div ref="canvasHost" class="map-canvas-host" />

    <div class="map-camera-control" aria-label="地图视角与点位控制">
      <span>{{ scopeLabel }}</span>
      <button type="button" @click="saveCameraView">保存视角</button>
      <button type="button" @click="restoreSavedCameraView">恢复视角</button>
      <button type="button" @click="resetCameraView">重置视角</button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { createCameraViewStorage } from "../camera-view-storage";
import type { CameraViewStorage } from "../camera-view-storage";
import type { MapState } from "../map-data-adapter";
import type { DigitalTwinMapTheme } from "../map-themes";
import {
  defaultRegionalMapCameraView,
  RegionalMapEngine,
} from "../rendering/regional-map-engine";
import type { MapVisualTuning } from "../rendering/map-visual-tuning";
import type {
  EducationLocation,
  MapCameraView,
} from "../types";

const props = defineProps<{
  mapState: MapState;
  theme: DigitalTwinMapTheme;
  locations: readonly EducationLocation[];
  selectedLocationId?: string;
  visualTuning: MapVisualTuning;
}>();
const emit = defineEmits<{
  select: [location: EducationLocation];
  featureSelect: [feature: MapState["geoData"]["features"][number]];
  scopeBack: [];
  "update:visualTuning": [tuning: MapVisualTuning];
}>();
const canvasHost = ref<HTMLElement>();
const cameraStorageKey = "regional-education-overview:camera-view:v3";
const scopeLabel = computed(
  () => `${props.mapState.scope === "district" ? "区县" : "镇街"} / ${props.mapState.regionName}`,
);
let engine: RegionalMapEngine | undefined;
let renderedScopeCode = props.mapState.code;
let cameraViewStorage: CameraViewStorage | undefined;

function resolveCameraViewStorage() {
  try {
    return createCameraViewStorage(window.localStorage, cameraStorageKey);
  } catch {
    return undefined;
  }
}

function saveCameraView() {
  const view = engine?.getCameraView();
  if (!view) return;
  cameraViewStorage?.save(view);
}

function restoreSavedCameraView() {
  engine?.applyCameraView(cameraViewStorage?.read() ?? defaultRegionalMapCameraView);
}

function resetCameraView() {
  cameraViewStorage?.clear();
  engine?.applyCameraView(defaultRegionalMapCameraView);
}

onMounted(() => {
  if (!canvasHost.value) return;
  cameraViewStorage = resolveCameraViewStorage();
  engine = new RegionalMapEngine(
    canvasHost.value,
    props.mapState,
    props.locations,
    props.theme,
    props.selectedLocationId,
    {
      locationSelect: (location) => emit("select", location),
      featureSelect: (feature) => emit("featureSelect", feature),
      scopeBack: () => emit("scopeBack"),
      visualTuningChange: (tuning) => emit("update:visualTuning", tuning),
    },
  );
  engine.setVisualTuning(props.visualTuning);
  const savedCamera = cameraViewStorage?.read();
  if (savedCamera) engine.applyCameraView(savedCamera);
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
watch(() => props.visualTuning, (tuning) => engine?.setVisualTuning(tuning), { deep: true });
watch(() => props.theme, (theme) => engine?.setTheme(theme));
watch(
  () => props.selectedLocationId,
  (locationId) => engine?.setSelectedLocation(locationId),
);

defineExpose({
  getCameraView: () => engine?.getCameraView(),
  focusFeature: (featureCode: string) => engine?.focusFeature(featureCode) ?? Promise.resolve(),
  animateCameraView: (view: MapCameraView) => engine?.animateCameraView(view) ?? Promise.resolve(),
});

onBeforeUnmount(() => {
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
  background-color: var(--dt-color-canvas);
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
  border: var(--dt-border-width) solid var(--dt-color-border-subtle);
  border-radius: var(--dt-radius-xs);
  padding: var(--dt-space-1);
  background: var(--dt-color-panel);
  box-shadow: var(--dt-panel-shadow);
  backdrop-filter: blur(var(--dt-panel-blur));
  align-items: center;
  gap: var(--dt-space-1);
  color: color-mix(in srgb, var(--map-label-text) 72%, transparent);
  font-size: var(--dt-font-size-xs);
  line-height: var(--dt-line-height-tight);
  text-shadow: 0 0 10px var(--map-label-glow);
}

.map-camera-control > span { margin: 0 var(--dt-space-2); white-space: nowrap; }

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
  .map-camera-control > span { display: none; }
}

</style>
