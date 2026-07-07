import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { ADMIN_ROLE_ID, STAFF_ROLE_ID } from "@/features/access-control/types";
import { activeRoleStorageKey } from "@/features/access-control/local-storage-active-role-repository";
import {
  createDefaultTenantConfiguration,
  tenantConfigurationRepository,
} from "@/features/tenant-config/local-storage-tenant-configuration-repository";
import {
  createCurrentUserAdminMember,
  tenantMemberRepository,
} from "@/features/tenant-members/local-storage-tenant-member-repository";
import { useAccessControlStore } from "@/stores/access-control";
import { useTenantMemberStore } from "@/stores/tenant-members";
import { useUserStore } from "@/stores/user";
import type { TenantInfo } from "@/types/user";

const school: TenantInfo = {
  id: "school-member-store",
  name: "成员 Store 学校",
  shortName: "成员学校",
  type: "school",
  enabled: true,
};

describe("tenant member store", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("creates members with multiple roles and updates the current user role source", () => {
    const userStore = useUserStore();
    userStore.replaceTenants([school, ...userStore.tenantList]);
    tenantMemberRepository.replace(school, []);
    const store = useTenantMemberStore();
    store.load(school);

    store.createMember({
      name: userStore.userInfo.name,
      account: "current-account",
      phone: "",
      title: "复合岗位",
      enabled: true,
      roleIds: [STAFF_ROLE_ID, ADMIN_ROLE_ID],
    });
    const member = store.members.find((item) => item.account === "current-account")!;
    member.userId = userStore.userInfo.id;
    tenantMemberRepository.replace(school, store.members);
    userStore.refreshMemberRoles();
    userStore.switchTenant(school.id);

    expect(userStore.roleIdsForTenant(school.id)).toEqual([STAFF_ROLE_ID, ADMIN_ROLE_ID]);
    expect(userStore.role).toBe(ADMIN_ROLE_ID);
    expect(userStore.isAdmin).toBe(true);

    userStore.setActiveRoleForTenant(school.id, STAFF_ROLE_ID);

    expect(userStore.role).toBe(STAFF_ROLE_ID);
    expect(userStore.isAdmin).toBe(false);
    expect(
      localStorage.getItem(
        activeRoleStorageKey({ tenantId: school.id, userId: userStore.userInfo.id }),
      ),
    ).toBe(STAFF_ROLE_ID);
  });

  it("falls back when the stored active role is no longer effective", () => {
    const userStore = useUserStore();
    userStore.replaceTenants([school, ...userStore.tenantList]);
    tenantMemberRepository.replace(school, [
      {
        ...createCurrentUserAdminMember(school, userStore.userInfo),
        roleIds: [ADMIN_ROLE_ID, STAFF_ROLE_ID],
      },
    ]);
    userStore.switchTenant(school.id);
    userStore.setActiveRoleForTenant(school.id, STAFF_ROLE_ID);
    const configuration = createDefaultTenantConfiguration(school);
    tenantConfigurationRepository.replace(school, {
      ...configuration,
      roles: configuration.roles.map((role) =>
        role.id === STAFF_ROLE_ID ? { ...role, enabled: false } : role,
      ),
    });

    userStore.refreshMemberRoles();

    expect(userStore.roleIdsForTenant(school.id)).toEqual([ADMIN_ROLE_ID]);
    expect(userStore.role).toBe(ADMIN_ROLE_ID);
  });

  it("protects the last enabled admin member", () => {
    const store = useTenantMemberStore();
    tenantMemberRepository.replace(school, [
      createCurrentUserAdminMember(school, useUserStore().userInfo),
    ]);
    store.load(school);
    const admin = store.members.find((member) => member.roleIds.includes(ADMIN_ROLE_ID))!;

    expect(() => store.setMemberEnabled(admin.id, false)).toThrow("至少保留一个启用管理员成员");
    expect(() => store.removeMember(admin.id)).toThrow("至少保留一个启用管理员成员");
    expect(() =>
      store.updateMember(admin.id, {
        name: admin.name,
        account: admin.account,
        phone: admin.phone,
        title: admin.title,
        enabled: true,
        roleIds: [STAFF_ROLE_ID],
      }),
    ).toThrow("至少保留一个启用管理员成员");
  });
});

describe("role references from members", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("blocks disabling or deleting a role used by enabled members", () => {
    const configuration = createDefaultTenantConfiguration(school);
    const customRole = {
      ...configuration.roles[1]!,
      id: "role-auditor",
      name: "审核员",
      builtIn: false,
      sort: 30,
    };
    tenantConfigurationRepository.replace(school, {
      ...configuration,
      roles: [...configuration.roles, customRole],
    });
    tenantMemberRepository.replace(school, [
      createCurrentUserAdminMember(school, useUserStore().userInfo),
    ]);
    const memberStore = useTenantMemberStore();
    memberStore.load(school);
    memberStore.createMember({
      name: "审核成员",
      account: "auditor",
      phone: "",
      title: "审核员",
      enabled: true,
      roleIds: [customRole.id],
    });

    const accessStore = useAccessControlStore();
    accessStore.load(school);

    expect(() => accessStore.setRoleEnabled(customRole.id, false)).toThrow("已有启用成员使用该角色");
    expect(() => accessStore.removeRole(customRole.id)).toThrow("已有启用成员使用该角色");
    expect(() => accessStore.resetRoles()).toThrow("已有启用成员使用自定义角色");
    expect(accessStore.memberCountForRole(customRole.id)).toBe(1);
  });
});
