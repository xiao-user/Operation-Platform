<script setup lang="ts">
defineProps<{
  code: string;
  entityCount: number;
  scopeName: string;
  coverageLabel?: string;
}>();

const dashboardSections = [
  "区域教育总览",
  "学业质量监测",
  "教师发展分析",
  "学生情况分析",
  "办学条件及安全",
  "教育投入与效能",
  "数字教育实施",
  "学前/职教/特教情况",
] as const;
</script>

<template>
  <nav class="bottom-navigation" aria-label="数据驾驶舱导航">
    <p class="sr-only">
      当前地图：{{ scopeName }}，行政区划代码 {{ code }}，共 {{ entityCount }} 个空间实体。{{ coverageLabel }}
    </p>
    <button
      v-for="(section, index) in dashboardSections"
      :key="section"
      type="button"
      :class="{ 'is-active': index === 0 }"
      :aria-current="index === 0 ? 'page' : undefined"
      :disabled="index !== 0"
    >
      <span>{{ section }}</span>
      <i aria-hidden="true" />
    </button>
  </nav>
</template>

<style scoped>
.bottom-navigation {
  position: absolute;
  z-index: var(--dt-z-hud);
  bottom: var(--dt-bottom-nav-bottom);
  left: var(--dt-map-hud-left);
  display: grid;
  width: min(1440px, calc(100vw - var(--dt-right-panel-width) - 120px));
  height: var(--dt-bottom-nav-height);
  grid-template-columns: repeat(8, minmax(0, 1fr));
  border-bottom: var(--dt-border-width) solid var(--dt-color-line);
}

.bottom-navigation button {
  position: relative;
  display: flex;
  min-width: 0;
  border: 0;
  border-right: var(--dt-border-width) solid var(--dt-color-line-soft);
  padding: 0 var(--dt-space-2);
  background: transparent;
  color: var(--dt-color-text-muted);
  font-size: var(--dt-font-size-sm);
  line-height: var(--dt-line-height-sm);
  font-weight: var(--dt-font-weight-light);
  text-align: center;
  align-items: flex-start;
  justify-content: center;
}

.bottom-navigation button:last-child {
  border-right: 0;
}

.bottom-navigation button span {
  overflow: hidden;
  padding-top: var(--dt-space-3);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bottom-navigation button i {
  position: absolute;
  bottom: -6px;
  left: 50%;
  width: var(--dt-space-2);
  height: var(--dt-space-2);
  border: 2px solid var(--dt-color-text-muted);
  border-radius: 50%;
  background: var(--dt-color-canvas);
  content: "";
  transform: translateX(-50%);
}

.bottom-navigation button.is-active {
  background: linear-gradient(180deg, transparent 0%, rgb(255 255 255 / 16%) 100%);
  color: var(--dt-color-text);
  font-weight: var(--dt-font-weight-bold);
}

.bottom-navigation button.is-active i {
  border-color: var(--dt-color-text-secondary);
  background: var(--dt-color-text);
  box-shadow: 0 0 9px var(--dt-color-text), var(--dt-shadow-active-nav);
}

.bottom-navigation button:disabled {
  cursor: default;
}

@media (max-width: 1320px) {
  .bottom-navigation { left: var(--dt-space-6); width: calc(100vw - var(--dt-right-panel-width) - 72px); }
  .bottom-navigation button { font-size: var(--dt-font-size-xs); }
}
</style>
