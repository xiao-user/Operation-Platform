<template>
  <div class="page-filter-bar">
    <div class="filter-fields">
      <slot />
      <!-- 按钮跟在控件后面，跟随 flex-wrap 自动换行 -->
      <div class="filter-actions">
        <slot name="actions">
          <el-button type="primary" :icon="Search" @click="emit('search')">搜索</el-button>
          <el-button v-if="showReset" @click="emit('reset')">重置</el-button>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Search } from "@element-plus/icons-vue";

withDefaults(
  defineProps<{
    showReset?: boolean;
  }>(),
  { showReset: false },
);

const emit = defineEmits<{
  search: [];
  reset: [];
}>();
</script>

<style scoped>
.page-filter-bar {
  background: var(--color-white);
  border-bottom: 1px solid var(--color-border);
  padding: var(--spacing-16) var(--spacing-24);
  flex-shrink: 0;
}

.filter-fields {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-16) var(--spacing-24);
  align-items: center;
}

.filter-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
</style>
