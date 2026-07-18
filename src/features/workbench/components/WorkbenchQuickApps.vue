<template>
  <div class="quick-apps">
    <WorkbenchSecondaryTabs v-model="activeCategory" :options="categoryOptions" aria-label="快捷应用分类" />
    <div class="quick-app-grid">
      <template v-for="item in filteredItems" :key="item.id">
        <RouterLink
          v-if="item.kind === 'internal'"
          class="quick-app-item"
          :to="internalLocation(item)"
          :target="item.openMode === 'new-tab' ? '_blank' : undefined"
          :rel="item.openMode === 'new-tab' ? 'noopener noreferrer' : undefined"
        >
          <span class="quick-app-icon quick-link-icon"><component :is="appIcon(item.name)" /></span>
          <span class="quick-link-name">{{ item.name }}</span>
        </RouterLink>
        <a
          v-else
          class="quick-app-item"
          :href="item.target"
          :target="item.openMode === 'new-tab' ? '_blank' : undefined"
          :rel="item.openMode === 'new-tab' ? 'noopener noreferrer' : undefined"
        >
          <span class="quick-app-icon quick-link-icon"><component :is="appIcon(item.name)" /></span>
          <span class="quick-link-name">{{ item.name }}</span>
        </a>
      </template>
      <el-empty v-if="!filteredItems.length" description="当前分类暂无可用应用" :image-size="52" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type Component } from "vue";
import {
  BellFilled,
  Collection,
  DataAnalysis,
  Document,
  Grid,
  OfficeBuilding,
  School,
  Setting,
  UserFilled,
} from "@element-plus/icons-vue";
import WorkbenchSecondaryTabs from "@/features/workbench/components/WorkbenchSecondaryTabs.vue";
import type { WorkbenchQuickLinkData, WorkbenchQuickLinksData } from "@/features/workbench/types";

const props = defineProps<{ data: WorkbenchQuickLinksData }>();
const activeCategory = ref("all");

const categoryRules: Array<{ label: string; value: string; pattern: RegExp }> = [
  { label: "协同管理", value: "collaboration", pattern: /组织|用户|成员|教师|学生|协同/ },
  { label: "公共服务", value: "service", pattern: /公文|公开|通知|公告|消息|服务/ },
  { label: "应用广场", value: "applications", pattern: /资源|课程|教学|应用/ },
  { label: "决策支持", value: "decision", pattern: /数据|统计|分析|排行|决策/ },
  { label: "信息管理", value: "information", pattern: /学校|机构|基础|系统|配置|设置|中心/ },
];

function categoryFor(name: string) {
  return categoryRules.find((category) => category.pattern.test(name))?.value ?? "information";
}

const availableCategories = computed(() => new Set(props.data.items.map((item) => categoryFor(item.name))));
const categoryOptions = computed(() => [
  { label: "全部应用", value: "all" },
  ...categoryRules.filter((category) => availableCategories.value.has(category.value)),
]);
const filteredItems = computed(() => activeCategory.value === "all"
  ? props.data.items
  : props.data.items.filter((item) => categoryFor(item.name) === activeCategory.value));

function internalLocation(item: WorkbenchQuickLinkData) {
  if (item.openMode === "current" || !item.tenantId) return item.target;
  return { path: item.target, query: { tenantId: item.tenantId } };
}

const iconRules: Array<{ pattern: RegExp; icon: Component }> = [
  { pattern: /学校/, icon: School },
  { pattern: /组织|机构/, icon: OfficeBuilding },
  { pattern: /用户|成员|教师|学生/, icon: UserFilled },
  { pattern: /数据|统计|分析|排行/, icon: DataAnalysis },
  { pattern: /资源|课程|教学/, icon: Collection },
  { pattern: /系统|配置|设置/, icon: Setting },
  { pattern: /公文|文件|信息公开/, icon: Document },
  { pattern: /公告|通知|消息/, icon: BellFilled },
];

function appIcon(name: string) {
  return iconRules.find((item) => item.pattern.test(name))?.icon ?? Grid;
}
</script>

<style scoped>
.quick-apps {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  gap: var(--spacing-16);
}

.quick-app-grid {
  display: grid;
  min-height: 0;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--spacing-12);
  overflow: auto;
}

.quick-app-item {
  display: flex;
  align-items: center;
  min-width: 0;
  min-height: 76px;
  gap: var(--spacing-12);
  padding: var(--spacing-16) var(--spacing-20);
  color: var(--color-title);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  text-decoration: none;
}

.quick-app-item:hover {
  color: var(--color-primary);
  border-color: var(--color-primary-line-light);
  background: var(--color-bg-page);
}

.quick-app-item > span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-app-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: var(--radius-md);
}

.quick-app-icon :deep(svg) { width: 24px; height: 24px; }
.quick-app-grid :deep(.el-empty) { grid-column: 1 / -1; }

@container (max-width: 840px) {
  .quick-app-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@container (max-width: 460px) {
  .quick-app-grid { grid-template-columns: 1fr; }
}
</style>
