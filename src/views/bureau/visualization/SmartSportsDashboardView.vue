<script setup lang="ts">
import { computed, ref } from "vue";
import DigitalTwinDashboardShell from "@/features/digital-twin/components/DigitalTwinDashboardShell.vue";
import DigitalTwinMapWorkspace from "@/features/digital-twin/components/DigitalTwinMapWorkspace.vue";
import { useDigitalTwinDashboardSession } from "@/features/digital-twin/use-digital-twin-dashboard-session";
import SmartSportsDashboardHud from "@/features/smart-sports-dashboard/components/SmartSportsDashboardHud.vue";
import type { MapDataSource } from "@/features/digital-twin/map-data-source";
import { smartSportsMapFramingOffsetY } from "@/features/digital-twin/rendering/map-visual-tuning";
import type { EducationLocation } from "@/features/digital-twin/types";

const props = withDefaults(defineProps<{
  mapDataSource: MapDataSource;
  locations?: readonly EducationLocation[];
}>(), {
  locations: () => [],
});

const session = useDigitalTwinDashboardSession({
  mapDataSource: props.mapDataSource,
  locations: props.locations,
  initialOffsetY: smartSportsMapFramingOffsetY,
  isMapActive: () => true,
});

const {
  userStore,
  navigationStore,
  passwordDialogVisible,
  mapWorkspace,
  selectedLocation,
  activeMapState,
  activeScopePath,
  dataLayerMode,
  mapVisualTuning,
  now,
  activeThemeId,
  activeTheme,
  availableThemes,
  pageThemeStyle,
  formattedDate,
  formattedTime,
  coverageLabel,
  selectLocation,
  updateActiveTheme,
  handleScopeChange,
  handleNetworkAvailabilityChange,
  handleMapLoadError,
  returnToParentScope,
  navigateToScope,
  switchActiveRole,
  exitStandalonePage,
  signOut,
} = session;

function calendarDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const sportsDateRange = ref<[string, string]>([
  calendarDate(new Date(now.value.getFullYear(), now.value.getMonth(), 1)),
  calendarDate(now.value),
]);
const sportsTitle = computed(() => `${props.mapDataSource.initialState.regionName}智慧体育大脑`);
</script>

<template>
  <DigitalTwinDashboardShell
    v-model:password-dialog-visible="passwordDialogVisible"
    variant="smart-sports"
    :theme-style="pageThemeStyle"
    :tenant-name="userStore.currentTenant.name"
    :user-name="userStore.userInfo.name"
    :active-role-id="navigationStore.activeRoleRecord?.id"
    :roles="navigationStore.availableRoleRecords"
    :formatted-date="formattedDate"
    :formatted-time="formattedTime"
    :themes="availableThemes"
    :active-theme-id="activeThemeId"
    :product-title="sportsTitle"
    @theme-select="activeThemeId = $event"
    @role-select="switchActiveRole"
    @sign-out="signOut"
    @exit="exitStandalonePage"
  >
    <section
      class="dashboard-section dashboard-section--overview"
      role="tabpanel"
      aria-label="智慧体育数据驾驶舱"
    >
      <DigitalTwinMapWorkspace
        ref="mapWorkspace"
        :locations="props.locations"
        :selected-location-id="selectedLocation?.id"
        :theme="activeTheme"
        :data-layer-mode="dataLayerMode"
        :visual-tuning="mapVisualTuning"
        :data-source="props.mapDataSource"
        @select="selectLocation"
        @scope-change="handleScopeChange"
        @network-availability-change="handleNetworkAvailabilityChange"
        @load-error="handleMapLoadError"
        @update:data-layer-mode="dataLayerMode = $event"
        @update:visual-tuning="mapVisualTuning = $event"
        @update:theme="updateActiveTheme"
      >
        <SmartSportsDashboardHud
          :scope-name="activeMapState.regionName"
          :scope-path="activeScopePath"
          :palette="activeTheme.chartPalette"
          :coverage-label="coverageLabel"
          :date-range="sportsDateRange"
          @scope-back="returnToParentScope"
          @scope-navigate="navigateToScope"
          @date-range-change="sportsDateRange = $event"
        />
      </DigitalTwinMapWorkspace>
    </section>
  </DigitalTwinDashboardShell>
</template>

<style scoped>
.dashboard-section {
  position: absolute;
  overflow: hidden;
}

.dashboard-section--overview {
  inset: 0;
  z-index: var(--dt-z-map);
}
</style>
