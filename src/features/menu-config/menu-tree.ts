import type {
  MenuConfigRecord,
  MenuPageReference,
  MenuTarget,
  MenuTreeNode,
} from "@/features/menu-config/types";
import { resolvePagePathForMenu } from "@/config/page-registry";

function compareMenu(a: MenuConfigRecord, b: MenuConfigRecord) {
  return a.sort - b.sort || a.name.localeCompare(b.name, "zh-CN");
}

export function buildMenuTree(records: readonly MenuConfigRecord[]): MenuTreeNode[] {
  const nodes = new Map<string, MenuTreeNode>();

  for (const record of records) {
    nodes.set(record.id, { ...record, children: [] });
  }

  const roots: MenuTreeNode[] = [];
  for (const record of records) {
    const node = nodes.get(record.id)!;
    if (record.parentId === null) {
      roots.push(node);
      continue;
    }

    const parent = nodes.get(record.parentId);
    if (parent) parent.children.push(node);
  }

  const sortNodes = (items: MenuTreeNode[]) => {
    items.sort(compareMenu);
    for (const item of items) sortNodes(item.children);
  };
  sortNodes(roots);

  return roots;
}

export function collectDescendantIds(
  records: readonly MenuConfigRecord[],
  rootId: string,
): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const record of records) {
    if (!record.parentId) continue;
    const children = childrenByParent.get(record.parentId) ?? [];
    children.push(record.id);
    childrenByParent.set(record.parentId, children);
  }

  const result = new Set<string>();
  const visit = (parentId: string) => {
    for (const childId of childrenByParent.get(parentId) ?? []) {
      if (result.has(childId)) continue;
      result.add(childId);
      visit(childId);
    }
  };
  visit(rootId);
  return result;
}

export function resolveFirstTarget(
  node: MenuTreeNode,
  pages: ReadonlyMap<string, MenuPageReference>,
): MenuTarget | null {
  if (!node.visible) return null;

  if (node.type === "page" && node.pageKey) {
    const page = pages.get(node.pageKey);
    return page
      ? { kind: "internal", path: resolvePagePathForMenu(page, node.id), pageKey: node.pageKey }
      : null;
  }

  if (node.type === "external" && node.externalUrl && node.externalOpenMode) {
    return {
      kind: "external",
      url: node.externalUrl,
      openMode: node.externalOpenMode,
    };
  }

  for (const child of node.children) {
    const target = resolveFirstTarget(child, pages);
    if (target) return target;
  }

  return null;
}
