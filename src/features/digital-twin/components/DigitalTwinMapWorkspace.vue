<script setup lang="ts">
import { ref } from "vue";
import RegionalMapStage from "@/features/digital-twin/components/RegionalMapStage.vue";
import type { MapDataSource } from "@/features/digital-twin/map-data-source";
import type { MapState } from "@/features/digital-twin/map-state";
import type { DigitalTwinMapTheme } from "@/features/digital-twin/map-themes";
import type { MapVisualTuning } from "@/features/digital-twin/rendering/map-visual-tuning";
import type {
  EducationLocation,
  MapDataLayerMode,
} from "@/features/digital-twin/types";

defineProps<{
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

const mapStage = ref<InstanceType<typeof RegionalMapStage>>();

function forwardScopeChange(state: MapState, locations: EducationLocation[]) {
  emit("scopeChange", state, locations);
}

defineExpose({
  focusLocation: (location: EducationLocation) => mapStage.value?.focusLocation(location),
  focusFeatureAutomatically: (code: string) => (
    mapStage.value?.focusFeatureAutomatically(code) ?? Promise.resolve(false)
  ),
  goBack: () => mapStage.value?.goBack(),
  goBackAutomatically: () => mapStage.value?.goBackAutomatically() ?? Promise.resolve(false),
  goToScope: (code: string) => mapStage.value?.goToScope(code),
});
</script>

<template>
  <section class="digital-twin-map-workspace">
    <RegionalMapStage
      ref="mapStage"
      class="map-layer"
      :locations="locations"
      :selected-location-id="selectedLocationId"
      :theme="theme"
      :data-layer-mode="dataLayerMode"
      :visual-tuning="visualTuning"
      :data-source="dataSource"
      @select="emit('select', $event)"
      @scope-change="forwardScopeChange"
      @network-availability-change="emit('networkAvailabilityChange', $event)"
      @load-error="emit('loadError', $event)"
      @update:data-layer-mode="emit('update:dataLayerMode', $event)"
      @update:visual-tuning="emit('update:visualTuning', $event)"
      @update:theme="emit('update:theme', $event)"
    />

    <div class="hud-layer">
      <div class="hud-content">
        <slot />
      </div>
    </div>
  </section>
</template>

<style scoped>
.digital-twin-map-workspace {
  position: absolute;
  inset: 0;
  z-index: var(--dt-z-map);
  overflow: hidden;
}

.map-layer {
  z-index: var(--dt-z-map);
}

.hud-layer {
  position: absolute;
  inset: 0;
  z-index: var(--dt-z-hud);
  pointer-events: none;
}

.hud-content {
  position: absolute;
  inset: var(--dt-topbar-height) 0 0;
}

.hud-content > * {
  pointer-events: auto;
}
</style>
