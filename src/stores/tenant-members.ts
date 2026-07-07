import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { ADMIN_ROLE_ID, type RoleRecord } from "@/features/access-control/types";
import {
  cloneTenantMember,
  tenantMemberRepository,
} from "@/features/tenant-members/local-storage-tenant-member-repository";
import type {
  TenantMemberInput,
  TenantMemberRecord,
} from "@/features/tenant-members/types";
import { tenantConfigurationRepository } from "@/features/tenant-config/local-storage-tenant-configuration-repository";
import { useNavigationStore } from "@/stores/navigation";
import { useUserStore } from "@/stores/user";
import type { TenantInfo } from "@/types/user";

function sortRoles(roles: readonly RoleRecord[]) {
  return [...roles].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "zh-CN"));
}

function initialsForName(name: string) {
  const chars = Array.from(name.trim());
  return chars.slice(Math.max(0, chars.length - 2)).join("") || "成员";
}

function uniqueRoleIds(roleIds: readonly string[]) {
  return Array.from(new Set(roleIds.map((roleId) => roleId.trim()).filter(Boolean)));
}

function enabledAdminMemberCount(members: readonly TenantMemberRecord[]) {
  return members.filter(
    (member) => member.enabled && member.roleIds.includes(ADMIN_ROLE_ID),
  ).length;
}

function memberUsesRole(member: TenantMemberRecord, roleId: string) {
  return member.roleIds.includes(roleId);
}

export const useTenantMemberStore = defineStore("tenant-members", () => {
  const selectedTenant = ref<TenantInfo | null>(null);
  const members = ref<TenantMemberRecord[]>([]);
  const roles = ref<RoleRecord[]>([]);
  const recoveryNotice = ref<string | null>(null);

  const roleOptions = computed(() => sortRoles(roles.value));
  const enabledRoleIds = computed(
    () => new Set(roles.value.filter((role) => role.enabled).map((role) => role.id)),
  );
  const roleNameById = computed(
    () => new Map(roles.value.map((role) => [role.id, role.name])),
  );

  function requireTenant() {
    if (!selectedTenant.value) throw new Error("请先选择组织");
    return selectedTenant.value;
  }

  function load(tenant: TenantInfo) {
    const configurationResult = tenantConfigurationRepository.list(tenant);
    const memberResult = tenantMemberRepository.list(tenant);
    selectedTenant.value = { ...tenant };
    roles.value = configurationResult.configuration.roles;
    members.value = memberResult.members;
    recoveryNotice.value = [
      configurationResult.recoveryNotice,
      memberResult.recoveryNotice,
    ].filter(Boolean).join("；") || null;
  }

  function refreshRuntimeIfCurrent(tenant: TenantInfo) {
    const userStore = useUserStore();
    userStore.refreshMemberRoles();
    if (userStore.currentTenant.id === tenant.id) {
      useNavigationStore().loadTenant(tenant);
    }
  }

  function assertEnabledRole(input: TenantMemberInput) {
    if (!input.enabled) return;
    const hasEnabledRole = uniqueRoleIds(input.roleIds).some((roleId) =>
      enabledRoleIds.value.has(roleId),
    );
    if (!hasEnabledRole) throw new Error("启用成员至少需要一个启用角色");
  }

  function assertAccountUnique(account: string, memberId?: string) {
    const normalized = account.trim().toLowerCase();
    if (
      members.value.some(
        (member) => member.id !== memberId && member.account.trim().toLowerCase() === normalized,
      )
    ) {
      throw new Error("成员账号不能重复");
    }
  }

  function assertAdminSafety(nextMembers: readonly TenantMemberRecord[]) {
    if (enabledAdminMemberCount(nextMembers) <= 0) {
      throw new Error("至少保留一个启用管理员成员");
    }
  }

  function normalizeInput(input: TenantMemberInput) {
    const name = input.name.trim();
    const account = input.account.trim();
    if (!name) throw new Error("请输入成员姓名");
    if (!account) throw new Error("请输入成员账号");
    const roleIds = uniqueRoleIds(input.roleIds);
    if (!roleIds.length) throw new Error("请至少选择一个角色");
    const normalized: TenantMemberInput = {
      name,
      account,
      phone: input.phone.trim(),
      title: input.title.trim(),
      enabled: input.enabled,
      roleIds,
    };
    assertEnabledRole(normalized);
    return normalized;
  }

  function persist(nextMembers: TenantMemberRecord[]) {
    const tenant = requireTenant();
    assertAdminSafety(nextMembers);
    members.value = tenantMemberRepository.replace(tenant, nextMembers);
    recoveryNotice.value = null;
    refreshRuntimeIfCurrent(tenant);
    return members.value.map(cloneTenantMember);
  }

  function createMember(input: TenantMemberInput) {
    const tenant = requireTenant();
    const normalized = normalizeInput(input);
    assertAccountUnique(normalized.account);
    const now = Date.now();
    const member: TenantMemberRecord = {
      id: `member-${crypto.randomUUID()}`,
      tenantId: tenant.id,
      userId: `user-${crypto.randomUUID()}`,
      name: normalized.name,
      initials: initialsForName(normalized.name),
      account: normalized.account,
      phone: normalized.phone,
      title: normalized.title,
      enabled: normalized.enabled,
      roleIds: normalized.roleIds,
      createdAt: now,
      updatedAt: now,
    };
    persist([...members.value, member]);
    return cloneTenantMember(member);
  }

  function updateMember(memberId: string, input: TenantMemberInput) {
    const existing = members.value.find((member) => member.id === memberId);
    if (!existing) throw new Error("成员不存在或已被删除");
    const normalized = normalizeInput(input);
    assertAccountUnique(normalized.account, memberId);
    const nextMembers = members.value.map((member) =>
      member.id === memberId
        ? {
            ...member,
            name: normalized.name,
            initials: initialsForName(normalized.name),
            account: normalized.account,
            phone: normalized.phone,
            title: normalized.title,
            enabled: normalized.enabled,
            roleIds: normalized.roleIds,
            updatedAt: Date.now(),
          }
        : member,
    );
    persist(nextMembers);
  }

  function setMemberEnabled(memberId: string, enabled: boolean) {
    const existing = members.value.find((member) => member.id === memberId);
    if (!existing) return;
    updateMember(memberId, {
      name: existing.name,
      account: existing.account,
      phone: existing.phone,
      title: existing.title,
      enabled,
      roleIds: existing.roleIds,
    });
  }

  function removeMember(memberId: string) {
    if (!members.value.some((member) => member.id === memberId)) return;
    persist(members.value.filter((member) => member.id !== memberId));
  }

  function roleLabel(roleId: string) {
    return roleNameById.value.get(roleId) ?? "已删除角色";
  }

  function memberRoleLabels(member: TenantMemberRecord) {
    return member.roleIds.map(roleLabel);
  }

  function memberCountForRole(roleId: string, enabledOnly = false) {
    return members.value.filter(
      (member) => (!enabledOnly || member.enabled) && memberUsesRole(member, roleId),
    ).length;
  }

  return {
    selectedTenant,
    members,
    roles,
    roleOptions,
    recoveryNotice,
    load,
    createMember,
    updateMember,
    setMemberEnabled,
    removeMember,
    roleLabel,
    memberRoleLabels,
    memberCountForRole,
  };
});
