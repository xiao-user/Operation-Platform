export const ADMIN_ROLE_ID = "admin";
export const STAFF_ROLE_ID = "teacher";

export interface RoleRecord {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  builtIn: boolean;
  enabled: boolean;
  sort: number;
  menuIds: string[];
}

export type RoleInput = Omit<RoleRecord, "id" | "tenantId" | "builtIn">;
