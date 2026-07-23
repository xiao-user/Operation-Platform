<template>
  <RegionalEducationOverviewView
    v-if="mapDataSource"
    :key="dashboardKey"
    :map-data-source="mapDataSource"
    :locations="locations"
    :show-dashboard-sections="mode === 'regional-education'"
    :dashboard-variant="mode"
  />
  <main v-else class="dashboard-loader" aria-live="polite">
    <div class="dashboard-loader__card">
      <span class="dashboard-loader__eyebrow">行政区地图</span>
      <h1>{{ loadError ? "地图数据暂时不可用" : "正在加载机构地图" }}</h1>
      <p>{{ loadError || `正在准备${regionName}的行政区边界…` }}</p>
      <el-button v-if="loadError" type="primary" @click="loadMapDataSource">重新加载</el-button>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import RegionalEducationOverviewView from "./RegionalEducationOverviewView.vue";
import { rongchengEducationLocations } from "@/features/regional-education-overview/education-locations";
import {
  createTenantMapDataSource,
  hasTenantLocalEducationMap,
} from "@/features/regional-education-overview/tenant-map-data-source";
import type { TenantMapMode } from "@/features/regional-education-overview/tenant-map-data-source";
import type { MapDataSource } from "@/features/regional-education-overview/map-data-source";
import {
  defaultAdministrativeRegionForTenant,
  normalizeTenantAdministrativeRegion,
} from "@/features/tenant/administrative-region";
import { useUserStore } from "@/stores/user";

const props = defineProps<{
  mode: TenantMapMode;
}>();

const userStore = useUserStore();
const mapDataSource = ref<MapDataSource>();
const loadError = ref("");
let loadController: AbortController | undefined;
let loadGeneration = 0;

const region = computed(() => (
  normalizeTenantAdministrativeRegion(userStore.currentTenant.administrativeRegion)
  ?? defaultAdministrativeRegionForTenant(userStore.currentTenant)
));
const regionName = computed(() => region.value?.name ?? "当前机构");
const dashboardKey = computed(() => (
  `${userStore.currentTenant.id}:${props.mode}:${region.value?.code ?? "unconfigured"}`
));
const locations = computed(() => (
  region.value && hasTenantLocalEducationMap({
    tenantId: userStore.currentTenant.id,
    region: region.value,
    mode: props.mode,
  })
    ? rongchengEducationLocations
    : []
));

async function loadMapDataSource() {
  const selectedRegion = region.value;
  loadController?.abort();
  mapDataSource.value = undefined;
  loadError.value = "";
  if (!selectedRegion) {
    loadError.value = "当前机构尚未配置地图范围，请在组织管理中设置行政区。";
    return;
  }
  const generation = ++loadGeneration;
  const controller = new AbortController();
  loadController = controller;
  try {
    const source = await createTenantMapDataSource({
      tenantId: userStore.currentTenant.id,
      region: selectedRegion,
      mode: props.mode,
      signal: controller.signal,
    });
    if (generation === loadGeneration && !controller.signal.aborted) {
      mapDataSource.value = source;
    }
  } catch (error) {
    if (generation === loadGeneration && !controller.signal.aborted) {
      loadError.value = error instanceof Error ? error.message : "行政区地图加载失败";
    }
  } finally {
    if (generation === loadGeneration) loadController = undefined;
  }
}

watch(
  () => [userStore.currentTenant.id, region.value?.code, props.mode] as const,
  () => void loadMapDataSource(),
  { immediate: true },
);

onBeforeUnmount(() => {
  loadGeneration += 1;
  loadController?.abort();
});
</script>

<style scoped>
.dashboard-loader {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: var(--spacing-24);
  color: var(--charts-text-primary, #e8f4ff);
  background:
    radial-gradient(circle at 50% 45%, rgb(0 145 255 / 12%), transparent 38%),
    var(--charts-bg-deep, #070d18);
}

.dashboard-loader__card {
  width: min(460px, 100%);
  padding: var(--spacing-32);
  text-align: center;
  border: 1px solid rgb(90 184 255 / 24%);
  background: rgb(10 20 34 / 78%);
  box-shadow: 0 24px 80px rgb(0 0 0 / 32%);
}

.dashboard-loader__eyebrow {
  color: var(--charts-accent, #30d7ff);
  font-size: var(--font-size-xs);
  letter-spacing: 0.18em;
}

.dashboard-loader h1 {
  margin: var(--spacing-12) 0 var(--spacing-8);
  font-size: var(--font-size-lg);
}

.dashboard-loader p {
  margin: 0 0 var(--spacing-20);
  color: var(--charts-text-secondary, #8fa5bb);
  line-height: 1.7;
}
</style>
