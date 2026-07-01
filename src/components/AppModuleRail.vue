<template>
  <aside class="module-rail">
    <button
      v-if="workbenchConfig.enabled"
      type="button"
      class="module-rail-button workbench-button"
      :title="workbenchConfig.label"
      @click="handleWorkbenchClick"
    >
      <el-icon>
        <component :is="resolveMenuIcon('grid')" />
      </el-icon>
      <span>{{ workbenchConfig.label }}</span>
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
      <el-icon>
        <component :is="resolveMenuIcon(moduleIcon(module))" />
      </el-icon>
      <span>{{ module.name }}</span>
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
  家校互动: "chat",
  托管管理: "calendar",
  教务管理: "notebook",
  排课系统: "grid",
  宿舍管理: "house",
  校园办公: "office",
  缴费管理: "money",
  校园安全: "shield",
  智慧操场: "grid",
  托管学堂: "notebook",
  组织管理: "office",
  运营商管理: "user",
  机构管理: "office",
  结算中心: "coin",
  课程课班管理: "notebook",
  通知公告: "chat",
  系统管理: "setting",
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
  gap: var(--spacing-8);
  width: var(--module-rail-width);
  height: 100vh;
  padding: var(--spacing-6) var(--spacing-6);
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
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: var(--color-secondary);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition:
    background-color 0.2s,
    border-color 0.2s,
    color 0.2s;
}

.module-rail-button:hover,
.module-rail-button.active {
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-color: var(--color-primary-line-light);
}

.module-rail-divider {
  width: 24px;
  height: 1px;
  margin: var(--spacing-2) 0;
  background: var(--color-border);
  flex-shrink: 0;
}

.module-rail-button .el-icon {
  font-size: 18px;
}

.module-rail-button span {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
