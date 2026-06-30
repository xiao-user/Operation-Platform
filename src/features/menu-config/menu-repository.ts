import type { MenuConfigRecord } from "@/features/menu-config/types";
import type { TenantInfo } from "@/types/user";

export interface MenuRepositoryLoadResult {
  records: MenuConfigRecord[];
  recoveryNotice: string | null;
}

export interface TenantMenuRepository {
  list(tenant: TenantInfo): MenuRepositoryLoadResult;
  replace(tenant: TenantInfo, records: MenuConfigRecord[]): MenuConfigRecord[];
  reset(tenant: TenantInfo): MenuConfigRecord[];
}
