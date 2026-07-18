<template>
  <div class="task-center">
    <WorkbenchSecondaryTabs v-model="activeFilter" :options="filterOptions" aria-label="待办状态" />
    <el-empty v-if="!filteredItems.length" description="暂无相关事项" :image-size="52" />
    <ul v-else>
      <li v-for="item in filteredItems" :key="item.id" :class="{ 'is-completed': item.status === 'completed' }">
        <el-checkbox
          :model-value="item.status === 'completed'"
          :aria-label="`${item.title}标记为完成`"
          @change="toggleItem(item.id)"
        />
        <button type="button" @click="openDetail(item)">
          <span>
            <el-tag size="small" effect="plain" :type="tagType(item.tone)">{{ item.label }}</el-tag>
            <small>{{ item.meta }}</small>
          </span>
          <strong>{{ item.title }}</strong>
        </button>
      </li>
    </ul>

    <el-drawer v-model="drawerVisible" title="待办详情" size="min(420px, 90vw)" append-to-body>
      <template v-if="selectedItem">
        <div class="task-detail-meta">
          <el-tag effect="plain" :type="tagType(selectedItem.tone)">{{ selectedItem.label }}</el-tag>
          <span>{{ selectedItem.meta }}</span>
        </div>
        <h3>{{ selectedItem.title }}</h3>
        <p>该事项已进入个人工作队列，请在办理时限前完成材料核验、补充处理意见并确认结果。</p>
        <el-button
          :type="selectedItem.status === 'pending' ? 'primary' : 'default'"
          @click="toggleItem(selectedItem.id)"
        >
          {{ selectedItem.status === "pending" ? "标记完成" : "恢复待办" }}
        </el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { ElMessage } from "element-plus";
import WorkbenchSecondaryTabs from "@/features/workbench/components/WorkbenchSecondaryTabs.vue";
import type { WorkbenchTaskCenterData, WorkbenchTaskItemData, WorkbenchWidgetTone } from "@/features/workbench/types";

const props = defineProps<{ data: WorkbenchTaskCenterData }>();
const items = ref(props.data.items.map((item) => ({ ...item })));
const activeFilter = ref<"pending" | "completed" | "all">("pending");
const filterOptions = [
  { label: "待处理", value: "pending" },
  { label: "已完成", value: "completed" },
  { label: "全部", value: "all" },
];
const drawerVisible = ref(false);
const selectedItemId = ref<string | null>(null);
const filteredItems = computed(() => activeFilter.value === "all"
  ? items.value
  : items.value.filter((item) => item.status === activeFilter.value));
const selectedItem = computed(() => items.value.find((item) => item.id === selectedItemId.value) ?? null);

function tagType(tone?: WorkbenchWidgetTone) {
  return ({ primary: "primary", success: "success", warning: "warning", danger: "danger", neutral: "info" } as const)[tone ?? "neutral"];
}

function openDetail(item: WorkbenchTaskItemData) {
  selectedItemId.value = item.id;
  drawerVisible.value = true;
}

function toggleItem(id: string) {
  const item = items.value.find((candidate) => candidate.id === id);
  if (!item) return;
  item.status = item.status === "pending" ? "completed" : "pending";
  ElMessage.success(item.status === "completed" ? "事项已完成" : "事项已恢复");
}
</script>

<style scoped>
.task-center {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: var(--spacing-12);
}

.task-center ul {
  padding: 0;
  margin: 0;
  overflow: auto;
  list-style: none;
}

.task-center li {
  display: flex;
  align-items: center;
  min-height: 56px;
  gap: var(--spacing-8);
  border-bottom: 1px solid var(--color-border);
}

.task-center li.is-completed strong {
  color: var(--color-secondary);
  text-decoration: line-through;
}

.task-center li button {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: var(--spacing-4);
  padding: var(--spacing-8) 0;
  font: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.task-center li button > span,
.task-detail-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-8);
}

.task-center small,
.task-detail-meta span {
  color: var(--color-secondary);
  font-size: var(--font-size-xs);
}

.task-center strong {
  overflow: hidden;
  color: var(--color-body);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-detail-meta {
  margin-bottom: var(--spacing-12);
}

.task-detail-meta + h3 {
  margin: 0 0 var(--spacing-12);
  color: var(--color-title);
  font-size: var(--font-size-lg);
}

.task-detail-meta ~ p {
  margin: 0 0 var(--spacing-20);
  color: var(--color-body);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-lg);
}
</style>
