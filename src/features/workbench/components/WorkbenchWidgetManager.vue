<template>
  <el-drawer v-model="visible" title="组件管理" size="440px" destroy-on-close>
    <div class="manager-summary">
      <div>
        <strong>显示 {{ visibleCount }}/{{ items.length }}</strong>
        <span>组件由当前组织类型和角色统一提供，隐藏后可以随时恢复。</span>
      </div>
      <el-button link type="primary" @click="showAll">全部显示</el-button>
    </div>

    <div class="manager-list">
      <article v-for="item in items" :key="item.widgetKey" class="manager-item">
        <div class="manager-item-copy">
          <strong>{{ definitionFor(item.widgetKey)?.title }}</strong>
          <span>{{ definitionFor(item.widgetKey)?.description }}</span>
        </div>
        <el-switch
          :model-value="item.visible"
          :aria-label="`${definitionFor(item.widgetKey)?.title}显示状态`"
          @change="(value: boolean | string | number) => emit('visibilityChange', item.widgetKey, Boolean(value))"
        />
      </article>
    </div>

    <template #footer>
      <el-button type="primary" @click="visible = false">完成</el-button>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { WorkbenchWidgetItem } from "@/features/workbench/types";
import { useWorkbenchStore } from "@/stores/workbench";

const props = defineProps<{ items: WorkbenchWidgetItem[] }>();
const emit = defineEmits<{
  visibilityChange: [widgetKey: string, visible: boolean];
}>();
const visible = defineModel<boolean>({ required: true });
const workbenchStore = useWorkbenchStore();
const visibleCount = computed(() => props.items.filter((item) => item.visible).length);

function definitionFor(widgetKey: string) {
  return workbenchStore.definitionFor(widgetKey);
}

function showAll() {
  for (const item of props.items) {
    if (!item.visible) emit("visibilityChange", item.widgetKey, true);
  }
}
</script>

<style scoped>
.manager-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-16);
  padding: var(--spacing-14) var(--spacing-16);
  margin-bottom: var(--spacing-16);
  background: var(--color-primary-light);
  border: 1px solid var(--color-primary-line-light);
  border-radius: var(--radius-lg);
}

.manager-summary > div,
.manager-item-copy {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.manager-summary strong,
.manager-item strong {
  color: var(--color-title);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
}

.manager-summary span,
.manager-item span {
  color: var(--color-secondary);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-md);
}

.manager-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-8);
}

.manager-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 72px;
  gap: var(--spacing-16);
  padding: var(--spacing-12) var(--spacing-14);
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.manager-item-copy {
  min-width: 0;
}
</style>
