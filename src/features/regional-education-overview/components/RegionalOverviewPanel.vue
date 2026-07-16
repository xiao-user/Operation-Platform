<script setup lang="ts">
import { computed } from "vue";
import { countLocationsByType } from "../education-locations";
import type { EducationLocation, EducationLocationType } from "../types";
import AnimatedNumber from "./AnimatedNumber.vue";

const props = defineProps<{
  locations: readonly EducationLocation[];
  selectedType?: EducationLocationType;
  scopeName: string;
  isTownship: boolean;
  coverageLabel?: string;
}>();

const emit = defineEmits<{
  scopeBack: [];
  typeSelect: [types: readonly EducationLocationType[]];
}>();

interface SummaryItem {
  label: string;
  types: readonly EducationLocationType[];
  value: number;
}

const locationCounts = computed(() => countLocationsByType(props.locations));
const schoolCount = computed(() => props.locations.filter((item) => item.type !== "bureau").length);
const summaryItems = computed<SummaryItem[]>(() => [
  { label: "小学", types: ["primary"], value: locationCounts.value.primary },
  { label: "初中", types: ["junior"], value: locationCounts.value.junior },
  { label: "高中", types: ["senior"], value: locationCounts.value.senior },
  {
    label: "综合/职教",
    types: ["comprehensive", "vocational"],
    value: locationCounts.value.comprehensive + locationCounts.value.vocational,
  },
]);

function isSelected(types: readonly EducationLocationType[]) {
  return props.selectedType ? types.includes(props.selectedType) : false;
}
</script>

<template>
  <aside class="left-panel" aria-label="区域教育数据汇总">
    <nav v-if="isTownship" class="scope-breadcrumb" aria-label="地图下钻路径">
      <button type="button" @click="emit('scopeBack')">榕城区</button>
      <span>/</span>
      <h2>{{ scopeName }}</h2>
    </nav>
    <h2 v-else>{{ scopeName }}</h2>

    <div class="summary-list">
      <div class="summary-row total-row">
        <div class="summary-value"><strong><AnimatedNumber :value="schoolCount" /></strong><span>所</span></div>
        <span class="summary-label">共有<br>学校</span>
      </div>

      <button
        v-for="item in summaryItems"
        :key="item.label"
        type="button"
        class="summary-row"
        :class="{ 'is-active': isSelected(item.types) }"
        :disabled="item.value === 0"
        @click="emit('typeSelect', item.types)"
      >
        <span class="summary-value"><strong><AnimatedNumber :value="item.value" /></strong><span>所</span></span>
        <span class="summary-label">{{ item.label }}</span>
      </button>
    </div>

    <p class="sr-only">{{ coverageLabel }}。公开地图原型数据。</p>
  </aside>
</template>

<style scoped>
.left-panel {
  position: absolute;
  top: calc(var(--dt-left-panel-top) - var(--dt-topbar-height));
  left: var(--dt-left-panel-left);
  width: var(--dt-left-panel-width);
  color: var(--dt-color-text);
}

.left-panel h2 {
  margin: 0;
  color: var(--dt-color-text);
  font-size: var(--dt-font-size-md);
  line-height: var(--dt-line-height-md);
  font-weight: var(--dt-font-weight-light);
}

.scope-breadcrumb {
  display: flex;
  min-width: 0;
  height: var(--dt-line-height-md);
  align-items: center;
  gap: var(--dt-space-2);
}

.scope-breadcrumb button {
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--dt-color-text-secondary);
  font-size: var(--dt-font-size-md);
  line-height: var(--dt-line-height-md);
  font-weight: var(--dt-font-weight-light);
  cursor: pointer;
}

.scope-breadcrumb button:hover {
  color: var(--dt-color-accent);
}

.scope-breadcrumb > span {
  color: var(--dt-color-text-muted);
  font-size: var(--dt-font-size-sm);
}

.scope-breadcrumb h2 {
  min-width: 0;
  overflow: hidden;
  color: var(--dt-color-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-list {
  display: grid;
  margin-top: var(--dt-space-10);
  gap: 29px;
}

.summary-row {
  display: grid;
  width: 100%;
  min-height: 46px;
  grid-template-columns: var(--dt-summary-value-column) 1fr;
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  align-items: center;
  cursor: pointer;
}

button.summary-row {
  transition: color var(--dt-transition-fast), transform var(--dt-transition-fast);
}

button.summary-row:hover,
button.summary-row.is-active {
  color: var(--dt-color-accent);
  transform: translateX(var(--dt-space-1));
}

button.summary-row:disabled {
  opacity: 0.4;
  cursor: default;
  transform: none;
}

.summary-value {
  display: flex;
  align-items: baseline;
}

.summary-value strong {
  color: currentcolor;
  font-size: var(--dt-font-size-stat);
  line-height: var(--dt-line-height-stat);
  font-weight: var(--dt-font-weight-medium);
  font-variant-numeric: tabular-nums;
}

.summary-value > span {
  margin-left: 2px;
  color: currentcolor;
  font-size: var(--dt-font-size-sm);
  line-height: var(--dt-line-height-sm);
  font-weight: var(--dt-font-weight-light);
}

.summary-label {
  color: var(--dt-color-text-muted);
  font-size: var(--dt-font-size-sm);
  line-height: var(--dt-line-height-sm);
  font-weight: var(--dt-font-weight-light);
}

button.summary-row.is-active .summary-label,
button.summary-row:hover .summary-label {
  color: var(--dt-color-text-secondary);
}

@media (max-height: 820px) {
  .summary-list { margin-top: var(--dt-space-6); gap: var(--dt-space-5); }
}
</style>
