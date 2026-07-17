import { cloneTenantTemplate } from "@/config/menu-templates";
import { createDefaultRoles } from "@/features/access-control/default-roles";
import { defaultTenantShellConfig } from "@/features/shell-config/default-shell-config";
import type { TenantConfiguration } from "@/features/tenant-config/types";
import type { TenantInfo } from "@/types/user";

export function createDefaultTenantConfiguration(tenant: TenantInfo): TenantConfiguration {
  const menuRecords = cloneTenantTemplate(tenant);
  return {
    version: 1,
    menuRecords,
    shellConfig: defaultTenantShellConfig(),
    roles: createDefaultRoles(tenant, menuRecords),
  };
}
