import type { TenantShellConfig } from "@/features/shell-config/types";

export function defaultTenantShellConfig(): TenantShellConfig {
  return {
    version: 1,
    workbench: {
      enabled: true,
      label: "工作台",
      icon: "LayoutGrid",
      sort: 0,
    },
  };
}
