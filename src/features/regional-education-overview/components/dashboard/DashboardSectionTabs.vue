<script setup lang="ts">
import {
  isRegionalDashboardSectionEnabled,
  regionalDashboardSections,
} from "../../dashboard-sections";
import type { RegionalDashboardSectionId } from "../../dashboard-sections";

withDefaults(defineProps<{
  activeSection: RegionalDashboardSectionId;
  variant?: "primary" | "bottom";
  label: string;
}>(), {
  variant: "bottom",
});

const emit = defineEmits<{
  select: [sectionId: RegionalDashboardSectionId];
}>();

function handleTabKeydown(event: KeyboardEvent, currentIndex: number) {
  const enabledIndexes = regionalDashboardSections.flatMap((section, index) => (
    section.enabled ? [index] : []
  ));
  const currentEnabledIndex = enabledIndexes.indexOf(currentIndex);
  let nextIndex: number | undefined;
  if (event.key === "ArrowRight") {
    nextIndex = enabledIndexes[(currentEnabledIndex + 1) % enabledIndexes.length];
  } else if (event.key === "ArrowLeft") {
    nextIndex = enabledIndexes[
      (currentEnabledIndex - 1 + enabledIndexes.length) % enabledIndexes.length
    ];
  } else if (event.key === "Home") {
    nextIndex = enabledIndexes[0];
  } else if (event.key === "End") {
    nextIndex = enabledIndexes[enabledIndexes.length - 1];
  }
  if (nextIndex === undefined) return;
  event.preventDefault();
  const section = regionalDashboardSections[nextIndex];
  if (!section) return;
  emit("select", section.id);
  window.requestAnimationFrame(() => {
    const tabs = (event.currentTarget as HTMLElement).parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    tabs?.[nextIndex]?.focus();
  });
}
</script>

<template>
  <nav
    class="dashboard-section-tabs"
    :class="`is-${variant}`"
    role="tablist"
    :aria-label="label"
  >
    <slot name="description" />
    <button
      v-for="(section, index) in regionalDashboardSections"
      :key="section.id"
      type="button"
      role="tab"
      :class="{ 'is-active': activeSection === section.id }"
      :aria-label="section.label"
      :aria-selected="activeSection === section.id"
      :aria-controls="`dashboard-panel-${section.id}`"
      :tabindex="activeSection === section.id ? 0 : -1"
      :disabled="!isRegionalDashboardSectionEnabled(section.id)"
      @click="emit('select', section.id)"
      @keydown="handleTabKeydown($event, index)"
    >
      <span>{{ variant === "primary" ? section.compactLabel : section.label }}</span>
      <i v-if="variant === 'bottom'" aria-hidden="true" />
    </button>
  </nav>
</template>

<style scoped>
.dashboard-section-tabs button {
  position: relative;
  min-width: 0;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--dt-color-text-muted);
  font-size: var(--dt-font-size-sm);
  line-height: var(--dt-line-height-sm);
  font-weight: var(--dt-font-weight-light);
  cursor: pointer;
  transition: color var(--dt-transition-fast), background var(--dt-transition-fast);
}

.dashboard-section-tabs button span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-section-tabs button:disabled {
  cursor: default;
}

.dashboard-section-tabs.is-primary {
  display: grid;
  height: 100%;
  grid-template-columns: repeat(8, 96px);
  transform: translateX(-48px);
}

.dashboard-section-tabs.is-primary button.is-active {
  color: var(--dt-color-text);
}

.dashboard-section-tabs.is-primary button.is-active::after {
  position: absolute;
  right: 36px;
  bottom: -1px;
  left: 36px;
  height: 2px;
  background: var(--dt-color-accent);
  content: "";
}

.dashboard-section-tabs.is-primary button:disabled {
  opacity: 0.72;
}

.dashboard-section-tabs.is-primary button:not(:disabled, .is-active):hover {
  color: var(--dt-color-text-secondary);
}

.dashboard-section-tabs.is-bottom {
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

.dashboard-section-tabs.is-bottom button {
  display: flex;
  border-right: var(--dt-border-width) solid var(--dt-color-line-soft);
  padding: 0 var(--dt-space-2);
  text-align: center;
  align-items: flex-start;
  justify-content: center;
}

.dashboard-section-tabs.is-bottom button:last-child {
  border-right: 0;
}

.dashboard-section-tabs.is-bottom button span {
  padding-top: var(--dt-space-3);
}

.dashboard-section-tabs.is-bottom button i {
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

.dashboard-section-tabs.is-bottom button.is-active {
  background: linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--normal--white--100) 16%, transparent) 100%);
  color: var(--dt-color-text);
  font-weight: var(--dt-font-weight-bold);
}

.dashboard-section-tabs.is-bottom button.is-active i {
  border-color: var(--dt-color-text-secondary);
  background: var(--dt-color-text);
  box-shadow: 0 0 9px var(--dt-color-text), var(--dt-shadow-active-nav);
}

.dashboard-section-tabs.is-bottom button:disabled {
  opacity: 0.72;
}

.dashboard-section-tabs.is-bottom button:not(:disabled, .is-active):hover {
  background: color-mix(in srgb, var(--normal--white--100) 4%, transparent);
  color: var(--dt-color-text-secondary);
}

@media (max-width: 1540px) {
  .dashboard-section-tabs.is-primary {
    grid-template-columns: repeat(8, 74px);
    transform: translateX(-37px);
  }

  .dashboard-section-tabs.is-primary button {
    font-size: var(--dt-font-size-xs);
  }

  .dashboard-section-tabs.is-primary button.is-active::after {
    right: 27px;
    left: 27px;
  }
}

@media (max-width: 1320px) {
  .dashboard-section-tabs.is-bottom {
    left: var(--dt-space-6);
    width: calc(100vw - var(--dt-right-panel-width) - 72px);
  }

  .dashboard-section-tabs.is-bottom button {
    font-size: var(--dt-font-size-xs);
  }
}

@media (max-width: 1260px) {
  .dashboard-section-tabs.is-primary {
    width: 100%;
    grid-template-columns: repeat(8, minmax(0, 1fr));
    transform: none;
  }

  .dashboard-section-tabs.is-primary button.is-active::after {
    right: 30%;
    left: 30%;
  }
}
</style>
