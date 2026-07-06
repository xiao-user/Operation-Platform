<template>
  <header class="app-header">
    <div class="header-brand">
      <div class="brand-logo">
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 2L3 6V10C3 13.9 6.1 17.5 10 18.5C13.9 17.5 17 13.9 17 10V6L10 2Z"
            fill="var(--color-primary)"
            opacity="0.15"
          />
          <path
            d="M8 10L9.5 11.5L12.5 8.5"
            stroke="var(--color-primary)"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M10 3.5L4 7V10.5C4 13.7 6.6 16.7 10 17.5C13.4 16.7 16 13.7 16 10.5V7L10 3.5Z"
            stroke="var(--color-primary)"
            stroke-width="1"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <span class="brand-name">{{ currentTenant.name }}</span>
    </div>

    <div class="header-shell">
      <nav class="header-nav">
        <template v-for="tab in headerTabs" :key="tab.id">
          <RouterLink
            v-if="tab.target.kind === 'internal'"
            :to="tab.target.path"
            class="nav-tab"
            :class="{ active: tab.active }"
            :aria-current="tab.active ? 'page' : undefined"
          >
            <span class="nav-tab-label">{{ tab.name }}</span>
            <div class="nav-tab-indicator" />
          </RouterLink>
          <a
            v-else
            class="nav-tab"
            :class="{ active: tab.active }"
            :href="tab.target.url"
            :target="externalTarget(tab.target)"
            :rel="externalRel(tab.target)"
            :aria-current="tab.active ? 'page' : undefined"
          >
            <span class="nav-tab-label">{{ tab.name }}</span>
            <div class="nav-tab-indicator" />
          </a>
        </template>
      </nav>

      <AppHeaderActions />
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import AppHeaderActions from "@/components/AppHeaderActions.vue";
import { pageRegistryByKey } from "@/config/page-registry";
import { resolveFirstTarget } from "@/features/menu-config/menu-tree";
import { useNavigationStore } from "@/stores/navigation";
import { useUserStore } from "@/stores/user";
import type { MenuTarget } from "@/features/menu-config/types";
import type { TopLevelNavItem } from "@/stores/navigation";

interface HeaderTab {
  id: string;
  name: string;
  active: boolean;
  target: MenuTarget;
}

const navigationStore = useNavigationStore();
const userStore = useUserStore();

const {
  activeModuleId,
  activeSecondLevelNode,
  isWorkbenchRoute,
  secondLevelTabs,
  topLevelNavItems,
} = storeToRefs(navigationStore);
const { currentTenant } = storeToRefs(userStore);

const headerTabs = computed<HeaderTab[]>(() => {
  if (isWorkbenchRoute.value) {
    return topLevelNavItems.value.flatMap((tab) => {
      const target: MenuTarget | null =
        tab.kind === "workbench"
          ? { kind: "internal", path: "/workbench", pageKey: "workbench" }
          : resolveFirstTarget(tab.node, pageRegistryByKey);
      return target
        ? [{
            id: `top:${tab.id}`,
            name: tab.name,
            active: isTopLevelActive(tab),
            target,
          }]
        : [];
    });
  }
  return secondLevelTabs.value.flatMap((tab) => {
    const target = resolveFirstTarget(tab, pageRegistryByKey);
    return target
      ? [{
          id: `second:${tab.id}`,
          name: tab.name,
          active: activeSecondLevelNode.value?.id === tab.id,
          target,
        }]
      : [];
  });
});

function isTopLevelActive(tab: TopLevelNavItem) {
  if (tab.kind === "workbench") return isWorkbenchRoute.value;
  return !isWorkbenchRoute.value && activeModuleId.value === tab.id;
}

function externalTarget(target: Extract<MenuTarget, { kind: "external" }>) {
  return target.openMode === "new-tab" ? "_blank" : undefined;
}

function externalRel(target: Extract<MenuTarget, { kind: "external" }>) {
  return target.openMode === "new-tab" ? "noopener noreferrer" : undefined;
}

</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  height: var(--header-height);
  background: var(--color-white);
  border-bottom: 1px solid var(--color-border);
  position: relative;
  z-index: 10;
  flex-shrink: 0;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: var(--spacing-12);
  height: 100%;
  padding: var(--spacing-12) var(--spacing-16);
  width: var(--sidebar-width);
  flex-shrink: 0;
  border-right: 1px solid var(--color-border);
  overflow: hidden;
}

.brand-logo {
  width: 32px;
  height: 32px;
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.brand-name {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-title);
  line-height: var(--line-height-md);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-shell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 var(--spacing-16);
  gap: var(--spacing-64);
}

.header-nav {
  display: flex;
  align-items: center;
  flex: 1;
  height: 100%;
  gap: var(--spacing-32);
  padding: 0 var(--spacing-16);
  overflow-x: auto;
  scrollbar-width: none;
}
.header-nav::-webkit-scrollbar {
  display: none;
}

.nav-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  cursor: pointer;
  flex-shrink: 0;
  justify-content: space-between;
  padding: 0;
  font: inherit;
  color: inherit;
  text-decoration: none;
  background: transparent;
  border: 0;
}

.nav-tab:focus-visible {
  outline: 2px solid var(--color-primary-line-light);
  outline-offset: -2px;
  border-radius: var(--radius-sm);
}

.nav-tab-label {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-regular);
  color: var(--color-title);
  line-height: var(--line-height-lg);
  padding: var(--spacing-12) 0 var(--spacing-10);
  white-space: nowrap;
  transition: color 0.2s;
}
.nav-tab:hover .nav-tab-label {
  color: var(--color-primary);
}
.nav-tab.active .nav-tab-label {
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
}

.nav-tab-indicator {
  height: 2px;
  width: 100%;
  background-color: transparent;
}
.nav-tab.active .nav-tab-indicator {
  background-color: var(--color-primary);
}

</style>
