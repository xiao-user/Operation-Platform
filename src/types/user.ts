export type UserRole = string;

export type TenantType = "school" | "bureau" | "org" | "platform"; // 学校 | 教育局 | 机构 | 运营平台

export interface TenantInfo {
  id: string;
  name: string;
  shortName: string;
  type: TenantType;
  enabled?: boolean;
}

export interface UserInfo {
  id: string;
  email?: string;
  name: string;
  initials: string;
  platformAdmin: boolean;
  tenantRoleIds: Record<string, UserRole>;
}
