<template>
  <div class="menu-node">
    <button
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
        <span class="menu-label">{{ item.label }}</span>
      </span>

      <el-icon v-if="hasChildren" class="menu-arrow" :class="{ expanded: isExpanded }">
        <ArrowDown />
      </el-icon>
    </button>

    <div v-if="hasChildren && isExpanded" class="menu-children">
      <SidebarMenuNode
        v-for="child in item.children"
        :key="child.key"
        :item="child"
        :depth="depth + 1"
        :active-key="activeKey"
        :expanded-keys="expandedKeys"
        @select="$emit('select', $event)"
        @toggle="$emit('toggle', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from "vue";
import {
  ArrowDown,
  Calendar,
  ChatLineRound,
  Coin,
  DataAnalysis,
  Document,
  Grid,
  HomeFilled,
  Lock,
  Menu,
  Notebook,
  OfficeBuilding,
  Setting,
  Tickets,
  User,
} from "@element-plus/icons-vue";
import type { SideMenuItem, MenuIconKey } from "@/types/navigation";

interface Props {
  item: SideMenuItem;
  depth?: number;
  activeKey: string;
  expandedKeys: string[];
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0,
});

const emit = defineEmits<{
  select: [item: SideMenuItem];
  toggle: [menuKey: string];
}>();

const iconMap: Record<MenuIconKey, Component> = {
  grid: Grid,
  notebook: Notebook,
  chat: ChatLineRound,
  calendar: Calendar,
  house: HomeFilled,
  money: Coin,
  shield: Lock,
  setting: Setting,
  menu: Menu,
  data: DataAnalysis,
  document: Document,
  coin: Coin,
  office: OfficeBuilding,
  user: User,
  list: Tickets,
};

const hasChildren = computed(() => Boolean(props.item.children?.length));
const isActive = computed(() => props.activeKey === props.item.key);
const isExpanded = computed(() => props.expandedKeys.includes(props.item.key));
const isActiveBranch = computed(() => hasChildren.value && isExpanded.value);
const resolvedIcon = computed(() => (props.item.icon ? iconMap[props.item.icon] || Menu : null));
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

function handleClick() {
  if (hasChildren.value) {
    emit("toggle", props.item.key);
    return;
  }

  emit("select", props.item);
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
