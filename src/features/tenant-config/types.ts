import type { RoleRecord } from "@/features/access-control/types";
import type { MenuConfigRecord } from "@/features/menu-config/types";
import type { TenantShellConfig } from "@/features/shell-config/types";

export interface TenantConfiguration {
  version: 1;
  menuRecords: MenuConfigRecord[];
  shellConfig: TenantShellConfig;
  roles: RoleRecord[];
}

export interface TenantConfigurationLoadResult {
  configuration: TenantConfiguration;
  recoveryNotice: string | null;
}
