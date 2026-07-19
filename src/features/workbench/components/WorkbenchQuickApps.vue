<template>
  <div class="quick-navigation">
    <WorkbenchSecondaryTabs
      v-if="moduleOptions.length"
      v-model="activeModuleId"
      :options="moduleOptions"
      aria-label="快捷导航一级菜单"
    />

    <div class="quick-navigation-grid">
      <RouterLink
        v-for="item in filteredItems"
        :key="item.id"
        class="quick-navigation-item"
        :to="internalLocation(item)"
        :target="item.openMode === 'new-tab' ? '_blank' : undefined"
        :rel="item.openMode === 'new-tab' ? 'noopener noreferrer' : undefined"
      >
        <span class="quick-navigation-icon">
          <component :is="resolveMenuIcon(item.icon ?? item.moduleIcon)" />
        </span>
        <span class="quick-link-name">{{ item.name }}</span>
      </RouterLink>
      <el-empty
        v-if="!filteredItems.length"
        description="当前一级菜单下暂无可访问的内部页面"
        :image-size="52"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { resolveMenuIcon } from "@/components/menu-icons";
import WorkbenchSecondaryTabs from "@/features/workbench/components/WorkbenchSecondaryTabs.vue";
import type { WorkbenchQuickLinkData, WorkbenchQuickLinksData } from "@/features/workbench/types";

const props = defineProps<{ data: WorkbenchQuickLinksData }>();
const activeModuleId = ref("");

const moduleOptions = computed(() => {
  const seen = new Set<string>();
  return props.data.items.flatMap((item) => {
    if (seen.has(item.moduleId)) return [];
    seen.add(item.moduleId);
    return [{ label: item.moduleName, value: item.moduleId }];
  });
});

const filteredItems = computed(() =>
  props.data.items.filter((item) => item.moduleId === activeModuleId.value),
);

watch(
  moduleOptions,
  (options) => {
    if (!options.some((option) => option.value === activeModuleId.value)) {
      activeModuleId.value = options[0]?.value ?? "";
    }
  },
  { immediate: true },
);

function internalLocation(item: WorkbenchQuickLinkData) {
  if (item.openMode === "current" || !item.tenantId) return item.target;
  return { path: item.target, query: { tenantId: item.tenantId } };
}
</script>

<style scoped>
.quick-navigation {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  gap: var(--spacing-16);
}

.quick-navigation-grid {
  display: grid;
  min-height: 0;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-content: start;
  gap: var(--spacing-8);
  overflow: auto;
}

.quick-navigation-item {
  display: flex;
  align-items: center;
  min-width: 0;
  min-height: 66px;
  gap: var(--spacing-8);
  padding: var(--spacing-16) var(--spacing-20);
  color: var(--color-title);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  text-decoration: none;
  transition: color 160ms ease, border-color 160ms ease, background-color 160ms ease;
}

.quick-navigation-item:hover,
.quick-navigation-item:focus-visible {
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-color: var(--color-primary-line-light);
  outline: none;
}

.quick-link-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-navigation-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  color: var(--color-primary);
}

.quick-navigation-icon :deep(svg) {
  width: 22px;
  height: 22px;
}

.quick-navigation-grid :deep(.el-empty) {
  grid-column: 1 / -1;
}

@container (max-width: 840px) {
  .quick-navigation-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@container (max-width: 460px) {
  .quick-navigation-grid {
    grid-template-columns: 1fr;
  }
}
</style>
