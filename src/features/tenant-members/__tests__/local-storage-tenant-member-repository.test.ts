import { beforeEach, describe, expect, it } from "vitest";
import { ADMIN_ROLE_ID, STAFF_ROLE_ID } from "@/features/access-control/types";
import {
  LocalStorageTenantMemberRepository,
  TenantMemberPersistenceError,
  createCurrentUserAdminMember,
  tenantMemberStorageKey,
} from "@/features/tenant-members/local-storage-tenant-member-repository";
import { MOCK_TENANTS, MOCK_USER_INFO } from "@/config/mock";
import type { TenantInfo, UserInfo } from "@/types/user";

const school: TenantInfo = {
  id: "school-members",
  name: "成员测试学校",
  shortName: "成员学校",
  type: "school",
  enabled: true,
};

const user: UserInfo = {
  id: "user-current",
  name: "当前用户",
  initials: "当前",
  platformAdmin: false,
  tenantRoleIds: {
    [school.id]: STAFF_ROLE_ID,
  },
};

describe("LocalStorageTenantMemberRepository", () => {
  beforeEach(() => localStorage.clear());

  it("initializes tenant members from the mock role mapping", () => {
    const repository = new LocalStorageTenantMemberRepository(localStorage, () => 1000);
    const mockSchool = MOCK_TENANTS.find((tenant) => tenant.id === "school-002")!;

    const result = repository.list(mockSchool);

    expect(result.members).toHaveLength(1);
    expect(result.members[0]).toMatchObject({
      tenantId: "school-002",
      userId: MOCK_USER_INFO.id,
      roleIds: [STAFF_ROLE_ID],
      enabled: true,
    });
    expect(localStorage.getItem(tenantMemberStorageKey(mockSchool.id))).not.toBeNull();
  });

  it("persists explicit member replacements", () => {
    const repository = new LocalStorageTenantMemberRepository(localStorage, () => 1000);
    const members = repository.replace(school, [
      createCurrentUserAdminMember(school, user, 1000),
    ]);

    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({
      tenantId: school.id,
      userId: user.id,
      roleIds: [ADMIN_ROLE_ID],
    });
    expect(localStorage.getItem(tenantMemberStorageKey(school.id))).not.toBeNull();
  });

  it("keeps members isolated by tenant and returns defensive copies", () => {
    const repository = new LocalStorageTenantMemberRepository(localStorage, () => 1000);
    const members = repository.replace(school, [
      createCurrentUserAdminMember(school, user, 1000),
    ]);
    members[0]!.roleIds.push("mutated");

    expect(repository.list(school).members[0]!.roleIds).toEqual([ADMIN_ROLE_ID]);
    expect(repository.list({ ...school, id: "other-school" }).members).toEqual([]);
  });

  it("rejects duplicate accounts", () => {
    const repository = new LocalStorageTenantMemberRepository(localStorage, () => 1000);
    const first = createCurrentUserAdminMember(school, user, 1000);

    expect(() =>
      repository.replace(school, [
        first,
        { ...first, id: "member-2", userId: "user-2" },
      ]),
    ).toThrow(TenantMemberPersistenceError);
  });

  it("backs up invalid data before recovering defaults", () => {
    const repository = new LocalStorageTenantMemberRepository(localStorage, () => 1000);
    localStorage.setItem(tenantMemberStorageKey(school.id), "{broken");

    const result = repository.list(school);

    expect(result.recoveryNotice).toContain("组织成员数据已损坏");
    expect(localStorage.getItem(`operation-platform:tenant-members:invalid:${school.id}:1000`)).toBe("{broken");
  });

  it("does not recover invalid data when the backup write fails", () => {
    localStorage.setItem(tenantMemberStorageKey(school.id), "{broken");
    const storage = new Proxy(localStorage, {
      get(target, property) {
        if (property === "setItem") {
          return (key: string, value: string) => {
            if (key.includes(":invalid:")) throw new DOMException("quota exceeded");
            target.setItem(key, value);
          };
        }
        const value = Reflect.get(target, property);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const repository = new LocalStorageTenantMemberRepository(storage, () => 1000);

    expect(() => repository.list(school)).toThrow(TenantMemberPersistenceError);
    expect(localStorage.getItem(tenantMemberStorageKey(school.id))).toBe("{broken");
  });
});
