<template>
  <div class="menu-node">
    <button
      v-if="hasChildren"
      type="button"
      class="menu-button"
      :class="buttonClassName"
      :style="depthStyle"
      @click="handleClick"
    >
      <span class="menu-main">
        <el-icon v-if="resolvedIcon" class="menu-icon">
          <component :is="resolvedIcon" />
        </el-icon>
        <span class="menu-label">{{ item.name }}</span>
      </span>

      <el-icon class="menu-arrow" :class="{ expanded: isExpanded }">
        <ArrowDown />
      </el-icon>
    </button>

    <RouterLink
      v-else-if="target?.kind === 'internal'"
      :to="internalLocation"
      :target="target.openMode === 'new-tab' ? '_blank' : undefined"
      :rel="target.openMode === 'new-tab' ? 'noopener noreferrer' : undefined"
      class="menu-button"
      :class="buttonClassName"
      :style="depthStyle"
    >
      <span class="menu-main">
        <el-icon v-if="resolvedIcon" class="menu-icon">
          <component :is="resolvedIcon" />
        </el-icon>
        <span class="menu-label">{{ item.name }}</span>
      </span>
    </RouterLink>

    <a
      v-else-if="target?.kind === 'external'"
      :href="target.url"
      :target="target.openMode === 'new-tab' ? '_blank' : undefined"
      :rel="target.openMode === 'new-tab' ? 'noopener noreferrer' : undefined"
      class="menu-button"
      :class="buttonClassName"
      :style="depthStyle"
    >
      <span class="menu-main">
        <el-icon v-if="resolvedIcon" class="menu-icon">
          <component :is="resolvedIcon" />
        </el-icon>
        <span class="menu-label">{{ item.name }}</span>
      </span>
    </a>

    <button
      v-else
      type="button"
      class="menu-button"
      :class="buttonClassName"
      :style="depthStyle"
      disabled
    >
      <span class="menu-main">
        <span class="menu-label">{{ item.name }}</span>
      </span>
    </button>

    <div v-if="hasChildren && isExpanded" class="menu-children">
      <SidebarMenuNode
        v-for="child in item.children"
        :key="child.id"
        :item="child"
        :depth="depth + 1"
        :active-key="activeKey"
        :expanded-keys="expandedKeys"
        :tenant-id="tenantId"
        @toggle="$emit('toggle', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { ArrowDown } from "@element-plus/icons-vue";
import { resolveMenuIcon } from "@/components/menu-icons";
import { pageRegistryByKey } from "@/config/page-registry";
import { resolveFirstTarget } from "@/features/menu-config/menu-tree";
import type { MenuTreeNode } from "@/features/menu-config/types";

interface Props {
  item: MenuTreeNode;
  depth?: number;
  activeKey: string;
  expandedKeys: string[];
  tenantId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0,
  tenantId: "",
});

const emit = defineEmits<{
  toggle: [menuKey: string];
}>();

const hasChildren = computed(() => Boolean(props.item.children?.length));
const isActive = computed(() => props.activeKey === props.item.id);
const isExpanded = computed(() => props.expandedKeys.includes(props.item.id));
const isActiveBranch = computed(() =>
  hasChildren.value && Boolean(props.activeKey) && containsActiveKey(props.item),
);
const resolvedIcon = computed(() => (props.item.icon ? resolveMenuIcon(props.item.icon) : null));
const target = computed(() => resolveFirstTarget(props.item, pageRegistryByKey));
const internalLocation = computed(() => {
  if (target.value?.kind !== "internal") return "";
  if (target.value.openMode === "current" || !props.tenantId) return target.value.path;
  return { path: target.value.path, query: { tenantId: props.tenantId } };
});
const depthStyle = computed(() => {
  const indent = props.depth === 0 ? 20 : 50 + (props.depth - 1) * 20;

  return {
    "--menu-indent": `${indent}px`,
  };
});
const buttonClassName = computed(() => ({
  "is-active": isActive.value,
  "is-branch-active": isActiveBranch.value,
  "is-root": props.depth === 0,
  "is-child": props.depth > 0,
  "is-group": hasChildren.value,
  "is-leaf": !hasChildren.value,
}));

function containsActiveKey(item: MenuTreeNode): boolean {
  if (item.id === props.activeKey) return true;
  return item.children.some((child) => containsActiveKey(child));
}

function handleClick() {
  emit("toggle", props.item.id);
}
</script>

<style scoped>
.menu-node {
  width: 100%;
}

.menu-button {
  width: 100%;
  min-height: 48px;
  padding: 0 var(--spacing-16) 0 var(--menu-indent);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-12);
  background: transparent;
  border: none;
  color: var(--color-body);
  cursor: pointer;
  text-align: left;
  transition:
    background-color 0.2s,
    color 0.2s;
  text-decoration: none;
}

.menu-button:hover {
  background: var(--color-bg-muted);
}

.menu-button.is-root {
  min-height: 52px;
}

.menu-button.is-child {
  min-height: 44px;
}

.menu-main {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--spacing-12);
  flex: 1;
}

.menu-icon {
  font-size: 18px;
  color: inherit;
  flex-shrink: 0;
}

.menu-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--font-size-md);
  line-height: var(--line-height-md);
}

.menu-arrow {
  font-size: var(--font-size-lg);
  color: inherit;
  flex-shrink: 0;
  transition: transform 0.2s;
}

.menu-arrow.expanded {
  transform: rotate(180deg);
}

.menu-button.is-active {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
}

.menu-button.is-branch-active {
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
}

.menu-children {
  padding: var(--spacing-2) 0 var(--spacing-6);
}
</style>
