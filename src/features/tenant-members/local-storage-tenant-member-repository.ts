import { ADMIN_ROLE_ID } from "@/features/access-control/types";
import { MOCK_USER_INFO } from "@/config/mock";
import type { TenantMemberLoadResult, TenantMemberRecord } from "@/features/tenant-members/types";
import type { TenantInfo, UserInfo } from "@/types/user";

export function tenantMemberStorageKey(tenantId: string) {
  return `operation-platform:tenant-members:v1:${tenantId}`;
}

function invalidTenantMemberStorageKey(tenantId: string, timestamp: number) {
  return `operation-platform:tenant-members:invalid:${tenantId}:${timestamp}`;
}

export class TenantMemberPersistenceError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "TenantMemberPersistenceError";
    this.cause = cause;
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function initialsForName(name: string) {
  const chars = Array.from(name.trim());
  return chars.slice(Math.max(0, chars.length - 2)).join("") || "成员";
}

function roleTitle(roleIds: readonly string[], tenant: TenantInfo) {
  if (roleIds.includes(ADMIN_ROLE_ID)) return "组织管理员";
  return tenant.type === "school" ? "老师" : "职员";
}

function isTenantMember(value: unknown, tenantId: string): value is TenantMemberRecord {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    isNonEmptyString(item.id) &&
    item.tenantId === tenantId &&
    isNonEmptyString(item.userId) &&
    isNonEmptyString(item.name) &&
    isNonEmptyString(item.initials) &&
    isNonEmptyString(item.account) &&
    typeof item.phone === "string" &&
    typeof item.title === "string" &&
    typeof item.enabled === "boolean" &&
    isStringArray(item.roleIds) &&
    item.roleIds.length > 0 &&
    isFiniteNumber(item.createdAt) &&
    isFiniteNumber(item.updatedAt)
  );
}

function normalizeRoleIds(roleIds: readonly string[]) {
  return Array.from(new Set(roleIds.map((roleId) => roleId.trim()).filter(Boolean)));
}

export function cloneTenantMember(member: TenantMemberRecord): TenantMemberRecord {
  return { ...member, roleIds: [...member.roleIds] };
}

function normalizeTenantMember(member: TenantMemberRecord): TenantMemberRecord {
  const name = member.name.trim();
  const roleIds = normalizeRoleIds(member.roleIds);
  return {
    ...member,
    name,
    initials: member.initials.trim() || initialsForName(name),
    account: member.account.trim(),
    phone: member.phone.trim(),
    title: member.title.trim(),
    roleIds,
  };
}

function normalizeTenantMembers(members: TenantMemberRecord[]) {
  return members
    .map(normalizeTenantMember)
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN") || a.account.localeCompare(b.account));
}

function isValidMemberSet(value: unknown, tenantId: string): value is TenantMemberRecord[] {
  if (!Array.isArray(value) || !value.every((item) => isTenantMember(item, tenantId))) {
    return false;
  }
  const ids = new Set(value.map((member) => member.id));
  if (ids.size !== value.length) return false;
  const accounts = new Set(value.map((member) => member.account.trim().toLowerCase()));
  return accounts.size === value.length;
}

export function createCurrentUserAdminMember(
  tenant: TenantInfo,
  user: UserInfo = MOCK_USER_INFO,
  now = Date.now(),
): TenantMemberRecord {
  return {
    id: `member-${tenant.id}-${user.id}`,
    tenantId: tenant.id,
    userId: user.id,
    name: user.name,
    initials: user.initials || initialsForName(user.name),
    account: user.id,
    phone: "",
    title: "组织管理员",
    enabled: true,
    roleIds: [ADMIN_ROLE_ID],
    createdAt: now,
    updatedAt: now,
  };
}

export function createDefaultTenantMembers(
  tenant: TenantInfo,
  user: UserInfo = MOCK_USER_INFO,
  now = Date.now(),
): TenantMemberRecord[] {
  const legacyRoleId = user.platformAdmin ? ADMIN_ROLE_ID : user.tenantRoleIds[tenant.id];
  if (!legacyRoleId) return [];
  const roleIds = [legacyRoleId];
  return [
    {
      id: `member-${tenant.id}-${user.id}`,
      tenantId: tenant.id,
      userId: user.id,
      name: user.name,
      initials: user.initials || initialsForName(user.name),
      account: user.id,
      phone: "",
      title: roleTitle(roleIds, tenant),
      enabled: true,
      roleIds,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export class LocalStorageTenantMemberRepository {
  constructor(
    private readonly storage: Storage,
    private readonly now: () => number = Date.now,
  ) {}

  list(tenant: TenantInfo): TenantMemberLoadResult {
    const key = tenantMemberStorageKey(tenant.id);
    const raw = this.storage.getItem(key);
    if (raw === null) {
      return { members: this.persistDefault(tenant), recoveryNotice: null };
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!isValidMemberSet(parsed, tenant.id)) return this.recoverInvalidData(tenant, raw);
      return {
        members: normalizeTenantMembers(parsed).map(cloneTenantMember),
        recoveryNotice: null,
      };
    } catch (error) {
      if (error instanceof TenantMemberPersistenceError) throw error;
      return this.recoverInvalidData(tenant, raw);
    }
  }

  replace(tenant: TenantInfo, members: TenantMemberRecord[]) {
    const normalized = normalizeTenantMembers(members);
    if (!isValidMemberSet(normalized, tenant.id)) {
      throw new TenantMemberPersistenceError("组织成员数据不完整，无法保存");
    }
    try {
      this.storage.setItem(tenantMemberStorageKey(tenant.id), JSON.stringify(normalized));
    } catch (error) {
      throw new TenantMemberPersistenceError("组织成员保存失败，请检查浏览器存储空间", error);
    }
    return normalized.map(cloneTenantMember);
  }

  reset(tenant: TenantInfo) {
    return this.persistDefault(tenant);
  }

  removeTenant(tenantId: string) {
    const key = tenantMemberStorageKey(tenantId);
    const previous = this.storage.getItem(key);
    try {
      this.storage.removeItem(key);
    } catch (error) {
      try {
        if (previous === null) this.storage.removeItem(key);
        else this.storage.setItem(key, previous);
      } catch (rollbackError) {
        throw new TenantMemberPersistenceError("组织成员清理失败，且无法恢复清理前状态", rollbackError);
      }
      throw new TenantMemberPersistenceError("组织成员清理失败，已恢复清理前状态", error);
    }
  }

  private persistDefault(tenant: TenantInfo) {
    return this.replace(tenant, createDefaultTenantMembers(tenant, MOCK_USER_INFO, this.now()));
  }

  private recoverInvalidData(tenant: TenantInfo, raw: string): TenantMemberLoadResult {
    try {
      this.storage.setItem(invalidTenantMemberStorageKey(tenant.id, this.now()), raw);
    } catch (error) {
      throw new TenantMemberPersistenceError("组织成员数据备份失败，无法恢复默认成员", error);
    }
    return {
      members: this.persistDefault(tenant),
      recoveryNotice: "组织成员数据已损坏，已恢复默认成员。",
    };
  }
}

export const tenantMemberRepository = new LocalStorageTenantMemberRepository(window.localStorage);
