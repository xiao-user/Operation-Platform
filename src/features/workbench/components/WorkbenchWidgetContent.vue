<template>
  <div v-if="data.kind === 'metric'" class="metric-content">
    <strong>{{ data.value }}</strong>
    <span :class="`trend-${data.trendTone}`">{{ data.trend }}</span>
  </div>

  <WorkbenchTrendChart v-else-if="data.kind === 'trend'" :data="data" />

  <ul v-else-if="data.kind === 'list' || data.kind === 'schedule'" class="widget-list">
    <li v-for="item in data.items" :key="item.id">
      <span class="list-marker" :class="`tone-${item.tone ?? 'neutral'}`" />
      <div>
        <div class="list-title">
          <span v-if="item.label" class="list-label">{{ item.label }}</span>
          <strong>{{ item.title }}</strong>
        </div>
        <span>{{ item.meta }}</span>
      </div>
    </li>
    <li v-if="!data.items.length" class="empty-row">暂无内容</li>
  </ul>

  <div v-else-if="data.kind === 'distribution'" class="distribution-content">
    <div v-for="item in data.items" :key="item.label" class="distribution-row">
      <div class="distribution-label">
        <span>{{ item.label }}</span>
        <strong>{{ item.displayValue }}</strong>
      </div>
      <div class="distribution-track">
        <span :class="`tone-${item.tone}`" :style="{ width: `${item.value}%` }" />
      </div>
    </div>
  </div>

  <WorkbenchRankingList v-else-if="data.kind === 'ranking'" :data="data" />

  <WorkbenchCalendarAgenda v-else-if="data.kind === 'calendar'" :data="data" />

  <WorkbenchTaskCenter v-else-if="data.kind === 'task-center'" :data="data" />

  <WorkbenchBureauFeed v-else-if="data.kind === 'feed'" :data="data" />

  <WorkbenchSubscriptions v-else-if="data.kind === 'subscriptions'" :data="data" />

  <WorkbenchGrowthSummary v-else-if="data.kind === 'growth'" :data="data" />

  <WorkbenchEducationChart v-else-if="data.kind === 'education-chart'" :data="data" />

  <WorkbenchActivityRank v-else-if="data.kind === 'activity-rank'" :data="data" />

  <WorkbenchQuickApps v-else-if="data.kind === 'quick-links'" :data="data" />
</template>

<script setup lang="ts">
import WorkbenchActivityRank from "@/features/workbench/components/WorkbenchActivityRank.vue";
import WorkbenchCalendarAgenda from "@/features/workbench/components/WorkbenchCalendarAgenda.vue";
import WorkbenchBureauFeed from "@/features/workbench/components/WorkbenchBureauFeed.vue";
import WorkbenchEducationChart from "@/features/workbench/components/WorkbenchEducationChart.vue";
import WorkbenchGrowthSummary from "@/features/workbench/components/WorkbenchGrowthSummary.vue";
import WorkbenchQuickApps from "@/features/workbench/components/WorkbenchQuickApps.vue";
import WorkbenchRankingList from "@/features/workbench/components/WorkbenchRankingList.vue";
import WorkbenchSubscriptions from "@/features/workbench/components/WorkbenchSubscriptions.vue";
import WorkbenchTaskCenter from "@/features/workbench/components/WorkbenchTaskCenter.vue";
import WorkbenchTrendChart from "@/features/workbench/components/WorkbenchTrendChart.vue";
import type { WorkbenchWidgetData } from "@/features/workbench/types";

defineProps<{ data: WorkbenchWidgetData }>();
</script>

<style scoped>
.metric-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  gap: var(--spacing-8);
}

.metric-content strong {
  color: var(--color-title);
  font-size: 30px;
  line-height: 36px;
}

.metric-content span {
  color: var(--color-secondary);
  font-size: var(--font-size-sm);
}

.metric-content .trend-up { color: var(--color-success-dark-text); }
.metric-content .trend-down { color: var(--color-error-dark-text); }

.distribution-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.widget-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
  padding: 0;
  margin: 0;
  list-style: none;
}

.widget-list li {
  display: flex;
  align-items: center;
  min-height: 38px;
  gap: var(--spacing-10);
  padding: var(--spacing-6) 0;
  border-bottom: 1px solid var(--color-border);
}

.widget-list li:last-child {
  border-bottom: 0;
}

.widget-list li > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  flex: 1;
  gap: var(--spacing-12);
}

.widget-list strong {
  overflow: hidden;
  color: var(--color-body);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list-title {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: var(--spacing-8);
}

.widget-list .list-label {
  flex-shrink: 0;
  padding: 0 var(--spacing-6);
  color: var(--color-secondary);
  font-size: var(--font-size-xs);
  line-height: 20px;
  background: var(--color-bg-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.widget-list span {
  color: var(--color-secondary);
  font-size: var(--font-size-xs);
  white-space: nowrap;
}

.list-marker {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  background: var(--color-secondary);
  border-radius: var(--radius-full);
}

.tone-primary { background: var(--color-primary); }
.tone-success { background: var(--color-success-dark-text); }
.tone-warning { background: var(--color-warning); }
.tone-danger { background: var(--color-error); }
.tone-neutral { background: var(--color-secondary); }

.widget-list .empty-row {
  justify-content: center;
  color: var(--color-secondary);
  font-size: var(--font-size-sm);
}

.distribution-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  gap: var(--spacing-14);
}

.distribution-label {
  margin-bottom: var(--spacing-6);
  color: var(--color-body);
  font-size: var(--font-size-sm);
}

.distribution-label strong {
  color: var(--color-title);
  font-weight: var(--font-weight-semibold);
}

.distribution-track {
  height: 7px;
  overflow: hidden;
  background: var(--color-bg-soft);
  border-radius: var(--radius-full);
}

.distribution-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
}

</style>
