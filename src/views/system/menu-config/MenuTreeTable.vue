<template>
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
      v-if="tree.length"
      ref="menuTreeRef"
      :data="tree"
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
            <el-icon class="drag-handle" title="拖动调整顺序或层级">
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
          <div
            class="menu-tree-cell target-column"
            :title="isInlineEditing(data) ? '' : targetLabel(data)"
          >
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
                  :label="pageResourceOptionLabel(page)"
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
            <MenuIconSelect
              v-if="isInlineEditing(data)"
              v-model="inlineDraft.icon"
              aria-label="菜单图标"
              placeholder="图标"
              @click.stop
            />
            <button
              v-else
              class="inline-edit-trigger icon-edit-trigger"
              type="button"
              draggable="false"
              title="点击编辑图标"
              @click.stop="startInlineEdit(data)"
            >
              <component v-if="data.icon" :is="resolveMenuIcon(data.icon)" />
              <span>{{ data.icon ? menuIconLabel(data.icon) : "—" }}</span>
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
                @click.stop="emit('create-child', data)"
              >
                新增子菜单
              </el-button>
              <el-button link type="primary" @click.stop="emit('edit', data)">编辑</el-button>
              <el-button link type="danger" @click.stop="emit('delete', data)">删除</el-button>
            </template>
          </div>
        </div>
      </template>
    </el-tree>

    <el-empty v-else :description="tenant ? '暂无匹配菜单' : '请先选择租户'" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { CaretRight, Rank } from "@element-plus/icons-vue";
import {
  listSelectablePageResources,
  pageRegistryByKey,
  pageResourceOptionLabel,
  resolvePagePathForMenu,
} from "@/config/page-registry";
import { menuIconLabel, resolveMenuIcon } from "@/components/menu-icons";
import { MenuValidationError } from "@/features/menu-config/menu-validation";
import type {
  MenuConfigRecord,
  MenuRecordInput,
  MenuTreeNode,
} from "@/features/menu-config/types";
import { useMenuConfigStore } from "@/stores/menu-config";
import { useNavigationStore } from "@/stores/navigation";
import type { TenantInfo } from "@/types/user";
import MenuIconSelect from "@/components/MenuIconSelect.vue";
import MenuTypeTag from "./MenuTypeTag.vue";
import { useMenuTreeDragDrop } from "./use-menu-tree-drag-drop";

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

const props = defineProps<{
  tree: MenuTreeNode[];
  records: MenuConfigRecord[];
  tenant: TenantInfo | null;
  dragDisabled: boolean;
}>();

const emit = defineEmits<{
  "create-child": [row: MenuConfigRecord];
  edit: [row: MenuConfigRecord];
  delete: [row: MenuConfigRecord];
}>();

const menuConfigStore = useMenuConfigStore();
const navigationStore = useNavigationStore();
const router = useRouter();
const inlineEditingId = ref<string | null>(null);
const inlineDraft = ref<MenuRecordInput>(emptyInlineDraft());
const expandedMenuIds = ref<string[]>([]);
const menuTreeRef = ref<TreeInstanceLike | null>(null);
const treeProps = { children: "children", label: "name" } as const;
const dragDisabledRef = computed(() => props.dragDisabled);

const {
  allowDrag,
  allowDrop,
  dropPreviewClass,
  handleNodeDragOver,
  handleNodeDragLeave,
  clearDropPreview,
  handleNodeDrop,
} = useMenuTreeDragDrop(dragDisabledRef, inlineEditingId);

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

function targetLabel(row: MenuConfigRecord) {
  if (row.type === "module") return "进入首个可用子菜单";
  if (row.type === "directory") return "目录";
  if (row.type === "external") return row.externalUrl ?? "未配置";
  const page = row.pageKey ? pageRegistryByKey.get(row.pageKey) : null;
  return page ? `${page.title} · ${resolvePagePathForMenu(page, row.id)}` : "页面不可用";
}

function nameColumnStyle(node: TreeRenderNodeLike) {
  const level = typeof node.level === "number" ? node.level : 1;
  return { "--menu-level-indent": `${Math.max(0, level - 1) * 24}px` };
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
  return props.records.filter(
    (candidate) =>
      candidate.id !== row.id &&
      (candidate.type === "module" || candidate.type === "directory") &&
      menuConfigStore.canMove(row.id, candidate.id),
  );
}

function inlinePageOptions(row: MenuConfigRecord) {
  if (!props.tenant) return [];
  return listSelectablePageResources({
    tenantType: props.tenant.type,
    records: props.records,
    editingRecordId: row.id,
  });
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
</script>

<style scoped>
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
    140px
    80px
    70px
    190px;
  align-items: center;
  min-width: 1140px;
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
  min-width: 1140px;
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

.menu-tree-row.is-drop-preview-before::before { top: -1px; }
.menu-tree-row.is-drop-preview-after::before { bottom: -1px; }

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
.visible-column { justify-content: center; }

.action-column {
  justify-content: flex-end;
  text-align: right;
}

.inline-name-input,
.inline-target-editor,
.icon-column :deep(.el-select-v2),
.sort-column :deep(.el-input-number) { width: 100%; }

.inline-target-editor {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-6);
}

.inline-target-editor > :only-child { grid-column: 1 / -1; }
.inline-static-target { color: var(--color-secondary); }

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

.tree-toggle .el-icon { transition: transform 0.15s ease; }
.tree-toggle.is-expanded .el-icon { transform: rotate(90deg); }

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

.drag-handle:active { cursor: grabbing; }

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

.icon-edit-trigger {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-6);
}

.icon-edit-trigger svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  stroke-width: 2;
}

.target-text {
  width: 100%;
  text-align: left;
}
</style>
