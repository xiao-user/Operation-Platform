<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import RongchengThreeMap from "./RongchengThreeMap.vue";
import type { GeoFeature } from "../geo";
import {
  filterLocationsForMapState,
  initialMapState,
  loadMapLevel,
  townshipMapStateForCoordinate,
} from "../map-data-adapter";
import type { MapState } from "../map-data-adapter";
import type { DigitalTwinMapTheme } from "../map-themes";
import type { MapVisualTuning } from "../rendering/map-visual-tuning";
import type { EducationLocation, MapCameraView, MapDataLayerMode } from "../types";

const props = defineProps<{
  locations: readonly EducationLocation[];
  selectedLocationId?: string;
  theme: DigitalTwinMapTheme;
  dataLayerMode: MapDataLayerMode;
  visualTuning: Readonly<MapVisualTuning>;
}>();

const emit = defineEmits<{
  select: [location: EducationLocation];
  scopeChange: [state: MapState, locations: EducationLocation[]];
  "update:dataLayerMode": [mode: MapDataLayerMode];
  "update:visualTuning": [tuning: MapVisualTuning];
  "update:theme": [theme: DigitalTwinMapTheme];
}>();

interface MapRendererApi {
  getCameraView: () => MapCameraView | undefined;
  focusFeature: (featureCode: string, applyTownshipDefaults: boolean) => Promise<void>;
  animateCameraView: (view: MapCameraView) => Promise<void>;
}

interface HistoryEntry {
  state: MapState;
  cameraView?: MapCameraView;
}

const mapRenderer = ref<MapRendererApi>();
const currentState = ref<MapState>(initialMapState);
const history = ref<HistoryEntry[]>([]);
const transitioning = ref(false);
const visibleLocations = computed(() => filterLocationsForMapState(
  props.locations,
  currentState.value,
));

async function focusRegion(feature: GeoFeature) {
  if (transitioning.value) return;
  const code = feature.properties.code;
  if (typeof code !== "string") return;
  if (currentState.value.focusFeatureCode === code) return;
  transitioning.value = true;
  try {
    const nextState = loadMapLevel(code);
    const enteringFromDistrict = currentState.value.scope === "district";
    if (enteringFromDistrict) {
      history.value.push({
        state: currentState.value,
        cameraView: mapRenderer.value?.getCameraView(),
      });
    }
    currentState.value = nextState;
    await nextTick();
    await mapRenderer.value?.focusFeature(code, enteringFromDistrict);
  } finally {
    transitioning.value = false;
  }
}

async function goBack() {
  if (transitioning.value) return;
  const previous = history.value.pop();
  if (!previous) return;
  transitioning.value = true;
  try {
    currentState.value = previous.state;
    await nextTick();
    if (previous.cameraView) await mapRenderer.value?.animateCameraView(previous.cameraView);
  } finally {
    transitioning.value = false;
  }
}

async function focusLocation(location: EducationLocation) {
  const townshipState = townshipMapStateForCoordinate(location.coordinate);
  if (!townshipState || townshipState.code === currentState.value.code) return;
  const feature = townshipState.focusFeatureCode
    ? initialMapState.geoData.features.find(
        (item) => item.properties.code === townshipState.focusFeatureCode,
      )
    : undefined;
  if (feature) await focusRegion(feature);
}

watch(
  [currentState, visibleLocations],
  () => emit("scopeChange", currentState.value, visibleLocations.value),
  { immediate: true },
);

defineExpose({ focusLocation, goBack });

</script>

<template>
  <section
    class="map-stage"
    :aria-label="`${currentState.regionName}教育机构三维地图`"
    :aria-busy="transitioning"
  >
    <RongchengThreeMap
      ref="mapRenderer"
      :map-state="currentState"
      :theme="theme"
      :data-layer-mode="dataLayerMode"
      :visual-tuning="visualTuning"
      :locations="visibleLocations"
      :selected-location-id="selectedLocationId"
      @select="emit('select', $event)"
      @feature-select="focusRegion"
      @scope-back="goBack"
      @update:data-layer-mode="emit('update:dataLayerMode', $event)"
      @update:visual-tuning="emit('update:visualTuning', $event)"
      @update:theme="emit('update:theme', $event)"
    />
  </section>
</template>

<style scoped>
.map-stage { position: absolute; inset: 0; z-index: var(--dt-z-map); min-width: 0; min-height: 0; overflow: hidden; }
.map-stage::before { position: absolute; inset: var(--dt-topbar-height) 0 var(--dt-statusbar-height); border-top: var(--dt-border-width) solid color-mix(in srgb, var(--dt-color-accent) 5%, transparent); background: radial-gradient(ellipse at center, color-mix(in srgb, var(--dt-color-accent) 4%, transparent), transparent 64%); box-shadow: inset 0 0 var(--dt-map-atmosphere-glow) color-mix(in srgb, var(--dt-color-accent) 4%, transparent); content: ""; pointer-events: none; }
</style>
