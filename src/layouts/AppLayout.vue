<template>
  <div class="app-layout">
    <Transition name="module-rail-slide" appear>
      <div v-if="!isWorkbenchRoute" class="module-rail-slot">
        <AppModuleRail />
      </div>
    </Transition>

    <div class="app-shell">
      <AppHeader />

      <div class="app-body" :class="{ 'is-workbench': isWorkbenchRoute }">
        <div v-if="!isWorkbenchRoute && deepMenus.length" class="app-sidebar-slot">
          <AppSidebar />
        </div>
        <main class="app-content">
          <div class="app-content-inner">
            <RouterView />
          </div>
        </main>
        <Transition name="assistant-panel">
          <div
            v-if="aiAssistantStore.isOpen"
            class="ai-assistant-slot"
            :class="{ 'is-expanded': aiAssistantStore.isExpanded }"
          >
            <AiAssistantSidebar />
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import AppHeader from "@/components/AppHeader.vue";
import AppModuleRail from "@/components/AppModuleRail.vue";
import AppSidebar from "@/components/AppSidebar.vue";
import { useAiAssistantStore } from "@/stores/ai-assistant";
import { useNavigationStore } from "@/stores/navigation";
import { useUserStore } from "@/stores/user";

const route = useRoute();
const AiAssistantSidebar = defineAsyncComponent(() =>
  import("@/features/ai-assistant/components/AiAssistantSidebar.vue")
);
const router = useRouter();
const navigationStore = useNavigationStore();
const userStore = useUserStore();
const aiAssistantStore = useAiAssistantStore();
const { currentTenant, roleIds } = storeToRefs(userStore);
const { activeRoleRecords, deepMenus, isWorkbenchRoute } = storeToRefs(navigationStore);

watch(
  () => currentTenant.value.id,
  () => navigationStore.loadTenant(currentTenant.value),
  { immediate: true },
);

watch(
  () => route.fullPath,
  () => navigationStore.syncByRoute(route),
  { immediate: true },
);

watch(
  () => ({
    tenantId: currentTenant.value.id,
    accessSignature: [
      roleIds.value.join("|"),
      activeRoleRecords.value
        .map((role) => `${role.id}:${role.enabled}:${role.menuIds.join(",")}`)
        .join(";"),
    ].join("::"),
  }),
  (current, previous) => {
    if (!previous || current.tenantId !== previous.tenantId) return;
    void navigationStore.ensureValidCurrentRoute(router);
  },
  { flush: "post" },
);
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  background-color: var(--color-bg);
  overflow: hidden;
}

.app-shell {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  overflow: hidden;
}

.app-body {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.app-content {
  flex: 1;
  min-width: 0;
  overflow: auto;
  background-color: var(--color-bg);
}

.app-content-inner {
  min-height: 100%;
  padding: var(--content-padding);
}

.app-body.is-workbench .app-content-inner {
  padding: var(--spacing-16) var(--spacing-24);
}

.module-rail-slot,
.app-sidebar-slot {
  display: flex;
  min-width: 0;
  overflow: hidden;
  flex-shrink: 0;
}

.ai-assistant-slot {
  display: flex;
  width: 419px;
  min-width: 419px;
  height: 100%;
  flex: 0 0 419px;
  overflow: hidden;
}

.ai-assistant-slot.is-expanded {
  width: 0;
  min-width: 0;
  flex-basis: 0;
  overflow: visible;
}

.assistant-panel-enter-active,
.assistant-panel-leave-active {
  transition: width 180ms ease, min-width 180ms ease, flex-basis 180ms ease;
}

.assistant-panel-enter-from,
.assistant-panel-leave-to {
  width: 0;
  min-width: 0;
  flex-basis: 0;
}

.module-rail-slot {
  max-width: 96px;
}

.app-sidebar-slot {
  width: var(--sidebar-width);
}

.module-rail-slide-enter-active :deep(.module-rail) {
  transition:
    opacity 160ms ease-out,
    transform 180ms ease-out;
  will-change: opacity, transform;
}

.module-rail-slide-enter-active,
.module-rail-slide-leave-active {
  max-width: 96px;
  overflow: hidden;
  will-change: max-width;
}

.module-rail-slide-enter-active {
  transition: max-width 180ms ease-out;
}

.module-rail-slide-leave-active {
  transition: max-width 140ms ease-in;
}

.module-rail-slide-leave-active :deep(.module-rail) {
  transition:
    opacity 120ms ease-in,
    transform 140ms ease-in;
  will-change: opacity, transform;
}

.module-rail-slide-enter-from,
.module-rail-slide-leave-to {
  max-width: 0;
}

.module-rail-slide-enter-from :deep(.module-rail),
.module-rail-slide-leave-to :deep(.module-rail) {
  opacity: 0;
  transform: translateX(-16px);
}

@media (prefers-reduced-motion: reduce) {
  .module-rail-slide-enter-active,
  .module-rail-slide-leave-active,
  .module-rail-slide-enter-active :deep(.module-rail),
  .module-rail-slide-leave-active :deep(.module-rail) {
    transition: none;
  }

  .assistant-panel-enter-active,
  .assistant-panel-leave-active {
    transition: none;
  }

  .module-rail-slide-enter-from,
  .module-rail-slide-leave-to {
    max-width: none;
  }

  .module-rail-slide-enter-from :deep(.module-rail),
  .module-rail-slide-leave-to :deep(.module-rail) {
    opacity: 1;
    transform: none;
  }
}

@media (max-width: 767px) {
  .app-body.is-workbench .app-content-inner {
    padding: var(--spacing-12);
  }

  .ai-assistant-slot {
    position: fixed;
    top: var(--header-height);
    right: 0;
    bottom: 0;
    z-index: 30;
    width: 100vw;
    min-width: 0;
    height: auto;
    flex-basis: auto;
  }

  .ai-assistant-slot.is-expanded {
    width: 100vw;
    min-width: 0;
    overflow: hidden;
  }
}

@media (min-width: 768px) and (max-width: 1100px) {
  .ai-assistant-slot {
    width: min(419px, 42vw);
    min-width: min(419px, 42vw);
    flex-basis: min(419px, 42vw);
  }
}
</style>
