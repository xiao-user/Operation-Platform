import { MOCK_USER_INFO } from "@/config/mock";
import { ADMIN_ROLE_ID } from "@/features/access-control/types";
import type { TenantMemberRecord } from "@/features/tenant-members/types";
import type { TenantInfo, UserInfo } from "@/types/user";

function initialsForName(name: string) {
  const chars = Array.from(name.trim());
  return chars.slice(Math.max(0, chars.length - 2)).join("") || "成员";
}

function roleTitle(roleIds: readonly string[], tenant: TenantInfo) {
  if (roleIds.includes(ADMIN_ROLE_ID)) return "组织管理员";
  return tenant.type === "school" ? "老师" : "职员";
}

export function cloneTenantMember(member: TenantMemberRecord): TenantMemberRecord {
  return { ...member, roleIds: [...member.roleIds] };
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
    account: user.email?.trim().toLowerCase() || user.id,
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
      account: user.email?.trim().toLowerCase() || user.id,
      phone: "",
      title: roleTitle(roleIds, tenant),
      enabled: true,
      roleIds,
      createdAt: now,
      updatedAt: now,
    },
  ];
}
