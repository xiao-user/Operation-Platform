<script setup lang="ts">
import { useId } from "vue";
import DashboardPanelHeader from "./DashboardPanelHeader.vue";

export type DashboardPanelState =
  | { status: "ready" }
  | { status: "loading" }
  | { status: "empty"; message?: string }
  | { status: "error"; message: string };

const props = withDefaults(defineProps<{
  title: string;
  code?: string;
  description?: string;
  helpText?: string;
  state?: DashboardPanelState;
  variant?: "standard" | "primary";
  bodyMode?: "padded" | "flush";
}>(), {
  code: undefined,
  description: undefined,
  helpText: undefined,
  state: () => ({ status: "ready" }),
  variant: "standard",
  bodyMode: "padded",
});

const headingId = `dashboard-panel-heading-${useId().replace(/:/g, "")}`;
</script>

<template>
  <article
    class="dashboard-panel quality-panel"
    :class="[
      `is-${variant}`,
      `is-${bodyMode}`,
      `has-${props.state.status}-state`,
    ]"
    :aria-labelledby="headingId"
  >
    <DashboardPanelHeader
      :title="title"
      :heading-id="headingId"
      :code="code"
      :description="description"
      :help-text="helpText"
    >
      <template v-if="$slots['header-actions']" #actions>
        <slot name="header-actions" />
      </template>
    </DashboardPanelHeader>

    <div class="dashboard-panel__body">
      <div v-if="props.state.status === 'loading'" class="dashboard-panel__state" aria-live="polite">
        <i aria-hidden="true" />
        <span>数据加载中</span>
      </div>
      <div v-else-if="props.state.status === 'empty'" class="dashboard-panel__state">
        <span>{{ props.state.message ?? "暂无可展示数据" }}</span>
      </div>
      <div v-else-if="props.state.status === 'error'" class="dashboard-panel__state is-error" role="alert">
        <span>{{ props.state.message }}</span>
        <slot name="error-action" />
      </div>
      <slot v-else />
    </div>
  </article>
</template>

<style scoped>
.dashboard-panel {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background:
    linear-gradient(90deg, var(--normal--black--20), var(--normal--black--20)),
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--background---ray-charts) 94%, var(--normal--white--100)),
      color-mix(in srgb, var(--background---ray-charts) 92%, var(--normal--black--100))
    );
  box-shadow: inset 0 1px 0 var(--normal--white--5), var(--dt-panel-shadow);
  flex-direction: column;
}

.dashboard-panel.is-primary {
  background:
    radial-gradient(circle at 50% 0%, var(--dt-chart-area-secondary), transparent 52%),
    linear-gradient(90deg, var(--normal--black--20), var(--normal--black--20)),
    var(--dt-panel-surface-primary);
}

.dashboard-panel__body {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding: 0 var(--dt-space-2) var(--dt-space-2);
  flex: 1;
}

.dashboard-panel.is-flush .dashboard-panel__body {
  padding: 0;
}

.dashboard-panel__state {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 64px;
  color: var(--dt-panel-description);
  font-size: var(--dt-font-size-xs);
  align-items: center;
  justify-content: center;
  gap: var(--dt-space-2);
}

.dashboard-panel__state i {
  width: var(--dt-space-2);
  height: var(--dt-space-2);
  border-radius: 50%;
  background: var(--dt-chart-series-secondary);
  box-shadow: 0 0 var(--dt-space-3) var(--charts--2-50);
}

.dashboard-panel__state.is-error {
  color: var(--dt-color-danger);
}

</style>
