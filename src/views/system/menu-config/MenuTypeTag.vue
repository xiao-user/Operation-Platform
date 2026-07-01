<template>
  <el-tag
    effect="plain"
    size="small"
    class="menu-type-tag"
    :class="`is-level-${displayLevel}`"
  >
    {{ label }}
  </el-tag>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { MenuItemType } from "@/features/menu-config/types";

const props = withDefaults(defineProps<{ type: MenuItemType; level?: number }>(), {
  level: 1,
});

const displayLevel = computed(() => {
  if (props.type === "module") return 1;
  if (props.type === "page" || props.type === "external") return 4;
  return Math.min(3, Math.max(2, props.level));
});
const label = computed(() => {
  const levelLabel = ["", "一级", "二级", "三级", "四级"][displayLevel.value];
  const typeLabel: Record<MenuItemType, string> = {
    module: "模块",
    directory: "目录",
    page: "页面",
    external: "外链",
  };
  return `${levelLabel}${typeLabel[props.type]}`;
});
</script>

<style scoped>
.menu-type-tag {
  font-weight: var(--font-weight-medium);
}

.menu-type-tag.is-level-1 {
  color: var(--color-white);
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.menu-type-tag.is-level-2 {
  color: var(--color-primary-dark-text);
  background: color-mix(in srgb, var(--color-primary) 18%, var(--color-white));
  border-color: color-mix(in srgb, var(--color-primary) 38%, var(--color-white));
}

.menu-type-tag.is-level-3 {
  color: var(--color-primary-dark-text);
  background: color-mix(in srgb, var(--color-primary) 11%, var(--color-white));
  border-color: color-mix(in srgb, var(--color-primary) 26%, var(--color-white));
}

.menu-type-tag.is-level-4 {
  color: var(--color-primary-dark-text);
  background: color-mix(in srgb, var(--color-primary) 5%, var(--color-white));
  border-color: color-mix(in srgb, var(--color-primary) 16%, var(--color-white));
}
</style>
