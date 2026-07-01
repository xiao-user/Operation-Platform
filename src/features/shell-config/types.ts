export interface WorkbenchConfig {
  enabled: boolean;
  label: string;
  sort: number;
}

export interface TenantShellConfig {
  version: 1;
  workbench: WorkbenchConfig;
}

