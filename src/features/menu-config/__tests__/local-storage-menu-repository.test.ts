import { beforeEach, describe, expect, it } from "vitest";
import {
  LocalStorageTenantMenuRepository,
  MenuPersistenceError,
  tenantMenuStorageKey,
} from "@/features/menu-config/local-storage-menu-repository";
import type { TenantInfo } from "@/types/user";

const schoolA: TenantInfo = {
  id: "school-a",
  name: "学校 A",
  shortName: "学校 A",
  type: "school",
};
const schoolB: TenantInfo = {
  id: "school-b",
  name: "学校 B",
  shortName: "学校 B",
  type: "school",
};
const platform: TenantInfo = {
  id: "platform-a",
  name: "运营平台",
  shortName: "运营平台",
  type: "platform",
};

describe("LocalStorageTenantMenuRepository", () => {
  beforeEach(() => localStorage.clear());

  it("initializes missing tenant data from its type template", () => {
    const repository = new LocalStorageTenantMenuRepository(localStorage);

    const result = repository.list(schoolA);

    expect(result.records.length).toBeGreaterThan(0);
    expect(result.records.every((record) => record.tenantId === schoolA.id)).toBe(true);
    expect(result.recoveryNotice).toBeNull();
    expect(JSON.parse(localStorage.getItem(tenantMenuStorageKey(schoolA.id))!)).toMatchObject({
      version: 1,
    });
  });

  it("isolates records for tenants of the same type", () => {
    const repository = new LocalStorageTenantMenuRepository(localStorage);
    const first = repository.list(schoolA).records;
    repository.list(schoolB);

    first[0]!.name = "学校 A 专属菜单";
    repository.replace(schoolA, first);

    expect(repository.list(schoolA).records[0]?.name).toBe("学校 A 专属菜单");
    expect(repository.list(schoolB).records[0]?.name).not.toBe("学校 A 专属菜单");
  });

  it("returns defensive copies", () => {
    const repository = new LocalStorageTenantMenuRepository(localStorage);
    const first = repository.list(schoolA).records;
    first[0]!.name = "未保存修改";

    expect(repository.list(schoolA).records[0]?.name).not.toBe("未保存修改");
  });

  it("resets one tenant to a fresh template", () => {
    const repository = new LocalStorageTenantMenuRepository(localStorage);
    const edited = repository.list(schoolA).records;
    edited[0]!.name = "自定义名称";
    repository.replace(schoolA, edited);

    const resetRecords = repository.reset(schoolA);

    expect(resetRecords[0]?.name).not.toBe("自定义名称");
    expect(repository.list(schoolA).records).toEqual(resetRecords);
  });

  it("backs up invalid JSON and restores the template", () => {
    localStorage.setItem(tenantMenuStorageKey(schoolA.id), "{broken");
    const repository = new LocalStorageTenantMenuRepository(localStorage, () => 12345);

    const result = repository.list(schoolA);

    expect(result.recoveryNotice).toContain("已恢复默认菜单");
    expect(
      localStorage.getItem(`operation-platform:tenant-menu:invalid:${schoolA.id}:12345`),
    ).toBe("{broken");
    expect(result.records.every((record) => record.tenantId === schoolA.id)).toBe(true);
  });

  it("backs up unsupported schema versions", () => {
    const raw = JSON.stringify({ version: 99, records: [] });
    localStorage.setItem(tenantMenuStorageKey(schoolA.id), raw);
    const repository = new LocalStorageTenantMenuRepository(localStorage, () => 99);

    expect(repository.list(schoolA).recoveryNotice).toContain("已恢复默认菜单");
    expect(localStorage.getItem(`operation-platform:tenant-menu:invalid:${schoolA.id}:99`)).toBe(raw);
  });

  it("migrates cached platform menus with newly required system management pages", () => {
    localStorage.setItem(
      tenantMenuStorageKey(platform.id),
      JSON.stringify({
        version: 1,
        records: [
          {
            id: "platform-system",
            tenantId: platform.id,
            parentId: null,
            type: "module",
            name: "系统管理",
            icon: "setting",
            pageKey: null,
            externalUrl: null,
            externalOpenMode: null,
            sort: 10,
            visible: true,
          },
          {
            id: "platform-menu-config",
            tenantId: platform.id,
            parentId: "platform-system",
            type: "page",
            name: "菜单配置",
            icon: "setting",
            pageKey: "system-menu-config",
            externalUrl: null,
            externalOpenMode: null,
            sort: 10,
            visible: true,
          },
        ],
      }),
    );
    const repository = new LocalStorageTenantMenuRepository(localStorage);

    const result = repository.list(platform);

    expect(result.records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ pageKey: "system-organization-management" }),
        expect.objectContaining({ pageKey: "system-role-management" }),
        expect.objectContaining({ pageKey: "system-menu-config" }),
      ]),
    );
  });

  it("throws a typed error when persistence fails", () => {
    const storage: Storage = {
      length: 0,
      clear() {},
      getItem() {
        return null;
      },
      key() {
        return null;
      },
      removeItem() {},
      setItem() {
        throw new DOMException("quota", "QuotaExceededError");
      },
    };
    const repository = new LocalStorageTenantMenuRepository(storage);

    expect(() => repository.list(schoolA)).toThrow(MenuPersistenceError);
  });
});
