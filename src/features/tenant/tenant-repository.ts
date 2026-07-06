import type { TenantInfo } from "@/types/user";

export interface TenantRepositoryLoadResult {
  tenants: TenantInfo[];
  recoveryNotice: string | null;
}

export interface TenantRepository {
  list(): TenantRepositoryLoadResult;
  replace(tenants: TenantInfo[]): TenantInfo[];
  reset(): TenantInfo[];
}
