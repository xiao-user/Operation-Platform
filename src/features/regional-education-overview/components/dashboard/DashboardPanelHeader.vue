<script setup lang="ts">
import { CircleHelp } from "@lucide/vue";
import { ElTooltip } from "element-plus";
import chartTitleMarker from "@/assets/figma/regional-education-overview/chart-title-marker.svg";

withDefaults(defineProps<{
  title: string;
  headingId: string;
  code?: string;
  description?: string;
  helpText?: string;
  align?: "start" | "center";
}>(), {
  code: undefined,
  description: undefined,
  helpText: undefined,
  align: "start",
});

const titleMarkerStyle = {
  "--dashboard-title-marker": `url("${chartTitleMarker}")`,
};
</script>

<template>
  <header class="dashboard-panel-header" :class="`is-${align}`">
    <div class="dashboard-panel-header__title">
      <span v-if="code" class="dashboard-panel-header__code">{{ code }}</span>
      <div class="dashboard-panel-header__heading">
        <i
          class="dashboard-panel-header__marker"
          :style="titleMarkerStyle"
          aria-hidden="true"
        />
        <h2 :id="headingId">{{ title }}</h2>
      </div>
      <p v-if="description">{{ description }}</p>
    </div>

    <div v-if="$slots.actions || helpText" class="dashboard-panel-header__right">
      <div v-if="$slots.actions" class="dashboard-panel-header__actions">
        <slot name="actions" />
      </div>
      <ElTooltip
        v-if="helpText"
        :content="helpText"
        placement="bottom-end"
        effect="dark"
        :show-after="180"
        :teleported="false"
        popper-class="dashboard-panel-help-popper"
      >
        <button
          type="button"
          class="dashboard-panel-header__help"
          :aria-label="`查看${title}说明`"
        >
          <CircleHelp aria-hidden="true" :size="16" :stroke-width="1.5" />
        </button>
      </ElTooltip>
    </div>
  </header>
</template>

<style scoped>
.dashboard-panel-header {
  display: flex;
  min-width: 0;
  min-height: 52px;
  padding: var(--dt-space-3);
  align-items: center;
  justify-content: space-between;
  gap: var(--dt-space-4);
}

.dashboard-panel-header__title {
  min-width: 0;
}

.dashboard-panel-header__heading {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--dt-space-2);
}

.dashboard-panel-header__marker {
  width: var(--dt-icon-size-sm);
  height: var(--dt-icon-size-sm);
  flex: none;
  background: var(--dt-chart-series-secondary);
  mask-image: var(--dashboard-title-marker);
  mask-position: center;
  mask-repeat: no-repeat;
  mask-size: contain;
  -webkit-mask-image: var(--dashboard-title-marker);
  -webkit-mask-position: center;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-size: contain;
  transition: background var(--dt-transition-theme);
}

.dashboard-panel-header__code {
  display: block;
  overflow: hidden;
  color: var(--dt-chart-series-secondary);
  font-size: var(--dt-font-size-2xs);
  line-height: var(--dt-line-height-xs);
  letter-spacing: var(--dt-letter-spacing-title);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-panel-header h2 {
  margin: 0;
  overflow: hidden;
  color: var(--dt-panel-title);
  font-size: var(--dt-font-size-sm);
  line-height: var(--dt-line-height-sm);
  font-weight: var(--dt-font-weight-regular);
  letter-spacing: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-panel-header__code + .dashboard-panel-header__heading {
  margin-top: var(--dt-space-1);
}

.dashboard-panel-header p {
  margin: var(--dt-space-1) 0 0;
  color: var(--dt-panel-description);
  font-size: var(--dt-font-size-xs);
  line-height: var(--dt-line-height-xs);
}

.dashboard-panel-header__right,
.dashboard-panel-header__actions {
  display: flex;
  min-width: 0;
  flex: 0 1 auto;
  align-items: center;
  justify-content: flex-end;
}

.dashboard-panel-header__right {
  gap: var(--dt-space-3);
}

.dashboard-panel-header__help {
  display: grid;
  width: var(--dt-icon-size-md);
  height: var(--dt-icon-size-md);
  flex: none;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--dt-panel-description);
  cursor: help;
  place-items: center;
  transition: color var(--dt-transition-fast), background var(--dt-transition-fast);
}

.dashboard-panel-header__help:hover,
.dashboard-panel-header__help:focus-visible {
  background: var(--charts--2-10);
  color: var(--dt-chart-series-secondary);
}

.dashboard-panel-header.is-center {
  align-items: center;
}

.dashboard-panel-header.is-center .dashboard-panel-header__title {
  text-align: center;
}

.dashboard-panel-header.is-center .dashboard-panel-header__heading {
  justify-content: center;
}

@media (max-width: 1320px) {
  .dashboard-panel-header {
    min-height: 48px;
  }
}

@media (max-height: 820px) {
  .dashboard-panel-header {
    min-height: 42px;
  }

  .dashboard-panel-header p {
    display: none;
  }
}
</style>

<style>
.regional-digital-twin .dashboard-panel-help-popper.el-popper {
  max-width: 280px;
  border: var(--dt-border-width) solid var(--charts--2-50);
  border-radius: 0;
  padding: var(--dt-space-2) var(--dt-space-3);
  background: var(--dt-chart-tooltip-background);
  color: var(--dt-chart-tooltip-text);
  font-family: var(--dt-font-family);
  font-size: var(--dt-font-size-xs);
  line-height: var(--dt-line-height-sm);
  box-shadow: var(--dt-panel-shadow);
}

.regional-digital-twin .dashboard-panel-help-popper.el-popper .el-popper__arrow::before {
  border-color: var(--charts--2-50);
  border-radius: 0;
  background: var(--dt-chart-tooltip-background);
}
</style>
