<template>
  <el-tag :type="tag.type" effect="light" size="small">{{ tag.label }}</el-tag>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { MenuItemType } from "@/features/menu-config/types";

const props = defineProps<{ type: MenuItemType }>();

const tags: Record<
  MenuItemType,
  { label: string; type: "primary" | "success" | "warning" | "info" }
> = {
  module: { label: "顶部模块", type: "primary" },
  directory: { label: "目录", type: "warning" },
  page: { label: "内部页面", type: "success" },
  external: { label: "外部链接", type: "info" },
};

const tag = computed(() => tags[props.type]);
</script>
