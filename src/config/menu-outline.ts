export interface MenuOutlineNode {
  name: string;
  children: MenuOutlineNode[];
}

export function parseMenuOutline(source: string, outlineName: string) {
  const roots: MenuOutlineNode[] = [];
  const stack: MenuOutlineNode[] = [];

  for (const rawLine of source.trim().split("\n")) {
    const leadingSpaces = rawLine.length - rawLine.trimStart().length;
    if (leadingSpaces % 2 !== 0) {
      throw new Error(`${outlineName}菜单缩进无效：${rawLine}`);
    }

    const level = leadingSpaces / 2;
    const node: MenuOutlineNode = { name: rawLine.trim(), children: [] };

    if (level === 0) {
      roots.push(node);
    } else {
      const parent = stack[level - 1];
      if (!parent) throw new Error(`${outlineName}菜单缺少上级节点：${rawLine}`);
      parent.children.push(node);
    }

    stack[level] = node;
    stack.length = level + 1;
  }

  return roots;
}
