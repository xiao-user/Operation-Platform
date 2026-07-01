import type { TenantShellConfig } from "@/features/shell-config/types";
import type { TenantInfo } from "@/types/user";

export interface ShellConfigRepositoryLoadResult {
  config: TenantShellConfig;
  recoveryNotice: string | null;
}

export interface TenantShellConfigRepository {
  list(tenant: TenantInfo): ShellConfigRepositoryLoadResult;
  replace(tenant: TenantInfo, config: TenantShellConfig): TenantShellConfig;
  reset(tenant: TenantInfo): TenantShellConfig;
}

