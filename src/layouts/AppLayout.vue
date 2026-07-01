<template>
  <div class="app-layout">
    <AppModuleRail v-if="!isWorkbenchRoute" />

    <div class="app-shell">
      <AppHeader />

      <div class="app-body" :class="{ 'is-workbench': isWorkbenchRoute }">
        <AppSidebar v-if="!isWorkbenchRoute && deepMenus.length" />
        <main class="app-content">
          <div class="app-content-inner">
            <RouterView />
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch } from "vue";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import AppHeader from "@/components/AppHeader.vue";
import AppModuleRail from "@/components/AppModuleRail.vue";
import AppSidebar from "@/components/AppSidebar.vue";
import { useNavigationStore } from "@/stores/navigation";
import { useUserStore } from "@/stores/user";

const route = useRoute();
const navigationStore = useNavigationStore();
const userStore = useUserStore();
const { currentTenant } = storeToRefs(userStore);
const { deepMenus, isWorkbenchRoute } = storeToRefs(navigationStore);

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
</style>
