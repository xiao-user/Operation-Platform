<template>
  <ul class="subscription-list">
    <li v-for="item in items" :key="item.id">
      <div>
        <span>
          <el-tag v-if="item.label" size="small" effect="plain">{{ item.label }}</el-tag>
          <small>{{ item.meta }}</small>
        </span>
        <strong>{{ item.title }}</strong>
      </div>
      <el-switch
        v-model="item.subscribed"
        :aria-label="`${item.subscribed ? '取消订阅' : '订阅'}${item.title}`"
        @change="notifyChange(item.title, item.subscribed)"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { ElMessage } from "element-plus";
import type { WorkbenchSubscriptionsData } from "@/features/workbench/types";

const props = defineProps<{ data: WorkbenchSubscriptionsData }>();
const items = ref(props.data.items.map((item) => ({ ...item })));

function notifyChange(title: string, subscribed: boolean) {
  ElMessage.success(subscribed ? `已订阅“${title}”` : `已取消订阅“${title}”`);
}
</script>

<style scoped>
.subscription-list {
  padding: 0;
  margin: 0;
  list-style: none;
}

.subscription-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  gap: var(--spacing-12);
  border-bottom: 1px solid var(--color-border);
}

.subscription-list li:last-child {
  border-bottom: 0;
}

.subscription-list li > div,
.subscription-list li > div > span {
  display: flex;
  min-width: 0;
}

.subscription-list li > div {
  flex-direction: column;
  gap: var(--spacing-4);
}

.subscription-list li > div > span {
  align-items: center;
  gap: var(--spacing-8);
}

.subscription-list small {
  color: var(--color-secondary);
  font-size: var(--font-size-xs);
}

.subscription-list strong {
  overflow: hidden;
  color: var(--color-body);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
