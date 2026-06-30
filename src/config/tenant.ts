import type { TenantType } from "@/types/user";

export interface TenantTypeOption {
  value: TenantType;
  label: string;
}

export const TENANT_TYPE_OPTIONS: TenantTypeOption[] = [
  { value: "school", label: "学校" },
  { value: "bureau", label: "教育局" },
  { value: "org", label: "机构" },
  { value: "platform", label: "运营平台" },
];

export const TENANT_TYPE_LABEL: Record<TenantType, string> = Object.fromEntries(
  TENANT_TYPE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<TenantType, string>;

export const TENANT_TAG_TYPE: Record<
  TenantType,
  "primary" | "success" | "info" | "warning" | "danger"
> = {
  school: "info",
  bureau: "warning",
  org: "success",
  platform: "primary",
};
