<template>
  <div class="bureau-feed">
    <WorkbenchSecondaryTabs v-model="activeCategory" :options="categoryOptions" aria-label="内容分类" />

    <el-empty v-if="!filteredItems.length" description="暂无内容" :image-size="52" />
    <ul v-else>
      <li v-for="item in filteredItems" :key="item.id">
        <button type="button" @click="openItem(item)">
          <span class="feed-title">
            <i v-if="item.unread" aria-label="未读" />
            <el-tag v-if="item.label" size="small" effect="plain">{{ item.label }}</el-tag>
            <strong>{{ item.title }}</strong>
          </span>
          <span class="feed-meta">{{ item.meta }}</span>
        </button>
      </li>
    </ul>

    <el-drawer v-model="drawerVisible" title="内容详情" size="min(460px, 90vw)" append-to-body>
      <article v-if="selectedItem" class="feed-detail">
        <div>
          <el-tag v-if="selectedItem.label" effect="plain">{{ selectedItem.label }}</el-tag>
          <span>{{ selectedItem.source }} · {{ selectedItem.meta }}</span>
        </div>
        <h3>{{ selectedItem.title }}</h3>
        <p>{{ selectedItem.summary }}</p>
      </article>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import WorkbenchSecondaryTabs from "@/features/workbench/components/WorkbenchSecondaryTabs.vue";
import type { WorkbenchFeedData, WorkbenchFeedItemData } from "@/features/workbench/types";

const props = defineProps<{ data: WorkbenchFeedData }>();
const items = ref(props.data.items.map((item) => ({ ...item })));
const activeCategory = ref("all");
const selectedItemId = ref<string | null>(null);
const drawerVisible = ref(false);
const categories = computed(() => [...new Set(items.value.flatMap((item) => item.label ?? []))].slice(0, 3));
const categoryOptions = computed(() => [
  { label: "全部", value: "all" },
  ...categories.value.map((category) => ({ label: category, value: category })),
]);
const filteredItems = computed(() => activeCategory.value === "all"
  ? items.value
  : items.value.filter((item) => item.label === activeCategory.value));
const selectedItem = computed(() => items.value.find((item) => item.id === selectedItemId.value) ?? null);

function openItem(item: WorkbenchFeedItemData) {
  item.unread = false;
  selectedItemId.value = item.id;
  drawerVisible.value = true;
}
</script>

<style scoped>
.bureau-feed {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.bureau-feed > :first-child { margin-bottom: var(--spacing-6); }

.bureau-feed ul {
  padding: 0;
  margin: 0;
  overflow: auto;
  list-style: none;
}

.bureau-feed li {
  border-bottom: 1px solid var(--color-border);
}

.bureau-feed li:last-child {
  border-bottom: 0;
}

.bureau-feed li button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 42px;
  gap: var(--spacing-12);
  padding: var(--spacing-6) 0;
  font: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.bureau-feed li button:hover strong {
  color: var(--color-primary);
}

.feed-title {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: var(--spacing-6);
}

.feed-title i {
  width: 6px;
  height: 6px;
  flex: 0 0 6px;
  background: var(--color-primary);
  border-radius: var(--radius-full);
}

.feed-title strong {
  overflow: hidden;
  color: var(--color-body);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feed-meta {
  flex-shrink: 0;
  color: var(--color-secondary);
  font-size: var(--font-size-xs);
}

.feed-detail > div {
  display: flex;
  align-items: center;
  gap: var(--spacing-8);
  color: var(--color-secondary);
  font-size: var(--font-size-xs);
}

.feed-detail h3 {
  margin: var(--spacing-16) 0 var(--spacing-12);
  color: var(--color-title);
  font-size: var(--font-size-xl);
  line-height: var(--line-height-xl);
}

.feed-detail p {
  margin: 0;
  color: var(--color-body);
  font-size: var(--font-size-sm);
  line-height: 1.8;
}
</style>
