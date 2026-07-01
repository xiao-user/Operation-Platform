<template>
  <div class="menu-config-page">
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
            从手柄拖动；横线表示同级插入，整行高亮表示放入模块/目录
          </span>
        </div>
        <el-button-group>
          <el-button
            type="primary"
            :icon="Plus"
            :disabled="!selectedTenant"
            @click="openCreateModule"
          >
            新增一级模块
          </el-button>
          <el-button :icon="RefreshLeft" :disabled="!selectedTenant" @click="handleReset">
            恢复默认模板
          </el-button>
        </el-button-group>
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
          <div class="target-column">上级 / 关联目标</div>
          <div class="icon-column">图标</div>
          <div class="sort-column">排序</div>
          <div class="visible-column">显示</div>
          <div class="action-column">操作</div>
        </div>

        <el-tree
          v-if="filteredTree.length"
          ref="menuTreeRef"
          :data="filteredTree"
          :props="treeProps"
          node-key="id"
          :default-expanded-keys="expandedMenuIds"
          draggable
          :highlight-current="false"
          :check-on-click-node="false"
          :expand-on-click-node="false"
          :allow-drag="allowDrag"
          :allow-drop="allowDrop"
          class="menu-draggable-tree"
          @node-drag-over="handleNodeDragOver"
          @node-drag-leave="handleNodeDragLeave"
          @node-drag-end="clearDropPreview"
          @node-drop="handleNodeDrop"
          @node-click="clearTreeCurrent"
        >
          <template #default="{ node, data }">
            <div
              class="menu-tree-row"
              :class="[
                { 'is-inline-editing': isInlineEditing(data) },
                dropPreviewClass(data),
              ]"
              title="双击可行内编辑"
              @dblclick.stop="handleRowDoubleClick(data)"
              @keyup="handleInlineKeyup(data, $event)"
            >
              <div class="menu-tree-cell name-column" :style="nameColumnStyle(node)">
                <button
                  v-if="hasTreeChildren(node, data)"
                  class="tree-toggle"
                  :class="{ 'is-expanded': node.expanded }"
                  type="button"
                  :aria-label="node.expanded ? '收起菜单' : '展开菜单'"
                  @click.stop="toggleTreeNode(node, data)"
                >
                  <el-icon><CaretRight /></el-icon>
                </button>
                <span v-else class="tree-toggle tree-toggle-placeholder" />
                <el-icon
                  class="drag-handle"
                  title="拖动调整顺序或层级"
                >
                  <Rank />
                </el-icon>
                <el-input
                  v-if="isInlineEditing(data)"
                  v-model="inlineDraft.name"
                  class="inline-name-input"
                  maxlength="30"
                  aria-label="菜单名称"
                  @click.stop
                />
                <button
                  v-else
                  class="inline-edit-trigger menu-name-text"
                  type="button"
                  draggable="false"
                  title="点击编辑菜单名称"
                  @click.stop="startInlineEdit(data)"
                >
                  {{ data.name }}
                </button>
              </div>
              <div class="menu-tree-cell type-column">
                <MenuTypeTag :type="data.type" :level="node.level" />
              </div>
              <div class="menu-tree-cell target-column" :title="isInlineEditing(data) ? '' : targetLabel(data)">
                <div v-if="isInlineEditing(data)" class="inline-target-editor" @click.stop>
                  <el-select
                    v-if="data.type !== 'module'"
                    v-model="inlineDraft.parentId"
                    filterable
                    aria-label="上级菜单"
                    placeholder="选择上级菜单"
                  >
                    <el-option
                      v-for="option in inlineParentOptions(data)"
                      :key="option.id"
                      :label="option.name"
                      :value="option.id"
                    />
                  </el-select>
                  <el-select
                    v-if="data.type === 'page'"
                    v-model="inlineDraft.pageKey"
                    filterable
                    aria-label="关联页面"
                    placeholder="选择关联页面"
                  >
                    <el-option
                      v-for="page in inlinePageOptions(data)"
                      :key="page.key"
                      :label="page.title"
                      :value="page.key"
                    />
                  </el-select>
                  <el-input
                    v-if="data.type === 'external'"
                    v-model="inlineDraft.externalUrl"
                    aria-label="外部地址"
                    placeholder="https://"
                  />
                  <span v-if="data.type === 'module'" class="inline-static-target">
                    进入首个可用子菜单
                  </span>
                </div>
                <button
                  v-else
                  class="inline-edit-trigger target-text"
                  type="button"
                  draggable="false"
                  title="点击编辑上级或关联目标"
                  @click.stop="startInlineEdit(data)"
                >
                  {{ targetLabel(data) }}
                </button>
              </div>
              <div class="menu-tree-cell icon-column">
                <el-select
                  v-if="isInlineEditing(data)"
                  v-model="inlineDraft.icon"
                  clearable
                  aria-label="菜单图标"
                  placeholder="图标"
                  @click.stop
                >
                  <el-option v-for="icon in iconOptions" :key="icon" :label="icon" :value="icon" />
                </el-select>
                <button
                  v-else
                  class="inline-edit-trigger"
                  type="button"
                  draggable="false"
                  title="点击编辑图标"
                  @click.stop="startInlineEdit(data)"
                >
                  {{ data.icon ?? "—" }}
                </button>
              </div>
              <div class="menu-tree-cell sort-column">
                <el-input-number
                  v-if="isInlineEditing(data)"
                  v-model="inlineDraft.sort"
                  :min="0"
                  :max="9999"
                  :controls="false"
                  aria-label="排序值"
                  @click.stop
                />
                <button
                  v-else
                  class="inline-edit-trigger"
                  type="button"
                  draggable="false"
                  title="点击编辑排序"
                  @click.stop="startInlineEdit(data)"
                >
                  {{ data.sort }}
                </button>
              </div>
              <div class="menu-tree-cell visible-column">
                <el-switch
                  :model-value="data.visible"
                  @change="handleVisibleChange(data, $event)"
                />
              </div>
              <div class="menu-tree-cell action-column" @dblclick.stop>
                <template v-if="isInlineEditing(data)">
                  <el-button link type="primary" @click.stop="saveInlineEdit(data)">保存</el-button>
                  <el-button link @click.stop="cancelInlineEdit">取消</el-button>
                </template>
                <template v-else>
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
                </template>
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
import { pageRegistry, pageRegistryByKey, resolvePagePathForMenu } from "@/config/page-registry";
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
import type { MenuIconKey } from "@/types/navigation";
import MenuEditorDrawer from "./MenuEditorDrawer.vue";
import MenuTypeTag from "./MenuTypeTag.vue";

type TreeDropType = Extract<NodeDropType, "before" | "after" | "inner">;

interface TreeNodeLike {
  data: MenuTreeNode;
  previousSibling?: TreeNodeLike | null;
  nextSibling?: TreeNodeLike | null;
  contains?: (node: TreeNodeLike, deep?: boolean) => boolean;
}

interface TreeRenderNodeLike {
  level?: number;
  expanded?: boolean;
  childNodes?: unknown[];
  expand?: () => void;
  collapse?: () => void;
}

interface TreeInstanceLike {
  setCurrentKey: (key: string | null, shouldAutoExpandParent?: boolean) => void;
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
const inlineEditingId = ref<string | null>(null);
const inlineDraft = ref<MenuRecordInput>(emptyInlineDraft());
const dropPreview = ref<{ targetId: string; type: TreeDropType } | null>(null);
const expandedMenuIds = ref<string[]>([]);
const menuTreeRef = ref<TreeInstanceLike | null>(null);
const iconOptions: MenuIconKey[] = [
  "grid", "notebook", "chat", "calendar", "house", "money", "shield", "setting",
  "menu", "data", "document", "coin", "office", "user", "list",
];
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
    cancelInlineEdit();
    expandedMenuIds.value = [];
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

function toggleTreeNode(node: TreeRenderNodeLike, data: MenuConfigRecord) {
  if (node.expanded) {
    expandedMenuIds.value = expandedMenuIds.value.filter((id) => id !== data.id);
    node.collapse?.();
    if (!node.collapse) node.expanded = false;
    return;
  }
  if (!expandedMenuIds.value.includes(data.id)) {
    expandedMenuIds.value = [...expandedMenuIds.value, data.id];
  }
  node.expand?.();
  if (!node.expand) node.expanded = true;
}

function clearTreeCurrent() {
  menuTreeRef.value?.setCurrentKey(null, false);
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
  return !dragDisabled.value && !inlineEditingId.value;
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

function dropPreviewClass(row: MenuConfigRecord) {
  if (dropPreview.value?.targetId !== row.id) return "";
  return `is-drop-preview-${dropPreview.value.type}`;
}

function resolvePreviewDropType(
  draggingNode: TreeNodeLike,
  dropNode: TreeNodeLike,
  event: DragEvent,
): TreeDropType | null {
  let dropPrev = allowDrop(draggingNode, dropNode, "prev");
  let dropInner = allowDrop(draggingNode, dropNode, "inner");
  let dropNext = allowDrop(draggingNode, dropNode, "next");

  if (dropNode.nextSibling?.data.id === draggingNode.data.id) dropNext = false;
  if (dropNode.previousSibling?.data.id === draggingNode.data.id) dropPrev = false;
  if (dropNode.contains?.(draggingNode, false)) dropInner = false;
  if (
    draggingNode.data.id === dropNode.data.id ||
    draggingNode.contains?.(dropNode)
  ) {
    return null;
  }

  const eventTarget = event.target;
  const targetElement = eventTarget instanceof Element
    ? eventTarget.closest(".el-tree-node__content")
    : null;
  if (!targetElement) return null;

  const rect = targetElement.getBoundingClientRect();
  const distance = event.clientY - rect.top;
  const prevPercent = dropPrev ? (dropInner ? 0.25 : dropNext ? 0.45 : 1) : -Infinity;
  const nextPercent = dropNext ? (dropInner ? 0.75 : dropPrev ? 0.55 : 0) : Infinity;

  if (distance < rect.height * prevPercent) return "before";
  if (distance > rect.height * nextPercent) return "after";
  if (dropInner) return "inner";
  return null;
}

function handleNodeDragOver(
  draggingNode: TreeNodeLike,
  dropNode: TreeNodeLike,
  event: DragEvent,
) {
  const type = resolvePreviewDropType(draggingNode, dropNode, event);
  dropPreview.value = type ? { targetId: dropNode.data.id, type } : null;
}

function handleNodeDragLeave(_draggingNode: TreeNodeLike, dropNode: TreeNodeLike) {
  if (dropPreview.value?.targetId === dropNode.data.id) clearDropPreview();
}

function clearDropPreview() {
  dropPreview.value = null;
}

function handleNodeDrop(
  draggingNode: TreeNodeLike,
  dropNode: TreeNodeLike,
  dropType: TreeDropType,
) {
  clearDropPreview();
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
  cancelInlineEdit();
  editingRecord.value = null;
  defaultParentId.value = null;
  drawerVisible.value = true;
}

function openCreateChild(parent: MenuConfigRecord) {
  cancelInlineEdit();
  editingRecord.value = null;
  defaultParentId.value = parent.id;
  drawerVisible.value = true;
}

function openEdit(row: MenuConfigRecord) {
  cancelInlineEdit();
  editingRecord.value = { ...row };
  defaultParentId.value = row.parentId;
  drawerVisible.value = true;
}

function emptyInlineDraft(): MenuRecordInput {
  return {
    parentId: null,
    type: "module",
    name: "",
    icon: null,
    pageKey: null,
    externalUrl: null,
    externalOpenMode: null,
    sort: 10,
    visible: true,
  };
}

function isInlineEditing(row: MenuConfigRecord) {
  return inlineEditingId.value === row.id;
}

function startInlineEdit(row: MenuConfigRecord) {
  if (isInlineEditing(row)) return;
  inlineEditingId.value = row.id;
  inlineDraft.value = {
    parentId: row.parentId,
    type: row.type,
    name: row.name,
    icon: row.icon,
    pageKey: row.pageKey,
    externalUrl: row.externalUrl,
    externalOpenMode: row.externalOpenMode,
    sort: row.sort,
    visible: row.visible,
  };
}

function handleRowDoubleClick(row: MenuConfigRecord) {
  if (!isInlineEditing(row)) startInlineEdit(row);
}

function handleInlineKeyup(row: MenuConfigRecord, event: KeyboardEvent) {
  if (!isInlineEditing(row)) return;
  if (event.key === "Enter") {
    event.preventDefault();
    event.stopPropagation();
    saveInlineEdit(row);
  } else if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    cancelInlineEdit();
  }
}

function cancelInlineEdit() {
  inlineEditingId.value = null;
  inlineDraft.value = emptyInlineDraft();
}

function inlineParentOptions(row: MenuConfigRecord) {
  return records.value.filter(
    (candidate) =>
      candidate.id !== row.id &&
      (candidate.type === "module" || candidate.type === "directory") &&
      menuConfigStore.canMove(row.id, candidate.id),
  );
}

function inlinePageOptions(row: MenuConfigRecord) {
  const tenant = selectedTenant.value;
  if (!tenant) return [];
  const usedPageKeys = new Set(
    records.value
      .filter((record) => record.id !== row.id && record.pageKey)
      .map((record) => record.pageKey),
  );
  return pageRegistry.filter(
    (page) =>
      page.selectable &&
      page.tenantTypes.includes(tenant.type) &&
      (page.allowDuplicateMenuBinding || !usedPageKeys.has(page.key)),
  );
}

function saveInlineEdit(row: MenuConfigRecord) {
  try {
    menuConfigStore.update(row.id, { ...inlineDraft.value, name: inlineDraft.value.name.trim() });
    void navigationStore.ensureValidCurrentRoute(router);
    cancelInlineEdit();
    ElMessage.success("菜单已更新");
  } catch (error) {
    if (error instanceof MenuValidationError) {
      ElMessage.warning("行内配置不符合菜单层级或字段规则");
    } else {
      ElMessage.error(error instanceof Error ? error.message : "菜单更新失败");
    }
  }
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
    const visible = Boolean(value);
    if (isInlineEditing(row)) inlineDraft.value.visible = visible;
    menuConfigStore.setVisible(row.id, visible);
    void navigationStore.ensureValidCurrentRoute(router);
    ElMessage.success(visible ? "菜单已显示" : "菜单已隐藏");
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

.filter-card,
.system-entry-card,
.table-card {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
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
    minmax(280px, 1.1fr)
    100px
    minmax(280px, 1.2fr)
    110px
    80px
    70px
    190px;
  align-items: center;
  min-width: 1110px;
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
  min-width: 1110px;
}

:deep(.menu-draggable-tree .el-tree-node__content) {
  position: relative;
  height: auto;
  min-height: 48px;
  padding-left: 0 !important;
  border-bottom: 1px solid var(--color-border);
}

:deep(.menu-draggable-tree .el-tree-node__content:hover) {
  background: var(--color-primary-light);
}

:deep(.menu-draggable-tree .el-tree-node:focus > .el-tree-node__content),
:deep(.menu-draggable-tree .el-tree-node.is-current > .el-tree-node__content) {
  background: transparent;
}

:deep(.menu-draggable-tree .el-tree-node:focus > .el-tree-node__content:hover),
:deep(.menu-draggable-tree .el-tree-node.is-current > .el-tree-node__content:hover) {
  background: var(--color-primary-light);
}

:deep(.menu-draggable-tree .el-tree-node__expand-icon) {
  display: none;
}

:deep(.menu-draggable-tree .el-tree-node__children) {
  overflow: visible;
}

:deep(.menu-draggable-tree > .el-tree__drop-indicator) {
  display: none !important;
}

:deep(.menu-draggable-tree.is-drop-not-allow .el-tree-node__content) {
  cursor: not-allowed;
}

.menu-tree-row {
  position: relative;
  flex: 1;
  min-height: 48px;
  cursor: default;
  transition: background-color 0.12s ease, box-shadow 0.12s ease;
}

.menu-tree-row.is-drop-preview-before::before,
.menu-tree-row.is-drop-preview-after::before {
  position: absolute;
  right: 0;
  left: 0;
  z-index: 4;
  height: 1px;
  content: "";
  background: var(--color-primary);
  pointer-events: none;
}

.menu-tree-row.is-drop-preview-before::before {
  top: -1px;
}

.menu-tree-row.is-drop-preview-after::before {
  bottom: -1px;
}

.menu-tree-row.is-drop-preview-inner {
  background: var(--color-primary-light);
  box-shadow: inset 0 0 0 1px var(--color-primary);
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
  justify-content: flex-end;
  text-align: right;
}

.inline-name-input,
.inline-target-editor,
.icon-column :deep(.el-select),
.sort-column :deep(.el-input-number) {
  width: 100%;
}

.inline-target-editor {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-6);
}

.inline-target-editor > :only-child {
  grid-column: 1 / -1;
}

.inline-static-target {
  color: var(--color-secondary);
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
  cursor: grab;
  flex-shrink: 0;
}

.drag-handle:active {
  cursor: grabbing;
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

.inline-edit-trigger {
  min-width: 0;
  padding: 2px 3px;
  overflow: hidden;
  color: inherit;
  font: inherit;
  text-align: inherit;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  cursor: text;
}

.inline-edit-trigger:hover,
.inline-edit-trigger:focus-visible {
  color: var(--color-primary-dark-text);
  background: var(--color-primary-light);
  border-color: var(--color-primary-line-light);
  outline: none;
}

.target-text {
  width: 100%;
  text-align: left;
}
</style>
