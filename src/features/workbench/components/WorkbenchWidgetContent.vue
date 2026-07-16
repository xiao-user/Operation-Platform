<template>
  <div v-if="data.kind === 'metric'" class="metric-content">
    <strong>{{ data.value }}</strong>
    <span :class="`trend-${data.trendTone}`">{{ data.trend }}</span>
  </div>

  <div v-else-if="data.kind === 'trend'" class="trend-content">
    <svg viewBox="0 0 600 180" role="img" aria-label="趋势图">
      <defs>
        <linearGradient id="workbench-trend-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.24" />
          <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path :d="areaPath" fill="url(#workbench-trend-fill)" />
      <polyline :points="linePoints" fill="none" stroke="var(--color-primary)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <div class="trend-footer">
      <span>{{ data.labels[0] }}</span>
      <strong>{{ data.summary }}</strong>
      <span>{{ data.labels[data.labels.length - 1] }}</span>
    </div>
  </div>

  <ul v-else-if="data.kind === 'list' || data.kind === 'schedule'" class="widget-list">
    <li v-for="item in data.items" :key="item.id">
      <span class="list-marker" :class="`tone-${item.tone ?? 'neutral'}`" />
      <div>
        <strong>{{ item.title }}</strong>
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

  <div v-else-if="data.kind === 'quick-links'" class="quick-link-grid">
    <template v-for="item in data.items" :key="item.id">
      <RouterLink
        v-if="item.kind === 'internal'"
        class="quick-link-item"
        :to="internalQuickLinkLocation(item)"
        :target="item.openMode === 'new-tab' ? '_blank' : undefined"
        :rel="item.openMode === 'new-tab' ? 'noopener noreferrer' : undefined"
      >
        <span>{{ item.name.slice(0, 1) }}</span>
        {{ item.name }}
      </RouterLink>
      <a
        v-else
        class="quick-link-item"
        :href="item.target"
        :target="item.openMode === 'new-tab' ? '_blank' : undefined"
        :rel="item.openMode === 'new-tab' ? 'noopener noreferrer' : undefined"
      >
        <span>{{ item.name.slice(0, 1) }}</span>
        {{ item.name }}
      </a>
    </template>
    <div v-if="!data.items.length" class="quick-link-empty">当前角色暂无可用快捷入口</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { WorkbenchQuickLinkData, WorkbenchWidgetData } from "@/features/workbench/types";

const props = defineProps<{ data: WorkbenchWidgetData }>();

const linePoints = computed(() => {
  if (props.data.kind !== "trend" || !props.data.values.length) return "";
  const values = props.data.values;
  const min = Math.min(...values) - 5;
  const max = Math.max(...values) + 5;
  const range = Math.max(1, max - min);
  return values.map((value, index) => {
    const x = values.length === 1 ? 300 : (index / (values.length - 1)) * 580 + 10;
    const y = 160 - ((value - min) / range) * 130;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
});

const areaPath = computed(() => {
  if (!linePoints.value) return "";
  const points = linePoints.value.split(" ");
  return `M ${points[0]} L ${points.slice(1).join(" L ")} L 590,170 L 10,170 Z`;
});

function internalQuickLinkLocation(item: WorkbenchQuickLinkData) {
  if (item.openMode === "current" || !item.tenantId) return item.target;
  return { path: item.target, query: { tenantId: item.tenantId } };
}
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
  letter-spacing: -0.02em;
}

.metric-content span {
  color: var(--color-secondary);
  font-size: var(--font-size-sm);
}

.metric-content .trend-up { color: var(--color-success-dark-text); }
.metric-content .trend-down { color: var(--color-error-dark-text); }

.trend-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.trend-content svg {
  width: 100%;
  flex: 1;
  min-height: 120px;
}

.trend-footer,
.distribution-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.trend-footer {
  gap: var(--spacing-12);
  color: var(--color-secondary);
  font-size: var(--font-size-xs);
}

.trend-footer strong {
  color: var(--color-body);
  font-weight: var(--font-weight-medium);
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
  padding: var(--spacing-6) var(--spacing-8);
  border-radius: var(--radius-md);
}

.widget-list li:hover {
  background: var(--color-bg-page);
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

.widget-list .empty-row,
.quick-link-empty {
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

.quick-link-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-8);
}

.quick-link-item {
  display: flex;
  align-items: center;
  min-width: 0;
  min-height: 42px;
  gap: var(--spacing-8);
  padding: var(--spacing-8) var(--spacing-10);
  overflow: hidden;
  color: var(--color-body);
  font: inherit;
  font-size: var(--font-size-sm);
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: var(--color-bg-page);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  text-decoration: none;
}

.quick-link-item:hover {
  color: var(--color-primary);
  border-color: var(--color-primary-line-light);
}

.quick-link-item > span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  background: var(--color-primary-light);
  border-radius: var(--radius-md);
}

.quick-link-empty {
  display: flex;
  align-items: center;
  min-height: 80px;
  grid-column: 1 / -1;
}
</style>
