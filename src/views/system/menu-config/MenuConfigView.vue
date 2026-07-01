<template>
  <div class="menu-config-page">
    <section class="page-heading">
      <div>
        <h1>菜单配置</h1>
        <p>按租户维护系统入口、顶部模块和侧边菜单，保存后当前租户导航立即生效。</p>
      </div>
      <el-button type="primary" :icon="Plus" :disabled="!selectedTenant" @click="openCreateModule">
        新增顶部模块
      </el-button>
    </section>

    <section class="filter-card">
      <div class="filter-item">
        <span>租户类型</span>
        <el-select v-model="tenantType" clearable placeholder="全部类型">
          <el-option
            v-for="option in TENANT_TYPE_OPTIONS"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </div>
      <div class="filter-item tenant-filter">
        <span>租户名称</span>
        <el-select v-model="selectedTenantId" filterable placeholder="请选择租户">
          <el-option
            v-for="tenant in filteredTenants"
            :key="tenant.id"
            :label="tenant.name"
            :value="tenant.id"
          />
        </el-select>
      </div>
      <div class="filter-item">
        <span>菜单名称</span>
        <el-input v-model="keyword" :prefix-icon="Search" clearable placeholder="请输入关键词" />
      </div>
      <div class="filter-item status-filter">
        <span>显示状态</span>
        <el-select v-model="visibleFilter" clearable placeholder="全部状态">
          <el-option label="显示" :value="true" />
          <el-option label="隐藏" :value="false" />
        </el-select>
      </div>
    </section>

    <section class="system-entry-card">
      <div class="system-entry-heading">
        <div>
          <h2>系统入口配置</h2>
          <p>工作台是固定系统入口，不参与普通菜单层级拖拽。</p>
        </div>
        <el-tag type="primary" effect="plain">租户独立配置</el-tag>
      </div>

      <div class="system-entry-row">
        <div class="entry-name">
          <strong>{{ shellConfig.workbench.label }}</strong>
          <span>系统入口 · /workbench</span>
        </div>
        <div class="entry-field">
          <label>入口名称</label>
          <el-input
            v-model="workbenchLabel"
            :disabled="!selectedTenant"
            maxlength="12"
            @change="handleWorkbenchLabelChange"
          />
        </div>
        <div class="entry-field entry-sort">
          <label>排序</label>
          <el-input-number
            v-model="workbenchSort"
            :disabled="!selectedTenant"
            :min="-999"
            :max="999"
            :step="10"
            controls-position="right"
            @change="handleWorkbenchSortChange"
          />
        </div>
        <div class="entry-visible">
          <label>显示</label>
          <el-switch
            :model-value="shellConfig.workbench.enabled"
            :disabled="!selectedTenant"
            @change="handleWorkbenchVisibleChange"
          />
        </div>
      </div>
    </section>

    <section class="table-card">
      <div class="table-toolbar">
        <div>
          <strong>{{ selectedTenant?.name ?? "请选择租户" }}</strong>
          <span v-if="selectedTenant" class="record-count">共 {{ records.length }} 条业务菜单记录</span>
          <span v-if="selectedTenant" class="drag-help">
            拖动菜单行可调整同级顺序，也可拖入顶部模块/目录
          </span>
        </div>
        <el-button :icon="RefreshLeft" :disabled="!selectedTenant" @click="handleReset">
          恢复默认模板
        </el-button>
      </div>
      <el-alert
        v-if="dragDisabled"
        class="drag-alert"
        title="当前筛选条件下已暂停拖拽排序；清空菜单名称和显示状态筛选后可拖拽。"
        type="info"
        show-icon
        :closable="false"
      />

      <div class="menu-tree-table">
        <div class="menu-tree-header">
          <div class="name-column">菜单名称</div>
          <div class="type-column">类型</div>
          <div class="target-column">关联目标</div>
          <div class="icon-column">图标</div>
          <div class="sort-column">排序</div>
          <div class="visible-column">显示</div>
          <div class="action-column">操作</div>
        </div>

        <el-tree
          v-if="filteredTree.length"
          :data="filteredTree"
          :props="treeProps"
          node-key="id"
          default-expand-all
          draggable
          :expand-on-click-node="false"
          :allow-drag="allowDrag"
          :allow-drop="allowDrop"
          class="menu-draggable-tree"
          @node-drop="handleNodeDrop"
        >
          <template #default="{ node, data }">
            <div class="menu-tree-row">
              <div class="menu-tree-cell name-column" :style="nameColumnStyle(node)">
                <button
                  v-if="hasTreeChildren(node, data)"
                  class="tree-toggle"
                  :class="{ 'is-expanded': node.expanded }"
                  type="button"
                  :aria-label="node.expanded ? '收起菜单' : '展开菜单'"
                  @click.stop="toggleTreeNode(node)"
                >
                  <el-icon><CaretRight /></el-icon>
                </button>
                <span v-else class="tree-toggle tree-toggle-placeholder" />
                <el-icon class="drag-handle"><Rank /></el-icon>
                <span class="menu-name-text">{{ data.name }}</span>
              </div>
              <div class="menu-tree-cell type-column">
                <MenuTypeTag :type="data.type" />
              </div>
              <div class="menu-tree-cell target-column" :title="targetLabel(data)">
                {{ targetLabel(data) }}
              </div>
              <div class="menu-tree-cell icon-column">{{ data.icon ?? "—" }}</div>
              <div class="menu-tree-cell sort-column">{{ data.sort }}</div>
              <div class="menu-tree-cell visible-column">
                <el-switch
                  :model-value="data.visible"
                  @change="handleVisibleChange(data, $event)"
                />
              </div>
              <div class="menu-tree-cell action-column">
                <el-button
                  v-if="data.type === 'module' || data.type === 'directory'"
                  link
                  type="primary"
                  @click.stop="openCreateChild(data)"
                >
                  新增子菜单
                </el-button>
                <el-button link type="primary" @click.stop="openEdit(data)">编辑</el-button>
                <el-button link type="danger" @click.stop="handleDelete(data)">删除</el-button>
              </div>
            </div>
          </template>
        </el-tree>

        <el-empty
          v-else
          :description="selectedTenant ? '暂无匹配菜单' : '请先选择租户'"
        />
      </div>
    </section>

    <MenuEditorDrawer
      v-if="selectedTenant"
      v-model="drawerVisible"
      :tenant="selectedTenant"
      :records="records"
      :editing-record="editingRecord"
      :default-parent-id="defaultParentId"
      @save="handleSave"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { ElMessage, ElMessageBox } from "element-plus";
import type { AllowDropType, NodeDropType } from "element-plus";
import { CaretRight, Plus, Rank, RefreshLeft, Search } from "@element-plus/icons-vue";
import { TENANT_TYPE_OPTIONS } from "@/config/tenant";
import { pageRegistryByKey, resolvePagePathForMenu } from "@/config/page-registry";
import { collectDescendantIds } from "@/features/menu-config/menu-tree";
import { MenuValidationError } from "@/features/menu-config/menu-validation";
import type {
  MenuConfigRecord,
  MenuRecordInput,
  MenuTreeNode,
} from "@/features/menu-config/types";
import { useMenuConfigStore } from "@/stores/menu-config";
import { useNavigationStore } from "@/stores/navigation";
import { useUserStore } from "@/stores/user";
import type { TenantType } from "@/types/user";
import MenuEditorDrawer from "./MenuEditorDrawer.vue";
import MenuTypeTag from "./MenuTypeTag.vue";

type TreeDropType = Extract<NodeDropType, "before" | "after" | "inner">;

interface TreeNodeLike {
  data: MenuTreeNode;
}

interface TreeRenderNodeLike {
  level?: number;
  expanded?: boolean;
  childNodes?: unknown[];
  expand?: () => void;
  collapse?: () => void;
}

const menuConfigStore = useMenuConfigStore();
const userStore = useUserStore();
const navigationStore = useNavigationStore();
const router = useRouter();
const { selectedTenant, records, tree, shellConfig, recoveryNotice } = storeToRefs(menuConfigStore);
const { tenantList, currentTenant } = storeToRefs(userStore);

const tenantType = ref<TenantType | "">("");
const selectedTenantId = ref(currentTenant.value.id);
const keyword = ref("");
const visibleFilter = ref<boolean | "">("");
const workbenchLabel = ref("");
const workbenchSort = ref(0);
const drawerVisible = ref(false);
const editingRecord = ref<MenuConfigRecord | null>(null);
const defaultParentId = ref<string | null>(null);
const treeProps = {
  children: "children",
  label: "name",
} as const;

const filteredTenants = computed(() =>
  tenantType.value
    ? tenantList.value.filter((tenant) => tenant.type === tenantType.value)
    : tenantList.value,
);
const filteredTree = computed(() => filterTree(tree.value));
const dragDisabled = computed(() => Boolean(keyword.value.trim()) || visibleFilter.value !== "");

watch(
  selectedTenantId,
  (tenantId) => {
    const tenant = tenantList.value.find((item) => item.id === tenantId);
    if (!tenant) return;
    menuConfigStore.load(tenant);
    if (recoveryNotice.value) ElMessage.warning(recoveryNotice.value);
  },
  { immediate: true },
);

watch(tenantType, () => {
  if (!filteredTenants.value.some((tenant) => tenant.id === selectedTenantId.value)) {
    selectedTenantId.value = filteredTenants.value[0]?.id ?? "";
  }
});

watch(
  () => shellConfig.value.workbench,
  (workbench) => {
    workbenchLabel.value = workbench.label;
    workbenchSort.value = workbench.sort;
  },
  { immediate: true },
);

function filterTree(nodes: MenuTreeNode[]): MenuTreeNode[] {
  return nodes.flatMap((node) => {
    const children = filterTree(node.children);
    const matchesName = !keyword.value || node.name.includes(keyword.value.trim());
    const matchesVisible = visibleFilter.value === "" || node.visible === visibleFilter.value;
    return matchesName && matchesVisible || children.length
      ? [{ ...node, children }]
      : [];
  });
}

function targetLabel(row: MenuConfigRecord) {
  if (row.type === "module") return "进入首个可用子菜单";
  if (row.type === "directory") return "目录";
  if (row.type === "external") return row.externalUrl ?? "未配置";
  const page = row.pageKey ? pageRegistryByKey.get(row.pageKey) : null;
  return page ? `${page.title} · ${resolvePagePathForMenu(page, row.id)}` : "页面不可用";
}

function nameColumnStyle(node: TreeRenderNodeLike) {
  const level = typeof node.level === "number" ? node.level : 1;
  return {
    "--menu-level-indent": `${Math.max(0, level - 1) * 24}px`,
  };
}

function hasTreeChildren(node: TreeRenderNodeLike, data: MenuTreeNode) {
  return Boolean(node.childNodes?.length || data.children.length);
}

function toggleTreeNode(node: TreeRenderNodeLike) {
  if (node.expanded) {
    node.collapse?.();
    if (!node.collapse) node.expanded = false;
    return;
  }
  node.expand?.();
  if (!node.expand) node.expanded = true;
}

function sortedSiblings(parentId: string | null, excludeId?: string) {
  return records.value
    .filter((record) => record.parentId === parentId && record.id !== excludeId)
    .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "zh-CN"));
}

function resolveDropPlacement(
  draggedId: string,
  target: MenuConfigRecord,
  dropType: TreeDropType,
) {
  if (dropType === "inner") {
    return {
      parentId: target.id,
      index: sortedSiblings(target.id, draggedId).length,
    };
  }

  const parentId = target.parentId;
  const siblings = sortedSiblings(parentId, draggedId);
  const targetIndex = siblings.findIndex((record) => record.id === target.id);
  return {
    parentId,
    index: dropType === "after" ? targetIndex + 1 : targetIndex,
  };
}

function normalizeAllowDropType(type: AllowDropType): TreeDropType {
  if (type === "prev") return "before";
  if (type === "next") return "after";
  return "inner";
}

function allowDrag() {
  return !dragDisabled.value;
}

function allowDrop(
  draggingNode: TreeNodeLike,
  dropNode: TreeNodeLike,
  type: AllowDropType,
) {
  if (dragDisabled.value || draggingNode.data.id === dropNode.data.id) return false;
  const dropType = normalizeAllowDropType(type);
  const placement = resolveDropPlacement(draggingNode.data.id, dropNode.data, dropType);
  return menuConfigStore.canMove(draggingNode.data.id, placement.parentId);
}

function handleNodeDrop(
  draggingNode: TreeNodeLike,
  dropNode: TreeNodeLike,
  dropType: TreeDropType,
) {
  const placement = resolveDropPlacement(draggingNode.data.id, dropNode.data, dropType);
  try {
    menuConfigStore.move(draggingNode.data.id, placement.parentId, placement.index);
    void navigationStore.ensureValidCurrentRoute(router);
    ElMessage.success("菜单排序已更新");
  } catch (error) {
    if (error instanceof MenuValidationError) {
      ElMessage.warning("不支持拖放到该层级，请调整目标位置");
    } else {
      ElMessage.error(error instanceof Error ? error.message : "菜单排序失败");
    }
  }
}

function openCreateModule() {
  editingRecord.value = null;
  defaultParentId.value = null;
  drawerVisible.value = true;
}

function openCreateChild(parent: MenuConfigRecord) {
  editingRecord.value = null;
  defaultParentId.value = parent.id;
  drawerVisible.value = true;
}

function openEdit(row: MenuConfigRecord) {
  editingRecord.value = { ...row };
  defaultParentId.value = row.parentId;
  drawerVisible.value = true;
}

function handleSave(input: MenuRecordInput) {
  try {
    if (editingRecord.value) menuConfigStore.update(editingRecord.value.id, input);
    else menuConfigStore.create(input);
    void navigationStore.ensureValidCurrentRoute(router);
    drawerVisible.value = false;
    ElMessage.success(editingRecord.value ? "菜单已更新" : "菜单已新增");
  } catch (error) {
    if (error instanceof MenuValidationError) {
      ElMessage.warning("菜单配置不符合规则，请检查后重试");
    } else {
      ElMessage.error(error instanceof Error ? error.message : "菜单保存失败");
    }
  }
}

function handleVisibleChange(row: MenuConfigRecord, value: boolean | string | number) {
  try {
    menuConfigStore.setVisible(row.id, Boolean(value));
    void navigationStore.ensureValidCurrentRoute(router);
    ElMessage.success(Boolean(value) ? "菜单已显示" : "菜单已隐藏");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "状态更新失败");
  }
}

function updateWorkbench(input: Parameters<typeof menuConfigStore.updateWorkbench>[0]) {
  try {
    const updated = menuConfigStore.updateWorkbench(input);
    workbenchLabel.value = updated.label;
    workbenchSort.value = updated.sort;
    void navigationStore.ensureValidCurrentRoute(router);
    ElMessage.success("工作台配置已更新");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "工作台配置更新失败");
  }
}

function handleWorkbenchVisibleChange(value: boolean | string | number) {
  updateWorkbench({ enabled: Boolean(value) });
}

function handleWorkbenchLabelChange(value: string) {
  const label = value.trim();
  if (!label) {
    workbenchLabel.value = shellConfig.value.workbench.label;
    ElMessage.warning("工作台名称不能为空");
    return;
  }
  updateWorkbench({ label });
}

function handleWorkbenchSortChange(value: number | undefined) {
  const sort = Number(value);
  if (!Number.isFinite(sort)) {
    workbenchSort.value = shellConfig.value.workbench.sort;
    ElMessage.warning("请输入有效排序值");
    return;
  }
  updateWorkbench({ sort });
}

async function handleDelete(row: MenuConfigRecord) {
  const childCount = collectDescendantIds(records.value, row.id).size;
  const description = childCount
    ? `将同时删除 ${childCount} 个子菜单，删除后无法恢复。`
    : "删除后无法恢复。";
  try {
    await ElMessageBox.confirm(description, `删除“${row.name}”`, {
      type: "warning",
      confirmButtonText: "确认删除",
      cancelButtonText: "取消",
    });
    menuConfigStore.removeCascade(row.id);
    await navigationStore.ensureValidCurrentRoute(router);
    ElMessage.success("菜单已删除");
  } catch {
    // 用户取消时保持原数据。
  }
}

async function handleReset() {
  if (!selectedTenant.value) return;
  try {
    await ElMessageBox.confirm(
      `将覆盖“${selectedTenant.value.name}”的全部自定义菜单和系统入口配置。`,
      "恢复默认模板",
      {
        type: "warning",
        confirmButtonText: "确认恢复",
        cancelButtonText: "取消",
      },
    );
    menuConfigStore.reset();
    await navigationStore.ensureValidCurrentRoute(router);
    ElMessage.success("已恢复默认菜单");
  } catch {
    // 用户取消时保持原数据。
  }
}
</script>

<style scoped>
.menu-config-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-16);
  min-height: 100%;
}

.page-heading,
.filter-card,
.system-entry-card,
.table-card {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-20) var(--spacing-24);
}

.page-heading h1 {
  margin: 0;
  color: var(--color-title);
  font-size: 20px;
  line-height: 28px;
  font-weight: var(--font-weight-semibold);
}

.page-heading p {
  margin: var(--spacing-4) 0 0;
  color: var(--color-secondary);
  font-size: var(--font-size-sm);
}

.filter-card {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: var(--spacing-16);
  padding: var(--spacing-16) var(--spacing-24);
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-8);
  width: 180px;
  color: var(--color-body);
  font-size: var(--font-size-sm);
}

.tenant-filter {
  width: 280px;
}

.status-filter {
  width: 140px;
}

.system-entry-card {
  padding: var(--spacing-16) var(--spacing-24);
}

.system-entry-heading,
.system-entry-row {
  display: flex;
  align-items: center;
}

.system-entry-heading {
  justify-content: space-between;
  gap: var(--spacing-16);
  margin-bottom: var(--spacing-16);
}

.system-entry-heading h2 {
  margin: 0;
  color: var(--color-title);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.system-entry-heading p {
  margin: var(--spacing-4) 0 0;
  color: var(--color-secondary);
  font-size: var(--font-size-sm);
}

.system-entry-row {
  min-height: 72px;
  gap: var(--spacing-24);
  padding: var(--spacing-16);
  background: var(--color-bg-page);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.entry-name {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  min-width: 220px;
}

.entry-name strong {
  color: var(--color-title);
  font-weight: var(--font-weight-semibold);
}

.entry-name span,
.entry-field label,
.entry-visible label {
  color: var(--color-secondary);
  font-size: var(--font-size-sm);
}

.entry-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-8);
  width: 220px;
}

.entry-sort {
  width: 160px;
}

.entry-visible {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-8);
  margin-left: auto;
}

.table-card {
  min-height: 480px;
  overflow: hidden;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-16) var(--spacing-24);
  border-bottom: 1px solid var(--color-border);
}

.table-toolbar strong {
  color: var(--color-title);
  font-weight: var(--font-weight-semibold);
}

.record-count {
  margin-left: var(--spacing-12);
  color: var(--color-secondary);
  font-size: var(--font-size-sm);
}

.drag-help {
  margin-left: var(--spacing-12);
  color: var(--color-secondary);
  font-size: var(--font-size-sm);
}

.drag-alert {
  margin: var(--spacing-12) var(--spacing-24) 0;
}

.menu-tree-table {
  width: 100%;
  overflow-x: auto;
}

.menu-tree-header,
.menu-tree-row {
  display: grid;
  grid-template-columns:
    minmax(300px, 1.2fr)
    100px
    minmax(220px, 1fr)
    90px
    70px
    70px
    190px;
  align-items: center;
  min-width: 1040px;
}

.menu-tree-header {
  height: 44px;
  color: var(--color-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  background: var(--color-bg-soft);
  border-bottom: 1px solid var(--color-border);
}

.menu-tree-header > div {
  min-width: 0;
  padding: 0 var(--spacing-8);
}

.menu-draggable-tree {
  min-width: 1040px;
}

:deep(.menu-draggable-tree .el-tree-node__content) {
  height: auto;
  min-height: 48px;
  padding-left: 0 !important;
  border-bottom: 1px solid var(--color-border);
}

:deep(.menu-draggable-tree .el-tree-node__content:hover) {
  background: var(--color-primary-light);
}

:deep(.menu-draggable-tree .el-tree-node__expand-icon) {
  display: none;
}

:deep(.menu-draggable-tree .el-tree-node__children) {
  overflow: visible;
}

:deep(.menu-draggable-tree .is-drop-inner > .el-tree-node__content) {
  background: var(--color-primary-light);
  box-shadow: inset 0 0 0 1px var(--color-primary);
}

.menu-tree-row {
  flex: 1;
  min-height: 48px;
  cursor: grab;
}

.menu-tree-row:active {
  cursor: grabbing;
}

.menu-tree-cell {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  padding: 0 var(--spacing-8);
  color: var(--color-body);
  font-size: var(--font-size-sm);
}

.menu-tree-cell.name-column {
  gap: var(--spacing-4);
  padding-left: calc(var(--spacing-8) + var(--menu-level-indent, 0px));
}

.target-column {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sort-column,
.visible-column {
  justify-content: center;
}

.action-column {
  justify-content: flex-start;
}

.tree-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  color: var(--color-secondary);
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm);
  cursor: pointer;
  flex-shrink: 0;
}

.tree-toggle .el-icon {
  transition: transform 0.15s ease;
}

.tree-toggle.is-expanded .el-icon {
  transform: rotate(90deg);
}

.tree-toggle-placeholder {
  visibility: hidden;
  pointer-events: none;
}

.drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  color: var(--color-secondary);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  cursor: inherit;
  flex-shrink: 0;
}

.menu-tree-row:hover .drag-handle {
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-color: var(--color-primary);
}

.menu-name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
