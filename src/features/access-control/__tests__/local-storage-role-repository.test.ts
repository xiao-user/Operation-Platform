import { beforeEach, describe, expect, it } from "vitest";
import { cloneTenantTemplate } from "@/config/menu-templates";
import {
  LocalStorageTenantRoleRepository,
  RolePersistenceError,
  tenantRoleStorageKey,
} from "@/features/access-control/local-storage-role-repository";
import { ADMIN_ROLE_ID, STAFF_ROLE_ID, type RoleRecord } from "@/features/access-control/types";
import type { TenantInfo } from "@/types/user";

const school: TenantInfo = {
  id: "school-a",
  name: "学校 A",
  shortName: "学校 A",
  type: "school",
};

describe("LocalStorageTenantRoleRepository", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("initializes built-in roles per tenant with visible page menus", () => {
    const records = cloneTenantTemplate(school);
    const repository = new LocalStorageTenantRoleRepository(localStorage, () => 1000);
    const visibleLeafIds = records
      .filter((record) => record.visible && (record.type === "page" || record.type === "external"))
      .map((record) => record.id);

    const result = repository.list(school, records);

    expect(result.roles.map((role) => role.id)).toEqual([ADMIN_ROLE_ID, STAFF_ROLE_ID]);
    expect(result.roles.find((role) => role.id === STAFF_ROLE_ID)?.name).toBe("老师");
    expect(result.roles.find((role) => role.id === ADMIN_ROLE_ID)?.menuIds).toEqual(visibleLeafIds);
    expect(localStorage.getItem(tenantRoleStorageKey(school.id))).not.toBeNull();
  });

  it("persists custom roles independently from built-in roles", () => {
    const records = cloneTenantTemplate(school);
    const repository = new LocalStorageTenantRoleRepository(localStorage, () => 1000);
    const roles = repository.list(school, records).roles;
    const customRole: RoleRecord = {
      id: "role-grade-leader",
      tenantId: school.id,
      name: "年级组长",
      description: "负责年级管理",
      builtIn: false,
      enabled: true,
      sort: 30,
      menuIds: [records.find((record) => record.type === "page")!.id],
    };

    repository.replace(school, [...roles, customRole]);

    expect(repository.list(school, records).roles).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "role-grade-leader", name: "年级组长" })]),
    );
  });

  it("backs up invalid role data and restores the default role template", () => {
    const records = cloneTenantTemplate(school);
    const repository = new LocalStorageTenantRoleRepository(localStorage, () => 1000);
    localStorage.setItem(tenantRoleStorageKey(school.id), "[]");

    const result = repository.list(school, records);

    expect(result.recoveryNotice).toContain("角色权限数据已损坏");
    expect(result.roles.map((role) => role.id)).toEqual([ADMIN_ROLE_ID, STAFF_ROLE_ID]);
    expect(localStorage.getItem(`operation-platform:tenant-roles:invalid:${school.id}:1000`)).toBe("[]");
  });

  it("does not reset invalid roles when the backup write fails", () => {
    const records = cloneTenantTemplate(school);
    localStorage.setItem(tenantRoleStorageKey(school.id), "[]");
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
    const repository = new LocalStorageTenantRoleRepository(storage, () => 1000);

    expect(() => repository.list(school, records)).toThrow(RolePersistenceError);
    expect(localStorage.getItem(tenantRoleStorageKey(school.id))).toBe("[]");
  });
});
