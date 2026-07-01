import type { MenuIconKey } from "@/types/navigation";

export interface WorkbenchConfig {
  enabled: boolean;
  label: string;
  icon: MenuIconKey;
  sort: number;
}

export interface TenantShellConfig {
  version: 1;
  workbench: WorkbenchConfig;
}
