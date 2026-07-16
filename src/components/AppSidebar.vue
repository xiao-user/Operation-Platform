<template>
  <aside class="app-sidebar">
    <div class="sidebar-menu">
      <SidebarMenuNode
        v-for="item in deepMenus"
        :key="item.id"
        :item="item"
        :active-key="activeMenuId"
        :expanded-keys="mergedExpandedKeys"
        :tenant-id="currentTenant.id"
        @toggle="handleToggle"
      />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useNavigationStore } from "@/stores/navigation";
import { useUserStore } from "@/stores/user";
import SidebarMenuNode from "@/components/SidebarMenuNode.vue";

const navigationStore = useNavigationStore();
const userStore = useUserStore();
const { activeModuleId, activeMenuId, activeSecondLevelNode, deepMenus, defaultOpenMenus } =
  storeToRefs(navigationStore);
const { currentTenant } = storeToRefs(userStore);

const userExpandedKeys = ref<string[]>([]);
const userCollapsedKeys = ref<string[]>([]);

const mergedExpandedKeys = computed(() => {
  const autoExpandedKeys = defaultOpenMenus.value.filter(
    (key) => !userCollapsedKeys.value.includes(key),
  );
  return Array.from(new Set([...autoExpandedKeys, ...userExpandedKeys.value]));
});

// 切换模块时重置用户手动展开/折叠状态
watch([activeModuleId, activeSecondLevelNode], () => {
  userExpandedKeys.value = [];
  userCollapsedKeys.value = [];
});

function handleToggle(menuKey: string) {
  if (defaultOpenMenus.value.includes(menuKey)) {
    userCollapsedKeys.value = userCollapsedKeys.value.includes(menuKey)
      ? userCollapsedKeys.value.filter((key) => key !== menuKey)
      : [...userCollapsedKeys.value, menuKey];
    return;
  }

  userExpandedKeys.value = userExpandedKeys.value.includes(menuKey)
    ? userExpandedKeys.value.filter((key) => key !== menuKey)
    : [...userExpandedKeys.value, menuKey];
}
</script>

<style scoped>
.app-sidebar {
  width: var(--sidebar-width);
  height: 100%;
  background: var(--color-white);
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
  overflow-x: hidden;
  flex-shrink: 0;
}

.sidebar-menu {
  width: 100%;
  padding: var(--spacing-12) 0;
}
</style>
