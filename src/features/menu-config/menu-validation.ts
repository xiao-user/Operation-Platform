import type { TenantType } from "@/types/user";
import type { MenuConfigRecord } from "@/features/menu-config/types";

export type MenuValidationCode =
  | "name-required"
  | "duplicate-sibling-name"
  | "module-parent-not-root"
  | "parent-required"
  | "parent-not-found"
  | "invalid-parent-type"
  | "directory-depth-exceeded"
  | "menu-depth-exceeded"
  | "page-required"
  | "page-not-available"
  | "duplicate-page-key"
  | "external-url-required"
  | "invalid-external-url"
  | "external-open-mode-required"
  | "cyclic-parent";

interface ValidationPageReference {
  key: string;
  path: string;
  tenantTypes: readonly TenantType[];
  allowDuplicateMenuBinding?: boolean;
}

interface ValidationContext {
  tenantType: TenantType;
  pages: ReadonlyMap<string, ValidationPageReference>;
}

export class MenuValidationError extends Error {
  constructor(readonly codes: MenuValidationCode[]) {
    super("菜单配置校验失败");
    this.name = "MenuValidationError";
  }
}

export const MAX_MENU_DEPTH = 4;
export const MAX_DIRECTORY_LEVEL = MAX_MENU_DEPTH - 1;

function hasCycle(candidate: MenuConfigRecord, records: readonly MenuConfigRecord[]) {
  const byId = new Map(records.map((record) => [record.id, record]));
  byId.set(candidate.id, candidate);

  const seen = new Set<string>([candidate.id]);
  let parentId = candidate.parentId;
  while (parentId) {
    if (seen.has(parentId)) return true;
    seen.add(parentId);
    parentId = byId.get(parentId)?.parentId ?? null;
  }
  return false;
}

function menuLevel(candidate: MenuConfigRecord, records: readonly MenuConfigRecord[]) {
  const byId = new Map(records.map((record) => [record.id, record]));
  byId.set(candidate.id, candidate);

  let level = 1;
  let parentId = candidate.parentId;
  const seen = new Set<string>([candidate.id]);

  while (parentId) {
    if (seen.has(parentId)) return Number.POSITIVE_INFINITY;
    seen.add(parentId);

    const parent = byId.get(parentId);
    if (!parent) return Number.POSITIVE_INFINITY;
    level += 1;
    parentId = parent.parentId;
  }

  return level;
}

function maxDescendantRelativeDepth(
  candidate: MenuConfigRecord,
  records: readonly MenuConfigRecord[],
) {
  const childrenByParent = new Map<string, string[]>();
  for (const record of records) {
    if (!record.parentId) continue;
    const children = childrenByParent.get(record.parentId) ?? [];
    children.push(record.id);
    childrenByParent.set(record.parentId, children);
  }

  let maxDepth = 0;
  const seen = new Set<string>();
  const visit = (parentId: string, depth: number) => {
    if (seen.has(parentId)) return;
    seen.add(parentId);

    for (const childId of childrenByParent.get(parentId) ?? []) {
      maxDepth = Math.max(maxDepth, depth + 1);
      visit(childId, depth + 1);
    }
  };

  visit(candidate.id, 0);
  return maxDepth;
}

function hasValidExternalUrl(value: string | null) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateMenuRecord(
  candidate: MenuConfigRecord,
  records: readonly MenuConfigRecord[],
  context: ValidationContext,
): MenuValidationCode[] {
  const errors: MenuValidationCode[] = [];
  const otherRecords = records.filter((record) => record.id !== candidate.id);
  const parent = candidate.parentId
    ? records.find((record) => record.id === candidate.parentId)
    : undefined;
  const cyclic = hasCycle(candidate, records);

  if (!candidate.name.trim()) errors.push("name-required");
  if (
    otherRecords.some(
      (record) =>
        record.parentId === candidate.parentId && record.name.trim() === candidate.name.trim(),
    )
  ) {
    errors.push("duplicate-sibling-name");
  }

  if (cyclic) errors.push("cyclic-parent");

  if (candidate.type === "module") {
    if (candidate.parentId !== null) errors.push("module-parent-not-root");
  } else if (!candidate.parentId) {
    errors.push("parent-required");
  } else if (!parent) {
    errors.push("parent-not-found");
  } else if (parent.type !== "module" && parent.type !== "directory") {
    errors.push("invalid-parent-type");
  }

  if (!cyclic && candidate.type !== "module" && parent) {
    const level = menuLevel(candidate, records);
    const maxSubtreeLevel = level + maxDescendantRelativeDepth(candidate, records);

    if (Number.isFinite(maxSubtreeLevel) && maxSubtreeLevel > MAX_MENU_DEPTH) {
      errors.push("menu-depth-exceeded");
    }
    if (
      candidate.type === "directory" &&
      Number.isFinite(level) &&
      level > MAX_DIRECTORY_LEVEL
    ) {
      errors.push("directory-depth-exceeded");
    }
  }

  if (candidate.type === "page") {
    if (!candidate.pageKey) {
      errors.push("page-required");
    } else {
      const page = context.pages.get(candidate.pageKey);
      if (!page || !page.tenantTypes.includes(context.tenantType)) {
        errors.push("page-not-available");
      }
      if (
        !page?.allowDuplicateMenuBinding &&
        otherRecords.some((record) => record.pageKey === candidate.pageKey)
      ) {
        errors.push("duplicate-page-key");
      }
    }
  }

  if (candidate.type === "external") {
    if (!candidate.externalUrl) errors.push("external-url-required");
    else if (!hasValidExternalUrl(candidate.externalUrl)) errors.push("invalid-external-url");
    if (!candidate.externalOpenMode) errors.push("external-open-mode-required");
  }

  return Array.from(new Set(errors));
}
