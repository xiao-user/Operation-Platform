export interface TenantMemberRecord {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  initials: string;
  account: string;
  phone: string;
  title: string;
  enabled: boolean;
  roleIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface TenantMemberLoadResult {
  members: TenantMemberRecord[];
  recoveryNotice: string | null;
}

export interface TenantMemberInput {
  name: string;
  account: string;
  phone: string;
  title: string;
  enabled: boolean;
  roleIds: string[];
}
