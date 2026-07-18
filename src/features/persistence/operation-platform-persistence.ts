import type { TenantConfiguration, TenantConfigurationLoadResult } from "@/features/tenant-config/types";
import type { TenantMemberLoadResult, TenantMemberRecord } from "@/features/tenant-members/types";
import type {
  UserWorkbenchLayout,
  WorkbenchLayoutContext,
  WorkbenchLayoutLoadResult,
  WorkbenchTemplate,
} from "@/features/workbench/types";
import type { TenantInfo, UserInfo } from "@/types/user";

export interface PersistenceIdentity {
  id: string;
  email?: string;
}

export interface OperationPlatformInitialState {
  userInfo: UserInfo;
  tenants: TenantInfo[];
  tenantRecoveryNotice: string | null;
  initialized: boolean;
}

export interface OperationPlatformPersistenceCapabilities {
  localDataExport: boolean;
  requiresAuthentication: boolean;
  memberAccountKind: "identifier" | "email";
}

export interface OperationPlatformPersistence {
  readonly capabilities: OperationPlatformPersistenceCapabilities;

  initialState(): OperationPlatformInitialState;
  initialize(identity: PersistenceIdentity | null): Promise<OperationPlatformInitialState>;
  reset(): void;

  listTenants(): TenantInfo[];
  replaceTenantCache(tenants: TenantInfo[]): TenantInfo[];
  createTenant(
    tenant: TenantInfo,
    configuration: TenantConfiguration,
    administrator: TenantMemberRecord,
  ): Promise<TenantInfo>;
  updateTenant(tenant: TenantInfo): Promise<TenantInfo>;
  deleteTenant(tenantId: string): Promise<void>;

  ensureTenantLoaded(tenant: TenantInfo): Promise<void>;
  loadConfiguration(tenant: TenantInfo): TenantConfigurationLoadResult | null;
  saveConfiguration(
    tenant: TenantInfo,
    configuration: TenantConfiguration,
  ): Promise<TenantConfiguration>;

  loadMembers(tenant: TenantInfo): TenantMemberLoadResult;
  replaceMembers(
    tenant: TenantInfo,
    members: TenantMemberRecord[],
  ): Promise<TenantMemberRecord[]>;

  getActiveRole(tenantId: string, userId: string): string | null;
  setActiveRole(tenantId: string, userId: string, roleId: string): Promise<void>;
  getVisualizationTheme(tenantId: string, userId: string): string | null;
  setVisualizationTheme(tenantId: string, userId: string, themeId: string): Promise<void>;

  loadWorkbenchLayout(
    context: WorkbenchLayoutContext,
    template: WorkbenchTemplate,
  ): WorkbenchLayoutLoadResult;
  saveWorkbenchLayout(
    context: WorkbenchLayoutContext,
    template: WorkbenchTemplate,
    layout: UserWorkbenchLayout,
  ): Promise<UserWorkbenchLayout>;
  resetWorkbenchLayout(
    context: WorkbenchLayoutContext,
    template: WorkbenchTemplate,
  ): Promise<UserWorkbenchLayout>;
}
