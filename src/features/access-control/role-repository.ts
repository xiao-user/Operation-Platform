import type { MenuConfigRecord } from "@/features/menu-config/types";
import type { RoleRecord } from "@/features/access-control/types";
import type { TenantInfo } from "@/types/user";

export interface RoleRepositoryLoadResult {
  roles: RoleRecord[];
  recoveryNotice: string | null;
}

export interface RoleRepository {
  list(tenant: TenantInfo, records: readonly MenuConfigRecord[]): RoleRepositoryLoadResult;
  replace(tenant: TenantInfo, roles: RoleRecord[]): RoleRecord[];
  reset(tenant: TenantInfo, records: readonly MenuConfigRecord[]): RoleRecord[];
}
