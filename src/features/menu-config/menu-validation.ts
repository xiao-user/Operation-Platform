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
}

interface ValidationContext {
  tenantType: TenantType;
  pages: ReadonlyMap<string, ValidationPageReference>;
}

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

  if (!candidate.name.trim()) errors.push("name-required");
  if (
    otherRecords.some(
      (record) =>
        record.parentId === candidate.parentId && record.name.trim() === candidate.name.trim(),
    )
  ) {
    errors.push("duplicate-sibling-name");
  }

  if (hasCycle(candidate, records)) errors.push("cyclic-parent");

  if (candidate.type === "module") {
    if (candidate.parentId !== null) errors.push("module-parent-not-root");
  } else if (!candidate.parentId) {
    errors.push("parent-required");
  } else if (!parent) {
    errors.push("parent-not-found");
  } else if (candidate.type === "directory") {
    if (parent.type === "directory") errors.push("directory-depth-exceeded");
    else if (parent.type !== "module") errors.push("invalid-parent-type");
  } else if (parent.type !== "module" && parent.type !== "directory") {
    errors.push("invalid-parent-type");
  }

  if (candidate.type === "page") {
    if (!candidate.pageKey) {
      errors.push("page-required");
    } else {
      const page = context.pages.get(candidate.pageKey);
      if (!page || !page.tenantTypes.includes(context.tenantType)) {
        errors.push("page-not-available");
      }
      if (otherRecords.some((record) => record.pageKey === candidate.pageKey)) {
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
