import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useAuthStore } from "@/stores/auth";
import { useNavigationStore } from "@/stores/navigation";
import { useUserStore } from "@/stores/user";
import { AutoFocusTour } from "@/features/digital-twin/auto-focus-tour";
import { createDigitalTwinThemeCssVariables } from "@/features/digital-twin/digital-twin-theme-css";
import type { MapDataSource } from "@/features/digital-twin/map-data-source";
import type { MapState } from "@/features/digital-twin/map-state";
import {
  cloneDigitalTwinMapTheme,
  digitalTwinMapThemes,
  getDigitalTwinMapTheme,
} from "@/features/digital-twin/map-themes";
import type {
  DigitalTwinMapTheme,
  DigitalTwinMapThemeId,
} from "@/features/digital-twin/map-themes";
import {
  cloneMapVisualTuning,
  defaultMapVisualTuning,
} from "@/features/digital-twin/rendering/map-visual-tuning";
import type {
  EducationLocation,
  EducationLocationType,
  MapDataLayerMode,
} from "@/features/digital-twin/types";
import type DigitalTwinMapWorkspace from "./components/DigitalTwinMapWorkspace.vue";

interface DigitalTwinDashboardSessionOptions {
  mapDataSource: MapDataSource;
  locations: readonly EducationLocation[];
  initialOffsetY?: number;
  isMapActive: () => boolean;
}

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

export function useDigitalTwinDashboardSession(options: DigitalTwinDashboardSessionOptions) {
  const router = useRouter();
  const navigationStore = useNavigationStore();
  const authStore = useAuthStore();
  const userStore = useUserStore();
  const passwordDialogVisible = ref(false);
  const mapWorkspace = ref<InstanceType<typeof DigitalTwinMapWorkspace>>();
  const selectedLocation = ref<EducationLocation | undefined>(options.locations[0]);
  const activeLocations = ref<EducationLocation[]>([...options.locations]);
  const activeMapState = ref<MapState>(options.mapDataSource.initialState);
  const activeScopePath = computed(() => activeMapState.value.navigationPath ?? [{
    code: activeMapState.value.code,
    name: activeMapState.value.regionName,
    scope: activeMapState.value.scope,
  }]);
  const dataLayerMode = ref<MapDataLayerMode>("energy-towers");
  const initialMapVisualTuning = cloneMapVisualTuning(defaultMapVisualTuning);
  if (options.initialOffsetY !== undefined) {
    initialMapVisualTuning.offsetY = options.initialOffsetY;
  }
  const mapVisualTuning = ref(initialMapVisualTuning);
  const now = ref(new Date());

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
      || !options.isMapActive()
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
      || !options.isMapActive()
      || dataLayerMode.value !== "institutions"
    ) return;
    const duration = Math.max(1, mapVisualTuning.value.institutionSelectionCycleSeconds);
    schoolSelectionTimer = window.setInterval(cycleSelectedSchool, duration * 1000);
  }

  function autoFocusChildCodes() {
    if (options.locations.length === 0) return [];
    const initialState = options.mapDataSource.initialState;
    const codesWithSchools = new Set(options.locations.flatMap((location) => {
      if (location.type === "bureau") return [];
      const childState = options.mapDataSource.stateForCoordinate(location.coordinate, initialState);
      return childState ? [childState.code] : [];
    }));
    return initialState.geoData.features.flatMap((feature) => {
      const code = feature.properties.code;
      return typeof code === "string" && codesWithSchools.has(code) ? [code] : [];
    });
  }

  const autoFocusTour = new AutoFocusTour({
    isVisible: () => !document.hidden && options.isMapActive(),
    isChildScope: () => activeMapState.value.code !== options.mapDataSource.initialState.code,
    currentChildCode: () => activeScopePath.value[1]?.code,
    childCodes: autoFocusChildCodes,
    enterChild: async (code) => await mapWorkspace.value
      ?.focusFeatureAutomatically(code) ?? false,
    leaveChild: async () => await mapWorkspace.value?.goBackAutomatically() ?? false,
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

  function notifyMapActivityChanged() {
    autoFocusTour.handleVisibilityChange();
    restartSchoolSelectionCycle();
  }

  function updateActiveTheme(theme: DigitalTwinMapTheme) {
    themeDrafts.value = {
      ...themeDrafts.value,
      [theme.id]: cloneDigitalTwinMapTheme(theme),
    };
  }

  function navigateToSchool(location: EducationLocation) {
    void mapWorkspace.value?.focusLocation(location);
  }

  function selectFirstLocationOfTypes(types: readonly EducationLocationType[]) {
    const location = activeLocations.value.find((item) => types.includes(item.type));
    if (location) selectLocation(location);
  }

  function handleScopeChange(state: MapState, locations: EducationLocation[]) {
    activeMapState.value = state;
    activeLocations.value = locations;
    if (
      !selectedLocation.value
      || !locations.some((item) => item.id === selectedLocation.value?.id)
    ) {
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
    void mapWorkspace.value?.goBack();
  }

  function navigateToScope(code: string) {
    void mapWorkspace.value?.goToScope(code);
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
      () => mapVisualTuning.value.institutionSelectionCycleSeconds,
    ],
    restartSchoolSelectionCycle,
    { flush: "post" },
  );

  onMounted(() => {
    pageMounted = true;
    restartSchoolSelectionCycle();
    autoFocusTour.start();
    window.addEventListener("pointerdown", handleUserActivity, { capture: true, passive: true });
    window.addEventListener("wheel", handleUserActivity, { capture: true, passive: true });
    window.addEventListener("keydown", handleUserActivity, true);
    document.addEventListener("visibilitychange", handlePageVisibilityChange);
    startClock();
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
  });

  return {
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
    now,
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
  };
}
