import { ref, type Ref } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { ElMessage } from "element-plus";
import type { AllowDropType, NodeDropType } from "element-plus";
import { MenuValidationError } from "@/features/menu-config/menu-validation";
import type { MenuConfigRecord, MenuTreeNode } from "@/features/menu-config/types";
import { useMenuConfigStore } from "@/stores/menu-config";
import { useNavigationStore } from "@/stores/navigation";

type TreeDropType = Extract<NodeDropType, "before" | "after" | "inner">;

export interface MenuTreeNodeLike {
  data: MenuTreeNode;
  previousSibling?: MenuTreeNodeLike | null;
  nextSibling?: MenuTreeNodeLike | null;
  contains?: (node: MenuTreeNodeLike, deep?: boolean) => boolean;
}

export function useMenuTreeDragDrop(
  dragDisabled: Readonly<Ref<boolean>>,
  inlineEditingId: Readonly<Ref<string | null>>,
) {
  const router = useRouter();
  const menuConfigStore = useMenuConfigStore();
  const navigationStore = useNavigationStore();
  const { records } = storeToRefs(menuConfigStore);
  const dropPreview = ref<{ targetId: string; type: TreeDropType } | null>(null);

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

  function normalizeDropType(type: AllowDropType): TreeDropType {
    if (type === "prev") return "before";
    if (type === "next") return "after";
    return "inner";
  }

  function allowDrag() {
    return !dragDisabled.value && !inlineEditingId.value;
  }

  function allowDrop(
    draggingNode: MenuTreeNodeLike,
    dropNode: MenuTreeNodeLike,
    type: AllowDropType,
  ) {
    if (dragDisabled.value || draggingNode.data.id === dropNode.data.id) return false;
    const placement = resolveDropPlacement(
      draggingNode.data.id,
      dropNode.data,
      normalizeDropType(type),
    );
    return menuConfigStore.canMove(draggingNode.data.id, placement.parentId);
  }

  function dropPreviewClass(row: MenuConfigRecord) {
    if (dropPreview.value?.targetId !== row.id) return "";
    return `is-drop-preview-${dropPreview.value.type}`;
  }

  function resolvePreviewDropType(
    draggingNode: MenuTreeNodeLike,
    dropNode: MenuTreeNodeLike,
    event: DragEvent,
  ): TreeDropType | null {
    let dropPrev = allowDrop(draggingNode, dropNode, "prev");
    let dropInner = allowDrop(draggingNode, dropNode, "inner");
    let dropNext = allowDrop(draggingNode, dropNode, "next");

    if (dropNode.nextSibling?.data.id === draggingNode.data.id) dropNext = false;
    if (dropNode.previousSibling?.data.id === draggingNode.data.id) dropPrev = false;
    if (dropNode.contains?.(draggingNode, false)) dropInner = false;
    if (draggingNode.contains?.(dropNode)) return null;

    const targetElement = event.target instanceof Element
      ? event.target.closest(".el-tree-node__content")
      : null;
    if (!targetElement) return null;

    const rect = targetElement.getBoundingClientRect();
    const distance = event.clientY - rect.top;
    const prevPercent = dropPrev ? (dropInner ? 0.25 : dropNext ? 0.45 : 1) : -Infinity;
    const nextPercent = dropNext ? (dropInner ? 0.75 : dropPrev ? 0.55 : 0) : Infinity;

    if (distance < rect.height * prevPercent) return "before";
    if (distance > rect.height * nextPercent) return "after";
    return dropInner ? "inner" : null;
  }

  function handleNodeDragOver(
    draggingNode: MenuTreeNodeLike,
    dropNode: MenuTreeNodeLike,
    event: DragEvent,
  ) {
    const type = resolvePreviewDropType(draggingNode, dropNode, event);
    dropPreview.value = type ? { targetId: dropNode.data.id, type } : null;
  }

  function handleNodeDragLeave(_draggingNode: MenuTreeNodeLike, dropNode: MenuTreeNodeLike) {
    if (dropPreview.value?.targetId === dropNode.data.id) clearDropPreview();
  }

  function clearDropPreview() {
    dropPreview.value = null;
  }

  async function handleNodeDrop(
    draggingNode: MenuTreeNodeLike,
    dropNode: MenuTreeNodeLike,
    dropType: TreeDropType,
  ) {
    clearDropPreview();
    const placement = resolveDropPlacement(draggingNode.data.id, dropNode.data, dropType);
    try {
      await menuConfigStore.move(draggingNode.data.id, placement.parentId, placement.index);
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

  return {
    allowDrag,
    allowDrop,
    dropPreviewClass,
    handleNodeDragOver,
    handleNodeDragLeave,
    clearDropPreview,
    handleNodeDrop,
  };
}
