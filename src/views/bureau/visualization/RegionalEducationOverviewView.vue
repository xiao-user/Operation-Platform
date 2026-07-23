<script setup lang="ts">
import { gsap } from "gsap";
import {
  defineAsyncComponent,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import DigitalTwinDashboardShell from "@/features/digital-twin/components/DigitalTwinDashboardShell.vue";
import DigitalTwinMapWorkspace from "@/features/digital-twin/components/DigitalTwinMapWorkspace.vue";
import { useDigitalTwinDashboardSession } from "@/features/digital-twin/use-digital-twin-dashboard-session";
import DigitalTwinStatusBar from "@/features/regional-education-overview/components/DigitalTwinStatusBar.vue";
import LocationProfilePanel from "@/features/regional-education-overview/components/LocationProfilePanel.vue";
import RegionalOverviewPanel from "@/features/regional-education-overview/components/RegionalOverviewPanel.vue";
import DashboardSectionTabs from "@/features/regional-education-overview/components/dashboard/DashboardSectionTabs.vue";
import {
  isRegionalDashboardSectionEnabled,
} from "@/features/regional-education-overview/dashboard-sections";
import type {
  RegionalDashboardSectionId,
} from "@/features/regional-education-overview/dashboard-sections";
import { rongchengEducationLocations } from "@/features/digital-twin/education-locations";
import type { MapDataSource } from "@/features/digital-twin/map-data-source";
import type { EducationLocation } from "@/features/digital-twin/types";

const AcademicQualityDashboard = defineAsyncComponent(() => (
  import("@/features/regional-education-overview/components/AcademicQualityDashboard.vue")
));

const props = withDefaults(defineProps<{
  mapDataSource: MapDataSource;
  locations?: readonly EducationLocation[];
}>(), {
  locations: () => rongchengEducationLocations,
});

const activeDashboardSection = ref<RegionalDashboardSectionId>("regional-overview");
const dashboardViewport = ref<HTMLElement>();
const dashboardTransitioning = ref(false);
let pageMounted = false;
let dashboardTransition: gsap.core.Timeline | undefined;

const session = useDigitalTwinDashboardSession({
  mapDataSource: props.mapDataSource,
  locations: props.locations,
  isMapActive: () => activeDashboardSection.value === "regional-overview",
});

const {
  userStore,
  navigationStore,
  passwordDialogVisible,
  mapWorkspace,
  selectedLocation,
  activeLocations,
  activeMapState,
  activeScopePath,
  dataLayerMode,
  mapVisualTuning,
  activeThemeId,
  activeTheme,
  availableThemes,
  pageThemeStyle,
  formattedDate,
  formattedTime,
  coverageLabel,
  selectLocation,
  notifyMapActivityChanged,
  updateActiveTheme,
  navigateToSchool,
  selectFirstLocationOfTypes,
  handleScopeChange,
  handleNetworkAvailabilityChange,
  handleMapLoadError,
  returnToParentScope,
  navigateToScope,
  switchActiveRole,
  exitStandalonePage,
  signOut,
} = session;

function currentDashboardSectionElement() {
  return dashboardViewport.value?.querySelector<HTMLElement>(".dashboard-section");
}

function finishDashboardTransition() {
  dashboardTransition = undefined;
  dashboardTransitioning.value = false;
}

async function mountDashboardSection(sectionId: RegionalDashboardSectionId) {
  if (!pageMounted) return finishDashboardTransition();
  activeDashboardSection.value = sectionId;
  await nextTick();
  const incoming = currentDashboardSectionElement();
  if (!incoming || !pageMounted) return finishDashboardTransition();
  const panelTargets = incoming.querySelectorAll<HTMLElement>("[data-dashboard-panel]");
  dashboardTransition = gsap.timeline({
    defaults: { overwrite: "auto" },
    onComplete: finishDashboardTransition,
    onInterrupt: finishDashboardTransition,
  });
  dashboardTransition
    .set(incoming, { willChange: "transform,opacity" })
    .fromTo(
      incoming,
      { autoAlpha: 0, y: 14 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.34,
        ease: "power2.out",
        clearProps: "transform,opacity,visibility,willChange",
      },
    );
  if (panelTargets.length > 0) {
    dashboardTransition.fromTo(
      panelTargets,
      { autoAlpha: 0, y: 8 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.26,
        stagger: 0.035,
        ease: "power2.out",
        clearProps: "transform,opacity,visibility",
      },
      "<0.05",
    );
  }
}

function selectDashboardSection(sectionId: RegionalDashboardSectionId) {
  if (
    sectionId === activeDashboardSection.value
    || !isRegionalDashboardSectionEnabled(sectionId)
  ) return;
  const outgoing = currentDashboardSectionElement();
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  dashboardTransition?.kill();
  dashboardTransition = undefined;
  dashboardTransitioning.value = true;
  if (!outgoing || reduceMotion) {
    activeDashboardSection.value = sectionId;
    void nextTick(finishDashboardTransition);
    return;
  }
  dashboardTransition = gsap.timeline({
    defaults: { overwrite: "auto" },
    onComplete: () => void mountDashboardSection(sectionId),
    onInterrupt: finishDashboardTransition,
  });
  dashboardTransition
    .set(outgoing, { willChange: "transform,opacity" })
    .to(outgoing, {
      autoAlpha: 0,
      y: -10,
      duration: 0.2,
      ease: "power2.in",
    });
}

watch(activeDashboardSection, notifyMapActivityChanged);

onMounted(() => {
  pageMounted = true;
});

onBeforeUnmount(() => {
  pageMounted = false;
  dashboardTransition?.kill();
  dashboardTransition = undefined;
});
</script>

<template>
  <DigitalTwinDashboardShell
    v-model:password-dialog-visible="passwordDialogVisible"
    variant="regional-education"
    has-navigation
    :busy="dashboardTransitioning"
    :theme-style="pageThemeStyle"
    :tenant-name="userStore.currentTenant.name"
    :user-name="userStore.userInfo.name"
    :active-role-id="navigationStore.activeRoleRecord?.id"
    :roles="navigationStore.availableRoleRecords"
    :formatted-date="formattedDate"
    :formatted-time="formattedTime"
    :themes="availableThemes"
    :active-theme-id="activeThemeId"
    @theme-select="activeThemeId = $event"
    @role-select="switchActiveRole"
    @sign-out="signOut"
    @exit="exitStandalonePage"
  >
    <template #navigation>
      <DashboardSectionTabs
        class="primary-navigation"
        variant="primary"
        label="驾驶舱主导航"
        :active-section="activeDashboardSection"
        @select="selectDashboardSection"
      />
    </template>

    <div ref="dashboardViewport" class="business-dashboard-viewport">
      <section
        v-if="activeDashboardSection === 'regional-overview'"
        id="dashboard-panel-regional-overview"
        class="dashboard-section dashboard-section--overview"
        role="tabpanel"
        aria-label="区域教育总览"
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
          <RegionalOverviewPanel
            :locations="activeLocations"
            :selected-type="selectedLocation?.type"
            :scope-name="activeMapState.regionName"
            :scope-path="activeScopePath"
            :coverage-label="coverageLabel"
            @scope-back="returnToParentScope"
            @scope-navigate="navigateToScope"
            @type-select="selectFirstLocationOfTypes"
          />

          <LocationProfilePanel
            :location="selectedLocation"
            :scope-name="activeMapState.regionName"
            :formatted-date="formattedDate"
            :locations="activeLocations"
            @location-select="selectLocation"
            @school-navigate="navigateToSchool"
          />
        </DigitalTwinMapWorkspace>
      </section>

      <AcademicQualityDashboard
        v-else
        :chart-palette="activeTheme.chartPalette"
      />
    </div>

    <template #footer>
      <DigitalTwinStatusBar
        :code="activeMapState.code"
        :scope-name="activeMapState.regionName"
        :entity-count="activeLocations.length"
        :coverage-label="coverageLabel"
        :active-section="activeDashboardSection"
        @select="selectDashboardSection"
      />
    </template>
  </DigitalTwinDashboardShell>
</template>

<style scoped>
.business-dashboard-viewport {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.dashboard-section {
  position: absolute;
  overflow: hidden;
}

.dashboard-section--overview {
  inset: 0;
  z-index: var(--dt-z-map);
}
</style>
