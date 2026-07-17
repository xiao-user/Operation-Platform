<script setup lang="ts">
import { gsap } from "gsap";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import DigitalTwinStatusBar from "@/features/regional-education-overview/components/DigitalTwinStatusBar.vue";
import DigitalTwinTopbar from "@/features/regional-education-overview/components/DigitalTwinTopbar.vue";
import LocationProfilePanel from "@/features/regional-education-overview/components/LocationProfilePanel.vue";
import MapMaterialTuningPanel from "@/features/regional-education-overview/components/MapMaterialTuningPanel.vue";
import RegionalMapStage from "@/features/regional-education-overview/components/RegionalMapStage.vue";
import RegionalOverviewPanel from "@/features/regional-education-overview/components/RegionalOverviewPanel.vue";
import { rongchengEducationLocations } from "@/features/regional-education-overview/education-locations";
import { initialMapState } from "@/features/regional-education-overview/map-data-adapter";
import type { MapState } from "@/features/regional-education-overview/map-data-adapter";
import {
  cloneDigitalTwinMapTheme,
  digitalTwinMapThemes,
  getDigitalTwinMapTheme,
} from "@/features/regional-education-overview/map-themes";
import type { DigitalTwinMapTheme } from "@/features/regional-education-overview/map-themes";
import type {
  EducationLocation,
  EducationLocationType,
  MapDataLayerMode,
} from "@/features/regional-education-overview/types";
import { digitalTwinMotion } from "@/features/regional-education-overview/motion";
import {
  cloneMapVisualTuning,
  defaultMapVisualTuning,
} from "@/features/regional-education-overview/rendering/map-visual-tuning";
import { useUserStore } from "@/stores/user";
import { useNavigationStore } from "@/stores/navigation";
import "@/styles/digital-twin-design-system.css";

const themeStorageKey = "operation-platform:regional-education-overview:theme:v1";
const router = useRouter();
const navigationStore = useNavigationStore();
const userStore = useUserStore();
const pageRoot = ref<HTMLElement>();
const mapStage = ref<InstanceType<typeof RegionalMapStage>>();
const selectedLocation = ref<EducationLocation | undefined>(rongchengEducationLocations[0]);
const activeLocations = ref<EducationLocation[]>([...rongchengEducationLocations]);
const activeMapState = ref<MapState>(initialMapState);
const dataLayerMode = ref<MapDataLayerMode>("institutions");
const mapVisualTuning = ref(cloneMapVisualTuning(defaultMapVisualTuning));
const now = ref(new Date());
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

function restoreThemeId(): DigitalTwinMapTheme["id"] {
  try {
    const stored = window.localStorage.getItem(themeStorageKey);
    return digitalTwinMapThemes.some((theme) => theme.id === stored)
      ? stored as DigitalTwinMapTheme["id"]
      : "cyan";
  } catch {
    return "cyan";
  }
}

const activeThemeId = ref<DigitalTwinMapTheme["id"]>(restoreThemeId());
const themeDrafts = ref<Partial<Record<DigitalTwinMapTheme["id"], DigitalTwinMapTheme>>>({});
const activeTheme = computed(() => themeDrafts.value[activeThemeId.value]
  ?? getDigitalTwinMapTheme(activeThemeId.value));
const availableThemes = computed(() => digitalTwinMapThemes.map((theme) =>
  themeDrafts.value[theme.id] ?? theme));
const pageThemeStyle = computed(() => ({
  "--hud-primary": activeTheme.value.primary,
  "--hud-accent-strong": activeTheme.value.outline,
  "--hud-line": activeTheme.value.pageLine,
  "--hud-text": activeTheme.value.pageText,
  "--hud-muted": activeTheme.value.pageMuted,
  "--page-background": activeTheme.value.pageBackground,
}));
const formattedDate = computed(() => dateFormatter.format(now.value).replace(/\//g, "-"));
const formattedTime = computed(() => timeFormatter.format(now.value));
const coverageLabel = computed(() => {
  if (activeMapState.value.scope === "district") {
    return "13/16 公开镇街边界 · 溪南/凤美/京冈待权威数据";
  }
  if (activeMapState.value.code === "445202013") {
    return "渔湖边界为 2022 年拆分前公开范围";
  }
  return "公开镇街边界 · 原型数据";
});
let clockTimer: number | undefined;
let entranceMedia: ReturnType<typeof gsap.matchMedia> | undefined;

function selectLocation(location: EducationLocation) {
  selectedLocation.value = location;
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

function returnToParentScope() {
  void mapStage.value?.goBack();
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

watch(activeThemeId, (themeId) => {
  try {
    window.localStorage.setItem(themeStorageKey, themeId);
  } catch {
    // Theme persistence is optional; rendering remains functional when storage is unavailable.
  }
});

onMounted(() => {
  clockTimer = window.setInterval(() => {
    now.value = new Date();
  }, 1000);
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
        ".map-camera-control",
        ".bottom-navigation",
      ].join(",")));
      const entranceTween = gsap.from(targets, {
        autoAlpha: 0,
        x: (_, target) => {
          if (target.matches(".left-panel, .map-camera-control")) return -24;
          if (target.matches(".right-panel, .spatial-trail")) return 24;
          return 0;
        },
        y: (_, target) => {
          if (target.matches(".page-topbar")) return -16;
          if (target.matches(".bottom-navigation")) return 18;
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
  if (clockTimer !== undefined) window.clearInterval(clockTimer);
  entranceMedia?.revert();
});
</script>

<template>
  <main ref="pageRoot" class="regional-digital-twin" :style="pageThemeStyle">
    <RegionalMapStage
      ref="mapStage"
      class="map-layer"
      :locations="rongchengEducationLocations"
      :selected-location-id="selectedLocation?.id"
      :theme="activeTheme"
      :data-layer-mode="dataLayerMode"
      :visual-tuning="mapVisualTuning"
      @select="selectLocation"
      @scope-change="handleScopeChange"
      @update:data-layer-mode="dataLayerMode = $event"
    />

    <div class="hud-layer">
      <DigitalTwinTopbar
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
        @exit="exitStandalonePage"
      />

      <div class="hud-content">
        <RegionalOverviewPanel
          :locations="activeLocations"
          :selected-type="selectedLocation?.type"
          :scope-name="activeMapState.regionName"
          :is-township="activeMapState.scope === 'township'"
          :coverage-label="coverageLabel"
          @scope-back="returnToParentScope"
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
      </div>

      <MapMaterialTuningPanel
        :tuning="mapVisualTuning"
        :theme="activeTheme"
        @update:tuning="mapVisualTuning = $event"
        @update:theme="updateActiveTheme"
      />

      <DigitalTwinStatusBar
        :code="activeMapState.code"
        :scope-name="activeMapState.regionName"
        :entity-count="activeLocations.length"
        :coverage-label="coverageLabel"
      />
    </div>
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

.hud-content > *,
.hud-layer > :first-child,
.hud-layer > :last-child {
  pointer-events: auto;
}
</style>
