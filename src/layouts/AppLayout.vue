<template>
  <div class="app-layout">
    <AppHeader />

    <div class="app-body" :class="{ 'is-workbench': isWorkbenchRoute }">
      <template v-if="!isWorkbenchRoute">
        <AppModuleRail />
        <AppSidebar v-if="deepMenus.length" />
      </template>
      <main class="app-content">
        <div class="app-content-inner">
          <RouterView />
        </div>
      </main>
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
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  margin-top: var(--header-height);
}

.app-content {
  flex: 1;
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
