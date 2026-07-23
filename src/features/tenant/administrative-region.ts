import type {
  AdministrativeRegionNode,
  AdministrativeRegionScope,
  TenantAdministrativeRegion,
  TenantInfo,
} from "@/types/user";

const scopeOrder: readonly AdministrativeRegionScope[] = ["province", "city", "district"];

export const guangdongProvinceRegion: TenantAdministrativeRegion = {
  code: "440000",
  name: "广东省",
  scope: "province",
  path: [{ code: "440000", name: "广东省", scope: "province" }],
};

export function isAdministrativeRegionNode(value: unknown): value is AdministrativeRegionNode {
  if (!value || typeof value !== "object") return false;
  const node = value as AdministrativeRegionNode;
  return typeof node.code === "string"
    && /^\d{6}$/.test(node.code)
    && typeof node.name === "string"
    && node.name.trim().length > 0
    && scopeOrder.includes(node.scope);
}

export function isTenantAdministrativeRegion(
  value: unknown,
): value is TenantAdministrativeRegion {
  if (!isAdministrativeRegionNode(value)) return false;
  const region = value as TenantAdministrativeRegion;
  if (!Array.isArray(region.path) || !region.path.every(isAdministrativeRegionNode)) return false;
  const finalNode = region.path[region.path.length - 1];
  return region.path[0]?.scope === "province"
    && finalNode?.code === region.code
    && finalNode.name === region.name
    && finalNode.scope === region.scope
    && region.path.every((node, index) => (
      index === 0 || scopeOrder.indexOf(node.scope) > scopeOrder.indexOf(region.path[index - 1]!.scope)
    ));
}

export function cloneTenantAdministrativeRegion(
  region: TenantAdministrativeRegion,
): TenantAdministrativeRegion {
  return {
    ...region,
    path: region.path.map((node) => ({ ...node })),
  };
}

export function normalizeTenantAdministrativeRegion(
  value: unknown,
): TenantAdministrativeRegion | undefined {
  if (!isTenantAdministrativeRegion(value)) return undefined;
  return {
    code: value.code,
    name: value.name.trim(),
    scope: value.scope,
    path: value.path.map((node) => ({ ...node, name: node.name.trim() })),
  };
}

export function defaultAdministrativeRegionForTenant(
  tenant: Pick<TenantInfo, "id" | "type">,
): TenantAdministrativeRegion | undefined {
  if (tenant.type === "platform") return undefined;
  return cloneTenantAdministrativeRegion(guangdongProvinceRegion);
}

export function administrativeRegionLabel(region: TenantAdministrativeRegion | undefined) {
  return region?.path.map((node) => node.name).join(" / ") ?? "未设置";
}
