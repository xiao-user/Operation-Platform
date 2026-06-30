export type UserRole = "admin" | "teacher";

export type TenantType = "school" | "bureau" | "org"; // 学校 | 教育局 | 机构

export interface TenantInfo {
  id: string;
  name: string;
  shortName: string;
  type: TenantType;
}

export interface UserInfo {
  name: string;
  initials: string;
}
