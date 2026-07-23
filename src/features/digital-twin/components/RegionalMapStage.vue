<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import RegionalThreeMap from "./RegionalThreeMap.vue";
import type { GeoFeature } from "../geo";
import type { MapState } from "../map-state";
import type { MapDataSource } from "../map-data-source";
import {
  isContextBandFeature,
  mapGeometryChanged,
  mapProjectionChanged,
  mapStructureChanged,
} from "../map-state-transition";
import {
  MapNavigationCoordinator,
  type MapNavigationOrigin,
  type MapNavigationTransaction,
} from "../map-navigation-coordinator";
import type { DigitalTwinMapTheme } from "../map-themes";
import type { MapVisualTuning } from "../rendering/map-visual-tuning";
import type { EducationLocation, MapCameraView, MapDataLayerMode } from "../types";

const props = defineProps<{
  locations: readonly EducationLocation[];
  selectedLocationId?: string;
  theme: DigitalTwinMapTheme;
  dataLayerMode: MapDataLayerMode;
  visualTuning: Readonly<MapVisualTuning>;
  dataSource: MapDataSource;
}>();

const emit = defineEmits<{
  select: [location: EducationLocation];
  scopeChange: [state: MapState, locations: EducationLocation[]];
  "update:dataLayerMode": [mode: MapDataLayerMode];
  "update:visualTuning": [tuning: MapVisualTuning];
  "update:theme": [theme: DigitalTwinMapTheme];
  networkAvailabilityChange: [available: boolean];
  loadError: [message: string];
}>();

interface MapRendererApi {
  getCameraView: () => MapCameraView | undefined;
  previewFeature: (featureCode: string, applyScopeDefaults: boolean) => Promise<void>;
  focusFeature: (featureCode: string, applyScopeDefaults: boolean) => Promise<void>;
  animateCameraView: (view: MapCameraView) => Promise<void>;
  setSelectedEnergyTower: (energyTowerId?: string) => void;
  focusCurrentBoundary: () => Promise<void>;
  restoreMapPresentation: () => void;
  prepareMapState: (mapState: MapState) => Promise<void>;
}

interface HistoryEntry {
  state: MapState;
  cameraView?: MapCameraView;
}

const mapRenderer = ref<MapRendererApi>();
const dataSource = computed(() => props.dataSource);
const currentState = ref<MapState>(dataSource.value.initialState);
const history = ref<HistoryEntry[]>([]);
const transitioning = ref(false);
let disposed = false;
const navigationCoordinator = new MapNavigationCoordinator((busy) => {
  transitioning.value = busy;
});

function nextVisualFrame() {
  return new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}

function reportLoadError(error: unknown) {
  emit(
    "loadError",
    error instanceof Error ? error.message : "行政区地图加载失败，请稍后重试",
  );
}

function settleTask(task: Promise<void>) {
  return task.then(
    () => ({ ok: true as const }),
    (error: unknown) => ({ ok: false as const, error }),
  );
}
const visibleLocations = computed(() => dataSource.value.filterLocations(
  props.locations,
  currentState.value,
));
const institutionNetworkAvailable = computed(() => dataSource.value.institutionNetworkAvailable(
  currentState.value,
  visibleLocations.value,
));

async function focusRegion(feature: GeoFeature, origin: MapNavigationOrigin = "user") {
  const code = feature.properties.code;
  if (typeof code !== "string") return false;
  if (currentState.value.focusFeatureCode === code) return false;
  const navigation = navigationCoordinator.begin(origin);
  if (!navigation) return false;
  const previousCameraView = mapRenderer.value?.getCameraView();
  const previewAllowed = currentState.value.scope === "province"
    || currentState.value.terminal
    || Boolean(
      currentState.value.contextInteractive
      || currentState.value.externalInteractive,
    );
  try {
    const previousState = currentState.value;
    const loadStatePromise = dataSource.value.loadChildState(previousState, feature, {
      signal: navigation.signal,
    });
    const applyScopeDefaults = !previousState.terminal;
    const previewTask = settleTask(previewAllowed
      ? mapRenderer.value?.previewFeature(code, applyScopeDefaults) ?? Promise.resolve()
      : Promise.resolve());
    const nextState = await loadStatePromise;
    if (disposed || !navigation.isCurrent()) return false;
    if (!nextState) {
      const previewResult = await previewTask;
      if (!previewResult.ok) throw previewResult.error;
      if (disposed || !navigation.isCurrent()) return false;
      if (previewAllowed && previousCameraView) {
        await mapRenderer.value?.animateCameraView(previousCameraView);
      }
      mapRenderer.value?.restoreMapPresentation();
      return false;
    }
    const geometryChanged = mapGeometryChanged(previousState, nextState);
    const projectionChanged = mapProjectionChanged(previousState, nextState);
    const structureChanged = mapStructureChanged(previousState, nextState);
    const contextSibling = isContextBandFeature(previousState, code);
    if (structureChanged) {
      await mapRenderer.value?.prepareMapState(nextState);
      if (disposed || !navigation.isCurrent()) return false;
    }
    if (!contextSibling && (geometryChanged || !previousState.terminal || !nextState.terminal)) {
      history.value.push({
        state: previousState,
        cameraView: previousCameraView,
      });
    }
    else if (contextSibling) {
      const ancestorCodes = new Set(
        (nextState.navigationPath ?? []).slice(0, -1).map((node) => node.code),
      );
      history.value = history.value.filter((entry) => ancestorCodes.has(entry.state.code));
    }
    currentState.value = nextState;
    await nextTick();
    if (disposed || !navigation.isCurrent()) return false;
    if (geometryChanged && projectionChanged) {
      const previewResult = await previewTask;
      if (!previewResult.ok) throw previewResult.error;
      await mapRenderer.value?.focusCurrentBoundary();
    }
    else if (!previewAllowed) {
      await mapRenderer.value?.focusFeature(code, previousState.scope === "district");
    }
    else {
      const previewResult = await previewTask;
      if (!previewResult.ok) throw previewResult.error;
    }
    if (disposed || !navigation.isCurrent()) return false;
    return true;
  } catch (error) {
    if (disposed || !navigation.isCurrent() || navigation.signal.aborted) {
      return false;
    }
    if (previewAllowed && previousCameraView) {
      await mapRenderer.value?.animateCameraView(previousCameraView);
    }
    mapRenderer.value?.restoreMapPresentation();
    reportLoadError(error);
    return false;
  } finally {
    navigation.finish();
  }
}

async function goBack(origin: MapNavigationOrigin = "user") {
  const previous = history.value[history.value.length - 1];
  if (!previous) return false;
  const navigation = navigationCoordinator.begin(origin);
  if (!navigation) return false;
  return restoreHistoryEntry(previous, navigation, () => {
    history.value.pop();
  });
}

async function restoreHistoryEntry(
  previous: HistoryEntry,
  navigation: MapNavigationTransaction,
  commitHistory: () => void,
) {
  const currentCameraView = mapRenderer.value?.getCameraView();
  try {
    const cameraPromise = previous.cameraView
      ? mapRenderer.value?.animateCameraView(previous.cameraView) ?? Promise.resolve()
      : Promise.resolve();
    // Give the camera transition its first paint before projection or business
    // layers are prepared. A dense school layer must never delay return feedback.
    if (previous.cameraView) await nextVisualFrame();
    if (disposed || !navigation.isCurrent()) return false;
    try {
      await mapRenderer.value?.prepareMapState(previous.state);
    } catch (error) {
      if (currentCameraView) await mapRenderer.value?.animateCameraView(currentCameraView);
      mapRenderer.value?.restoreMapPresentation();
      reportLoadError(error);
      return false;
    }
    if (disposed || !navigation.isCurrent()) return false;
    commitHistory();
    currentState.value = previous.state;
    await nextTick();
    await cameraPromise;
    if (disposed || !navigation.isCurrent()) return false;
    return true;
  } finally {
    navigation.finish();
  }
}

async function goToScope(code: string) {
  if (currentState.value.code === code) return false;
  let targetIndex = -1;
  for (let index = history.value.length - 1; index >= 0; index -= 1) {
    if (history.value[index]?.state.code === code) {
      targetIndex = index;
      break;
    }
  }
  if (targetIndex < 0) return false;
  const navigation = navigationCoordinator.begin("user");
  if (!navigation) return false;
  const target = history.value[targetIndex];
  if (!target) {
    navigation.finish();
    return false;
  }
  return restoreHistoryEntry(target, navigation, () => {
    history.value.splice(targetIndex);
  });
}

async function focusLocation(location: EducationLocation) {
  const targetState = dataSource.value.stateForCoordinate(location.coordinate, currentState.value);
  if (!targetState || targetState.code === currentState.value.code) return;
  const feature = targetState.focusFeatureCode
    ? currentState.value.geoData.features.find(
        (item) => item.properties.code === targetState.focusFeatureCode,
      )
    : undefined;
  if (feature) await focusRegion(feature);
}

async function selectSearchedSchool(location: EducationLocation) {
  emit("select", location);
  await focusLocation(location);
}

async function focusFeatureAutomatically(code: string) {
  const feature = currentState.value.geoData.features.find(
    (item) => item.properties.code === code,
  );
  return feature ? focusRegion(feature, "automatic") : false;
}

async function goBackAutomatically() {
  return goBack("automatic");
}

watch(
  [currentState, visibleLocations, institutionNetworkAvailable],
  () => {
    emit("scopeChange", currentState.value, visibleLocations.value);
    emit("networkAvailabilityChange", institutionNetworkAvailable.value);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  disposed = true;
  navigationCoordinator.dispose();
});

defineExpose({
  focusLocation,
  focusFeatureAutomatically,
  goBack,
  goBackAutomatically,
  goToScope,
  setSelectedEnergyTower: (energyTowerId?: string) => (
    mapRenderer.value?.setSelectedEnergyTower(energyTowerId)
  ),
});

</script>

<template>
  <section
    class="map-stage"
    :aria-label="`${currentState.regionName}三维地图`"
    :aria-busy="transitioning"
  >
    <RegionalThreeMap
      ref="mapRenderer"
      :map-state="currentState"
      :theme="theme"
      :data-layer-mode="dataLayerMode"
      :visual-tuning="visualTuning"
      :locations="visibleLocations"
      :search-locations="locations"
      :selected-location-id="selectedLocationId"
      :institution-network-available="institutionNetworkAvailable"
      @select="emit('select', $event)"
      @school-search-select="selectSearchedSchool"
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
