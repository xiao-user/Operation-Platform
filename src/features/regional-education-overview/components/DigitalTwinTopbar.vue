<script setup lang="ts">
import { computed } from "vue";
import brandMark from "@/assets/figma/regional-education-overview/brand-mark.svg";
import thermostatIcon from "@/assets/figma/regional-education-overview/thermostat.svg";
import weatherCloudIcon from "@/assets/figma/regional-education-overview/weather-cloud.svg";
import type { DigitalTwinMapTheme } from "../map-themes";
import MapThemeSwitcher from "./MapThemeSwitcher.vue";

const props = defineProps<{
  tenantName: string;
  formattedDate: string;
  formattedTime: string;
  themes: readonly DigitalTwinMapTheme[];
  activeThemeId: DigitalTwinMapTheme["id"];
}>();

const emit = defineEmits<{
  themeSelect: [themeId: DigitalTwinMapTheme["id"]];
}>();

const productName = computed(() => {
  const districtName = props.tenantName.replace(/教育局$/, "");
  return `${districtName}智慧教育生态服务平台`;
});

const primaryNavigation = [
  "区域态势",
  "学业质量",
  "教师发展",
  "学生画像",
  "办学条件",
  "教育效能",
] as const;
</script>

<template>
  <header class="page-topbar">
    <div class="brand-lockup">
      <img :src="brandMark" alt="" aria-hidden="true">
      <strong>{{ productName }}</strong>
    </div>

    <nav class="primary-navigation" aria-label="驾驶舱主导航">
      <button
        v-for="(item, index) in primaryNavigation"
        :key="item"
        type="button"
        :class="{ 'is-active': index === 0 }"
        :aria-current="index === 0 ? 'page' : undefined"
        :disabled="index !== 0"
      >
        {{ item }}
      </button>
    </nav>

    <div class="system-context">
      <MapThemeSwitcher
        :themes="themes"
        :active-theme-id="activeThemeId"
        @select="emit('themeSelect', $event)"
      />
      <span class="environment-item">
        <img :src="weatherCloudIcon" alt="" aria-hidden="true">
        多云
      </span>
      <span class="environment-item">
        <img :src="thermostatIcon" alt="" aria-hidden="true">
        23℃
      </span>
      <i class="context-divider" aria-hidden="true" />
      <time :datetime="`${formattedDate}T${formattedTime}`">{{ formattedDate }} {{ formattedTime }}</time>
    </div>
  </header>
</template>

<style scoped>
.page-topbar {
  position: relative;
  z-index: var(--dt-z-hud);
  display: grid;
  width: 100%;
  height: var(--dt-topbar-height);
  grid-template-columns: minmax(360px, 1fr) auto minmax(500px, 1fr);
  border-bottom: var(--dt-border-width) solid var(--dt-color-line);
  padding: 0 var(--dt-screen-gutter);
  background: var(--dt-color-panel);
  backdrop-filter: blur(var(--dt-panel-blur));
  align-items: center;
}

.brand-lockup {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--dt-space-2);
}

.brand-lockup img {
  width: var(--dt-icon-size-md);
  height: var(--dt-icon-size-md);
  flex: 0 0 var(--dt-icon-size-md);
}

.brand-lockup strong {
  overflow: hidden;
  color: var(--dt-color-text);
  font-size: var(--dt-font-size-md);
  line-height: var(--dt-line-height-md);
  font-weight: var(--dt-font-weight-regular);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.primary-navigation {
  display: grid;
  height: 100%;
  grid-template-columns: repeat(6, 112px);
  transform: translateX(-56px);
}

.primary-navigation button {
  position: relative;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--dt-color-text-muted);
  font-size: var(--dt-font-size-sm);
  line-height: var(--dt-line-height-sm);
  font-weight: var(--dt-font-weight-light);
}

.primary-navigation button:disabled {
  cursor: default;
}

.primary-navigation button.is-active {
  color: var(--dt-color-text);
}

.primary-navigation button.is-active::after {
  position: absolute;
  right: 44px;
  bottom: -1px;
  left: 44px;
  height: 2px;
  background: var(--dt-color-accent);
  content: "";
}

.system-context {
  display: flex;
  min-width: 0;
  justify-content: flex-end;
  color: var(--dt-color-text-secondary);
  font-size: var(--dt-font-size-sm);
  line-height: var(--dt-line-height-sm);
  align-items: center;
  gap: var(--dt-space-4);
}

.environment-item {
  display: flex;
  align-items: center;
  gap: var(--dt-space-2);
  white-space: nowrap;
}

.environment-item img {
  width: var(--dt-icon-size-md);
  height: var(--dt-icon-size-md);
}

.context-divider {
  width: 1px;
  height: var(--dt-icon-size-md);
  background: var(--dt-color-line);
}

.system-context time {
  color: var(--dt-color-text-secondary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

@media (max-width: 1540px) {
  .page-topbar { grid-template-columns: minmax(300px, 1fr) auto minmax(390px, 1fr); }
  .primary-navigation { grid-template-columns: repeat(6, 88px); }
  .primary-navigation button.is-active::after { right: 32px; left: 32px; }
  .system-context { gap: var(--dt-space-3); }
}

@media (max-width: 1260px) {
  .page-topbar { grid-template-columns: 310px 1fr auto; }
  .primary-navigation { grid-template-columns: repeat(3, 96px); transform: none; }
  .primary-navigation button:nth-child(n + 4) { display: none; }
  .environment-item { display: none; }
}
</style>
