<script setup lang="ts">
import { gsap } from "gsap";
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import DigitalTwinStatusBar from "@/features/regional-education-overview/components/DigitalTwinStatusBar.vue";
import DigitalTwinTopbar from "@/features/regional-education-overview/components/DigitalTwinTopbar.vue";
import AiDataAssistantEntry from "@/features/regional-education-overview/components/AiDataAssistantEntry.vue";
import LocationProfilePanel from "@/features/regional-education-overview/components/LocationProfilePanel.vue";
import RegionalMapStage from "@/features/regional-education-overview/components/RegionalMapStage.vue";
import RegionalOverviewPanel from "@/features/regional-education-overview/components/RegionalOverviewPanel.vue";
import SmartSportsDashboardHud from "@/features/regional-education-overview/components/SmartSportsDashboardHud.vue";
import { AutoFocusTour } from "@/features/regional-education-overview/auto-focus-tour";
import { createDigitalTwinThemeCssVariables } from "@/features/regional-education-overview/digital-twin-theme-css";
import { rongchengEducationLocations } from "@/features/regional-education-overview/education-locations";
import type { MapState } from "@/features/regional-education-overview/map-state";
import type { MapDataSource } from "@/features/regional-education-overview/map-data-source";
import {
  cloneDigitalTwinMapTheme,
  digitalTwinMapThemes,
  getDigitalTwinMapTheme,
} from "@/features/regional-education-overview/map-themes";
import type {
  DigitalTwinMapTheme,
  DigitalTwinMapThemeId,
} from "@/features/regional-education-overview/map-themes";
import type {
  EducationLocation,
  EducationLocationType,
  MapDataLayerMode,
} from "@/features/regional-education-overview/types";
import { digitalTwinMotion } from "@/features/regional-education-overview/motion";
import {
  isRegionalDashboardSectionEnabled,
} from "@/features/regional-education-overview/dashboard-sections";
import type {
  RegionalDashboardSectionId,
} from "@/features/regional-education-overview/dashboard-sections";
import {
  cloneMapVisualTuning,
  defaultMapVisualTuning,
  smartSportsMapFramingOffsetY,
} from "@/features/regional-education-overview/rendering/map-visual-tuning";
import { useUserStore } from "@/stores/user";
import { useNavigationStore } from "@/stores/navigation";
import { useAuthStore } from "@/stores/auth";
import ChangePasswordDialog from "@/components/ChangePasswordDialog.vue";
import { ElMessage } from "element-plus";
import "@/styles/digital-twin-design-system.css";

const AcademicQualityDashboard = defineAsyncComponent(() => (
  import("@/features/regional-education-overview/components/AcademicQualityDashboard.vue")
));

const props = withDefaults(defineProps<{
  mapDataSource: MapDataSource;
  locations?: readonly EducationLocation[];
  showDashboardSections?: boolean;
  dashboardVariant?: "regional-education" | "smart-sports";
}>(), {
  locations: () => rongchengEducationLocations,
  showDashboardSections: true,
  dashboardVariant: "regional-education",
});

const router = useRouter();
const navigationStore = useNavigationStore();
const authStore = useAuthStore();
const userStore = useUserStore();
const passwordDialogVisible = ref(false);
const pageRoot = ref<HTMLElement>();
const dashboardViewport = ref<HTMLElement>();
const mapStage = ref<InstanceType<typeof RegionalMapStage>>();
const activeDashboardSection = ref<RegionalDashboardSectionId>("regional-overview");
const dashboardTransitioning = ref(false);
const selectedLocation = ref<EducationLocation | undefined>(props.locations[0]);
const activeLocations = ref<EducationLocation[]>([...props.locations]);
const activeMapState = ref<MapState>(props.mapDataSource.initialState);
const activeScopePath = computed(() => activeMapState.value.navigationPath ?? [{
  code: activeMapState.value.code,
  name: activeMapState.value.regionName,
  scope: activeMapState.value.scope,
}]);
const dataLayerMode = ref<MapDataLayerMode>("energy-towers");
const initialMapVisualTuning = cloneMapVisualTuning(defaultMapVisualTuning);
if (props.dashboardVariant === "smart-sports") {
  initialMapVisualTuning.offsetY = smartSportsMapFramingOffsetY;
}
const mapVisualTuning = ref(initialMapVisualTuning);
const now = ref(new Date());

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
const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function restoreThemeId(): DigitalTwinMapThemeId {
  const stored = userStore.visualizationThemeIdForTenant(userStore.currentTenant.id);
  return digitalTwinMapThemes.some((theme) => theme.id === stored)
    ? stored as DigitalTwinMapThemeId
    : "cyan";
}

const activeThemeId = ref<DigitalTwinMapTheme["id"]>(restoreThemeId());
const themeDrafts = ref<Partial<Record<DigitalTwinMapTheme["id"], DigitalTwinMapTheme>>>({});
const activeTheme = computed(() => themeDrafts.value[activeThemeId.value]
  ?? getDigitalTwinMapTheme(activeThemeId.value));
const availableThemes = computed(() => digitalTwinMapThemes.map((theme) =>
  themeDrafts.value[theme.id] ?? theme));
const pageThemeStyle = computed(() => createDigitalTwinThemeCssVariables(activeTheme.value));
const formattedDate = computed(() => dateFormatter.format(now.value).replace(/\//g, "-"));
const formattedTime = computed(() => timeFormatter.format(now.value));
const sportsTitle = computed(() => `${props.mapDataSource.initialState.regionName}智慧体育大脑`);
const coverageLabel = computed(() => {
  if (activeMapState.value.boundaryDataNotice) {
    return activeMapState.value.boundaryDataNotice;
  }
  if (activeMapState.value.scope === "province") {
    return "省级行政区边界 · 下级数据按需加载";
  }
  if (activeMapState.value.scope === "city") {
    return "地市同级与区县边界 · 支持同级切换";
  }
  if (activeMapState.value.scope === "district") {
    return "区县同级边界 · 当前区县聚焦";
  }
  return "公开镇街边界 · 原型数据";
});
let clockTimer: number | undefined;
let schoolSelectionTimer: number | undefined;
let pageMounted = false;
let entranceMedia: ReturnType<typeof gsap.matchMedia> | undefined;
let dashboardTransition: gsap.core.Timeline | undefined;

function selectLocation(location: EducationLocation) {
  selectedLocation.value = location;
  restartSchoolSelectionCycle();
}

function stopSchoolSelectionCycle() {
  if (schoolSelectionTimer !== undefined) window.clearInterval(schoolSelectionTimer);
  schoolSelectionTimer = undefined;
}

function stopClock() {
  if (clockTimer !== undefined) window.clearInterval(clockTimer);
  clockTimer = undefined;
}

function startClock() {
  stopClock();
  now.value = new Date();
  if (document.hidden) return;
  clockTimer = window.setInterval(() => {
    now.value = new Date();
  }, 1000);
}

function cycleSelectedSchool() {
  if (
    document.hidden
    || activeDashboardSection.value !== "regional-overview"
    || dataLayerMode.value !== "institutions"
  ) return;
  const schools = activeLocations.value.filter((location) => location.type !== "bureau");
  if (schools.length < 2) return;
  const currentIndex = schools.findIndex(
    (location) => location.id === selectedLocation.value?.id,
  );
  selectedLocation.value = schools[(currentIndex + 1 + schools.length) % schools.length];
}

function restartSchoolSelectionCycle() {
  stopSchoolSelectionCycle();
  if (
    !pageMounted
    || document.hidden
    || activeDashboardSection.value !== "regional-overview"
    || dataLayerMode.value !== "institutions"
  ) return;
  const duration = Math.max(1, mapVisualTuning.value.institutionSelectionCycleSeconds);
  schoolSelectionTimer = window.setInterval(cycleSelectedSchool, duration * 1000);
}

function autoFocusChildCodes() {
  if (props.locations.length === 0) return [];
  const initialState = props.mapDataSource.initialState;
  const codesWithSchools = new Set(props.locations.flatMap((location) => {
    if (location.type === "bureau") return [];
    const childState = props.mapDataSource.stateForCoordinate(location.coordinate, initialState);
    return childState ? [childState.code] : [];
  }));
  return initialState.geoData.features.flatMap((feature) => {
    const code = feature.properties.code;
    return typeof code === "string" && codesWithSchools.has(code) ? [code] : [];
  });
}

const autoFocusTour = new AutoFocusTour({
  isVisible: () => (
    !document.hidden && activeDashboardSection.value === "regional-overview"
  ),
  isChildScope: () => activeMapState.value.code !== props.mapDataSource.initialState.code,
  currentChildCode: () => activeScopePath.value[1]?.code,
  childCodes: autoFocusChildCodes,
  enterChild: async (code) => await mapStage.value?.focusFeatureAutomatically(code) ?? false,
  leaveChild: async () => await mapStage.value?.goBackAutomatically() ?? false,
  parentDwellDurationMs: () => (
    Math.max(1, mapVisualTuning.value.autoFocusDistrictDwellSeconds) * 1000
  ),
  childDwellDurationMs: () => (
    Math.max(1, mapVisualTuning.value.autoFocusTownshipDwellSeconds) * 1000
  ),
});

function handleUserActivity() {
  autoFocusTour.notifyUserActivity();
}

function handlePageVisibilityChange() {
  autoFocusTour.handleVisibilityChange();
  if (document.hidden) {
    stopClock();
    stopSchoolSelectionCycle();
    return;
  }
  startClock();
  restartSchoolSelectionCycle();
}

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
  if (!props.showDashboardSections) return;
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

function updateActiveTheme(theme: DigitalTwinMapTheme) {
  themeDrafts.value = {
    ...themeDrafts.value,
    [theme.id]: cloneDigitalTwinMapTheme(theme),
  };
}

function navigateToSchool(location: EducationLocation) {
  void mapStage.value?.focusLocation(location);
}

function selectFirstLocationOfTypes(types: readonly EducationLocationType[]) {
  const location = activeLocations.value.find((item) => types.includes(item.type));
  if (location) selectLocation(location);
}

function handleScopeChange(state: MapState, locations: EducationLocation[]) {
  activeMapState.value = state;
  activeLocations.value = locations;
  if (!selectedLocation.value || !locations.some((item) => item.id === selectedLocation.value?.id)) {
    selectedLocation.value = locations[0];
  }
}

function handleNetworkAvailabilityChange(available: boolean) {
  if (!available && dataLayerMode.value === "institutions") {
    dataLayerMode.value = "energy-towers";
  }
}

function handleMapLoadError(message: string) {
  ElMessage.error(message);
}

function returnToParentScope() {
  void mapStage.value?.goBack();
}

function navigateToScope(code: string) {
  void mapStage.value?.goToScope(code);
}

async function switchActiveRole(roleId: string) {
  if (roleId === userStore.role) return;
  await userStore.setActiveRoleForTenant(userStore.currentTenant.id, roleId);
  await navigationStore.ensureValidCurrentRoute(router);
}

async function exitStandalonePage() {
  if (window.opener) {
    window.close();
    return;
  }
  await router.push("/workbench");
}

async function signOut() {
  await authStore.signOut();
  userStore.resetPersistence();
  await router.replace("/");
}

watch(activeThemeId, (themeId) => {
  void userStore
    .setVisualizationThemeForTenant(userStore.currentTenant.id, themeId)
    .catch((error: unknown) => {
      ElMessage.error(error instanceof Error ? error.message : "可视化主题保存失败");
    });
});

watch(
  [
    activeLocations,
    dataLayerMode,
    activeDashboardSection,
    () => mapVisualTuning.value.institutionSelectionCycleSeconds,
  ],
  restartSchoolSelectionCycle,
  { flush: "post" },
);

watch(activeDashboardSection, () => {
  autoFocusTour.handleVisibilityChange();
});

onMounted(() => {
  pageMounted = true;
  restartSchoolSelectionCycle();
  autoFocusTour.start();
  window.addEventListener("pointerdown", handleUserActivity, { capture: true, passive: true });
  window.addEventListener("wheel", handleUserActivity, { capture: true, passive: true });
  window.addEventListener("keydown", handleUserActivity, true);
  document.addEventListener("visibilitychange", handlePageVisibilityChange);
  startClock();
  if (!pageRoot.value || typeof window.matchMedia !== "function") return;
  entranceMedia = gsap.matchMedia();
  entranceMedia.add(
    {
      allowMotion: "(prefers-reduced-motion: no-preference)",
      reduceMotion: "(prefers-reduced-motion: reduce)",
    },
    (context) => {
      if (context.conditions?.reduceMotion || !pageRoot.value) return;
      const targets = Array.from(pageRoot.value.querySelectorAll<HTMLElement>([
        ".page-topbar",
        ".left-panel",
        ".spatial-trail",
        ".right-panel",
        ".sports-summary",
        ".sports-ranking",
        ".sports-goal-card",
        ".sports-trend-card",
        ".map-camera-control",
        ".bottom-navigation",
      ].join(",")));
      const entranceTween = gsap.from(targets, {
        autoAlpha: 0,
        x: (_, target) => {
          if (target.matches(".left-panel, .map-camera-control")) {
            return -24;
          }
          if (target.matches(".right-panel, .spatial-trail, .sports-ranking")) return 24;
          if (target.matches(".sports-summary")) return -24;
          return 0;
        },
        y: (_, target) => {
          if (target.matches(".page-topbar")) return -16;
          if (target.matches(".bottom-navigation, .sports-goal-card, .sports-trend-card")) return 18;
          return 0;
        },
        duration: digitalTwinMotion.entranceDuration,
        stagger: digitalTwinMotion.entranceStagger,
        ease: digitalTwinMotion.entranceEase,
        clearProps: "transform,opacity,visibility",
      });
      return () => entranceTween.kill();
    },
    pageRoot.value,
  );
});

onBeforeUnmount(() => {
  pageMounted = false;
  stopSchoolSelectionCycle();
  autoFocusTour.dispose();
  window.removeEventListener("pointerdown", handleUserActivity, true);
  window.removeEventListener("wheel", handleUserActivity, true);
  window.removeEventListener("keydown", handleUserActivity, true);
  document.removeEventListener("visibilitychange", handlePageVisibilityChange);
  stopClock();
  dashboardTransition?.kill();
  dashboardTransition = undefined;
  entranceMedia?.revert();
});
</script>

<template>
  <main
    ref="pageRoot"
    class="regional-digital-twin"
    :class="{ 'regional-digital-twin--smart-sports': dashboardVariant === 'smart-sports' }"
    :style="pageThemeStyle"
  >
    <div
      ref="dashboardViewport"
      class="dashboard-viewport"
      :aria-busy="dashboardTransitioning"
    >
      <section
        v-if="activeDashboardSection === 'regional-overview'"
        id="dashboard-panel-regional-overview"
        class="dashboard-section dashboard-section--overview"
        role="tabpanel"
        :aria-label="dashboardVariant === 'smart-sports' ? '智慧体育数据驾驶舱' : '区域教育总览'"
      >
        <RegionalMapStage
          ref="mapStage"
          class="map-layer"
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
        />

        <div class="hud-layer">
          <div class="hud-content">
            <SmartSportsDashboardHud
              v-if="dashboardVariant === 'smart-sports'"
              :scope-name="activeMapState.regionName"
              :scope-path="activeScopePath"
              :palette="activeTheme.chartPalette"
              :coverage-label="coverageLabel"
              :date-range="sportsDateRange"
              @scope-back="returnToParentScope"
              @scope-navigate="navigateToScope"
              @date-range-change="sportsDateRange = $event"
            />

            <RegionalOverviewPanel
              v-else
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
              v-if="dashboardVariant === 'regional-education'"
              :location="selectedLocation"
              :scope-name="activeMapState.regionName"
              :formatted-date="formattedDate"
              :locations="activeLocations"
              @location-select="selectLocation"
              @school-navigate="navigateToSchool"
            />
          </div>
        </div>
      </section>

      <AcademicQualityDashboard
        v-else-if="showDashboardSections"
        :chart-palette="activeTheme.chartPalette"
      />
    </div>

    <DigitalTwinTopbar
      :tenant-name="userStore.currentTenant.name"
      :user-name="userStore.userInfo.name"
      :active-role-id="navigationStore.activeRoleRecord?.id"
      :roles="navigationStore.availableRoleRecords"
      :formatted-date="formattedDate"
      :formatted-time="formattedTime"
      :themes="availableThemes"
      :active-theme-id="activeThemeId"
      :active-section="activeDashboardSection"
      :show-section-navigation="showDashboardSections"
      :variant="dashboardVariant"
      :product-title="sportsTitle"
      @theme-select="activeThemeId = $event"
      @section-select="selectDashboardSection"
      @role-select="switchActiveRole"
      @change-password="passwordDialogVisible = true"
      @sign-out="signOut"
      @exit="exitStandalonePage"
    />

    <ChangePasswordDialog v-model="passwordDialogVisible" />

    <AiDataAssistantEntry />

    <DigitalTwinStatusBar
      v-if="showDashboardSections"
      :code="activeMapState.code"
      :scope-name="activeMapState.regionName"
      :entity-count="activeLocations.length"
      :coverage-label="coverageLabel"
      :active-section="activeDashboardSection"
      @select="selectDashboardSection"
    />
  </main>
</template>

<style scoped>
.regional-digital-twin {
  position: relative;
  width: 100vw;
  height: 100vh;
  min-width: var(--dt-min-viewport-width);
  min-height: var(--dt-min-viewport-height);
  overflow: hidden;
  color: var(--dt-color-text);
  background: var(--page-background);
  font-family: var(--dt-font-family);
  font-weight: var(--dt-font-weight-light);
  transition: color var(--dt-transition-theme), background var(--dt-transition-theme);
}

.regional-digital-twin--smart-sports {
  --dt-map-control-bottom: calc(160px + var(--dt-space-8) + var(--dt-space-4));
  --dt-ai-entry-bottom: calc(160px + var(--dt-space-8) + var(--dt-space-4));
  --dt-ai-entry-right: calc(var(--dt-right-panel-width) + var(--dt-right-panel-right) + var(--dt-space-6));
}

.map-layer {
  z-index: var(--dt-z-map);
}

.dashboard-viewport {
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
