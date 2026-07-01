<template>
  <aside class="module-rail">
    <button
      v-if="workbenchConfig.enabled"
      type="button"
      class="module-rail-button workbench-button"
      :title="workbenchConfig.label"
      @click="handleWorkbenchClick"
    >
      <span class="module-rail-icon">
        <component :is="resolveMenuIcon(workbenchConfig.icon)" />
      </span>
    </button>

    <div v-if="workbenchConfig.enabled" class="module-rail-divider" />

    <button
      v-for="module in moduleRailNodes"
      :key="module.id"
      type="button"
      class="module-rail-button"
      :class="{ active: activeModuleId === module.id }"
      :title="module.name"
      @click="handleModuleClick(module)"
    >
      <span class="module-rail-icon">
        <component :is="resolveMenuIcon(moduleIcon(module))" />
      </span>
      <span class="module-rail-label">{{ module.name }}</span>
    </button>
  </aside>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { resolveMenuIcon } from "@/components/menu-icons";
import type { MenuTreeNode } from "@/features/menu-config/types";
import { useNavigationStore } from "@/stores/navigation";
import type { MenuIconKey } from "@/types/navigation";

const router = useRouter();
const navigationStore = useNavigationStore();
const { activeModuleId, moduleRailNodes, workbenchConfig } = storeToRefs(navigationStore);

const defaultModuleIcons: Record<string, MenuIconKey> = {
  家校互动: "MessageSquareText",
  家校共育: "MessageSquareText",
  托管管理: "Calendar",
  教务管理: "NotebookTabs",
  教育教学: "BookOpen",
  教育评价: "ChartNoAxesCombined",
  教育管理: "BriefcaseBusiness",
  排课系统: "LayoutGrid",
  宿舍管理: "House",
  校园办公: "Building2",
  缴费管理: "CircleDollarSign",
  校园安全: "Shield",
  平安校园: "Shield",
  智慧操场: "Activity",
  文化生活: "Images",
  数据中心: "Database",
  托管学堂: "NotebookTabs",
  组织管理: "Building2",
  运营商管理: "User",
  机构管理: "Building2",
  结算中心: "Coins",
  课程课班管理: "NotebookTabs",
  通知公告: "Bell",
  系统管理: "Settings",
};

function handleWorkbenchClick() {
  navigationStore.navigateToWorkbench(router);
}

function moduleIcon(module: MenuTreeNode) {
  return module.icon ?? defaultModuleIcons[module.name] ?? "menu";
}

function handleModuleClick(module: MenuTreeNode) {
  navigationStore.navigateToMenu(module.id, router);
}
</script>

<style scoped>
.module-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-12);
  width: var(--module-rail-width);
  height: 100vh;
  padding: var(--spacing-12) var(--spacing-8);
  background: var(--color-white);
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
  overflow-x: hidden;
  flex-shrink: 0;
  align-self: stretch;
  z-index: 20;
}

.module-rail-button {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-6);
  width: 100%;
  min-height: 58px;
  padding: 0;
  color: var(--color-secondary);
  background: transparent;
  border: 0;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition:
    color 0.2s;
}

.workbench-button {
  min-height: 36px;
}

.module-rail-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: inherit;
  background: transparent;
  border-radius: var(--radius-lg);
  transition:
    background-color 0.2s,
    color 0.2s;
}

.module-rail-button:hover,
.module-rail-button.active,
.module-rail-button:hover .module-rail-label,
.module-rail-button.active .module-rail-label {
  color: var(--color-primary);
}

.module-rail-button:hover .module-rail-icon,
.module-rail-button.active .module-rail-icon {
  background: var(--color-primary-light);
}

.module-rail-divider {
  width: 24px;
  height: 1px;
  margin: var(--spacing-2) 0;
  background: var(--color-border);
  flex-shrink: 0;
}

.module-rail-icon :deep(svg) {
  width: 20px;
  height: 20px;
  stroke-width: 1.9;
}

.module-rail-label {
  width: 100%;
  overflow: hidden;
  color: var(--color-title);
  font-size: var(--font-size-xs);
  line-height: 16px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.2s;
}
</style>
