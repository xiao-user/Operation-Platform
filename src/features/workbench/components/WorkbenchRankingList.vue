<template>
  <div class="ranking-panel">
    <WorkbenchSecondaryTabs v-model="period" :options="periodOptions" aria-label="排行周期" />
    <ol>
      <li v-for="(item, index) in rankedItems" :key="item.id">
        <span class="ranking-index" :class="{ 'is-leading': index < 3 }">{{ index + 1 }}</span>
        <div>
          <span>
            <strong>{{ item.name }}</strong>
            <small v-if="data.mode === 'resource'">{{ formatCount(item.usage) }} 浏览 · {{ formatCount(item.uploads ?? 0) }} 上传</small>
            <small v-else>{{ formatUsage(item.usage) }} · {{ item.trend }}</small>
          </span>
          <el-progress :percentage="Math.round((item.usage / maxUsage) * 100)" :show-text="false" :stroke-width="5" />
        </div>
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import WorkbenchSecondaryTabs from "@/features/workbench/components/WorkbenchSecondaryTabs.vue";
import type { WorkbenchRankingData } from "@/features/workbench/types";

const props = defineProps<{ data: WorkbenchRankingData }>();
const period = ref<"7d" | "30d" | "term">("30d");
const periodOptions = [
  { label: "近 7 天", value: "7d" },
  { label: "近 30 天", value: "30d" },
  { label: "本学期", value: "term" },
];
const periodFactor = computed(() => ({ "7d": 0.26, "30d": 1, term: 4.8 })[period.value]);
const rankedItems = computed(() => props.data.items.map((item) => ({
  ...item,
  usage: Number((item.usage * periodFactor.value).toFixed(1)),
})));
const maxUsage = computed(() => Math.max(...rankedItems.value.map((item) => item.usage), 1));

function formatUsage(usage: number) {
  return `${usage.toFixed(usage >= 10 ? 1 : 2)} 万次`;
}

function formatCount(value: number) {
  return value.toLocaleString("zh-CN");
}
</script>

<style scoped>
.ranking-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: var(--spacing-10);
}

.ranking-panel ol {
  padding: 0;
  margin: 0;
  list-style: none;
}

.ranking-panel li {
  display: flex;
  align-items: center;
  min-height: 42px;
  gap: var(--spacing-10);
}

.ranking-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  color: var(--color-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  background: var(--color-bg-muted);
  border-radius: var(--radius-md);
}

.ranking-index.is-leading {
  color: var(--color-primary);
  background: var(--color-primary-light);
}

.ranking-panel li > div {
  min-width: 0;
  flex: 1;
}

.ranking-panel li > div > span {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  margin-bottom: var(--spacing-4);
  gap: var(--spacing-8);
}

.ranking-panel strong {
  overflow: hidden;
  color: var(--color-body);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ranking-panel small {
  flex-shrink: 0;
  color: var(--color-success-dark-text);
  font-size: var(--font-size-xs);
}
</style>
