<template>
  <div
    class="drag-placeholder"
    :class="`${variant}-placeholder`"
    :data-widget-span="variant === 'flow' ? span : undefined"
    :style="{ height: `${height}px` }"
  >
    <span>松开放置</span>
  </div>
</template>

<script setup lang="ts">
import type { FlowWorkbenchSpan } from "@/features/workbench/types";

defineProps<{
  variant: "flow" | "column";
  height: number;
  span?: FlowWorkbenchSpan;
}>();
</script>
