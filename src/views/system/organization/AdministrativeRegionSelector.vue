<template>
  <div class="administrative-region-selector">
    <div class="selector-row">
      <el-select
        :model-value="provinceCode"
        filterable
        placeholder="选择省级地区"
        :loading="provinceLoading"
        @change="handleProvinceChange"
      >
        <el-option
          v-for="option in provinceOptions"
          :key="option.code"
          :label="option.name"
          :value="option.code"
        />
      </el-select>
      <el-select
        :model-value="cityCode"
        clearable
        filterable
        placeholder="市级（可选）"
        :disabled="!provinceCode"
        :loading="cityLoading"
        @change="handleCityChange"
      >
        <el-option
          v-for="option in cityOptions"
          :key="option.code"
          :label="option.name"
          :value="option.code"
        />
      </el-select>
      <el-select
        :model-value="districtCode"
        clearable
        filterable
        placeholder="区县（可选）"
        :disabled="!provinceCode || districtOptions.length === 0"
        :loading="districtLoading"
        @change="handleDistrictChange"
      >
        <el-option
          v-for="option in districtOptions"
          :key="option.code"
          :label="option.name"
          :value="option.code"
        />
      </el-select>
    </div>
    <p class="selector-help">
      地图将以“{{ selectedLabel }}”为最高层级，不能返回或切换到该范围之外。
    </p>
    <p v-if="loadError" class="selector-error">{{ loadError }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import {
  administrativeScopeForFeature,
  loadAdministrativeChildren,
} from "@/features/digital-twin/administrative-boundary-service";
import type {
  AdministrativeRegionNode,
  AdministrativeRegionScope,
  TenantAdministrativeRegion,
} from "@/types/user";

const props = defineProps<{
  modelValue?: TenantAdministrativeRegion;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: TenantAdministrativeRegion];
}>();

const provinceOptions = ref<AdministrativeRegionNode[]>([]);
const cityOptions = ref<AdministrativeRegionNode[]>([]);
const districtOptions = ref<AdministrativeRegionNode[]>([]);
const provinceCode = ref("");
const cityCode = ref("");
const districtCode = ref("");
const provinceLoading = ref(false);
const cityLoading = ref(false);
const districtLoading = ref(false);
const loadError = ref("");
const selectedLabel = ref("未选择地区");

function optionsFromCollection(
  collection: Awaited<ReturnType<typeof loadAdministrativeChildren>>,
  expectedScope?: AdministrativeRegionScope,
) {
  return collection.features.flatMap((feature) => {
    const code = feature.properties.code;
    const name = feature.properties.fullname ?? feature.properties.name;
    const scope = administrativeScopeForFeature(feature);
    return typeof code === "string"
      && name
      && scope !== "township"
      && scope !== undefined
      && (!expectedScope || scope === expectedScope)
      ? [{ code, name, scope } satisfies AdministrativeRegionNode]
      : [];
  });
}

async function loadOptions(
  code: string,
  scope: AdministrativeRegionScope,
  target: typeof provinceOptions,
  loading: typeof provinceLoading,
) {
  loading.value = true;
  loadError.value = "";
  try {
    target.value = optionsFromCollection(await loadAdministrativeChildren(code), scope);
  } catch (error) {
    target.value = [];
    loadError.value = error instanceof Error ? error.message : "行政区数据加载失败";
  } finally {
    loading.value = false;
  }
}

async function loadProvinceChildren(code: string) {
  cityLoading.value = true;
  districtLoading.value = true;
  loadError.value = "";
  try {
    const options = optionsFromCollection(await loadAdministrativeChildren(code));
    cityOptions.value = options.filter((option) => option.scope === "city");
    districtOptions.value = options.filter((option) => option.scope === "district");
  } catch (error) {
    cityOptions.value = [];
    districtOptions.value = [];
    loadError.value = error instanceof Error ? error.message : "行政区数据加载失败";
  } finally {
    cityLoading.value = false;
    districtLoading.value = false;
  }
}

function optionByCode(options: readonly AdministrativeRegionNode[], code: string) {
  return options.find((option) => option.code === code);
}

function emitPath(path: AdministrativeRegionNode[]) {
  const selected = path[path.length - 1];
  if (!selected) return;
  selectedLabel.value = path.map((node) => node.name).join(" / ");
  emit("update:modelValue", { ...selected, path: path.map((node) => ({ ...node })) });
}

async function handleProvinceChange(value: string) {
  provinceCode.value = value;
  cityCode.value = "";
  districtCode.value = "";
  cityOptions.value = [];
  districtOptions.value = [];
  const province = optionByCode(provinceOptions.value, value);
  if (!province) return;
  emitPath([province]);
  await loadProvinceChildren(province.code);
}

async function handleCityChange(value: string) {
  cityCode.value = value ?? "";
  districtCode.value = "";
  districtOptions.value = [];
  const province = optionByCode(provinceOptions.value, provinceCode.value);
  if (!province) return;
  const city = optionByCode(cityOptions.value, cityCode.value);
  if (!city) {
    emitPath([province]);
    await loadProvinceChildren(province.code);
    return;
  }
  emitPath([province, city]);
  await loadOptions(city.code, "district", districtOptions, districtLoading);
}

function handleDistrictChange(value: string) {
  districtCode.value = value ?? "";
  const province = optionByCode(provinceOptions.value, provinceCode.value);
  const city = optionByCode(cityOptions.value, cityCode.value);
  if (!province) return;
  const district = optionByCode(districtOptions.value, districtCode.value);
  if (district) {
    emitPath(city ? [province, city, district] : [province, district]);
  } else {
    emitPath(city ? [province, city] : [province]);
  }
}

async function initialize(region = props.modelValue) {
  await loadOptions("100000", "province", provinceOptions, provinceLoading);
  const path = region?.path ?? [];
  const province = path.find((node) => node.scope === "province");
  provinceCode.value = province?.code ?? "";
  cityCode.value = "";
  districtCode.value = "";
  cityOptions.value = [];
  districtOptions.value = [];
  if (!province) {
    selectedLabel.value = "未选择地区";
    return;
  }
  await loadProvinceChildren(province.code);
  const city = path.find((node) => node.scope === "city");
  cityCode.value = city?.code ?? "";
  if (city) {
    await loadOptions(city.code, "district", districtOptions, districtLoading);
  }
  const district = path.find((node) => node.scope === "district");
  districtCode.value = district?.code ?? "";
  selectedLabel.value = path.map((node) => node.name).join(" / ");
}

onMounted(() => initialize());
watch(
  () => props.modelValue?.code,
  (code, previousCode) => {
    if (code && code !== previousCode && code !== districtCode.value && code !== cityCode.value && code !== provinceCode.value) {
      void initialize(props.modelValue);
    }
  },
);
</script>

<style scoped>
.administrative-region-selector {
  width: 100%;
}

.selector-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--spacing-8);
}

.selector-row :deep(.el-select) {
  width: 100%;
}

.selector-help,
.selector-error {
  margin: var(--spacing-8) 0 0;
  font-size: var(--font-size-xs);
  line-height: 1.5;
}

.selector-help {
  color: var(--color-placeholder);
}

.selector-error {
  color: var(--color-error);
}

@media (max-width: 720px) {
  .selector-row {
    grid-template-columns: 1fr;
  }
}
</style>
