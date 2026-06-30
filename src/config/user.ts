import type { UserRole } from "@/types/user";

export interface RoleOption {
  value: UserRole;
  label: string;
}

export const ROLE_OPTIONS: RoleOption[] = [
  { value: "admin", label: "管理员" },
  { value: "teacher", label: "老师" },
];

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "管理员",
  teacher: "老师",
};
