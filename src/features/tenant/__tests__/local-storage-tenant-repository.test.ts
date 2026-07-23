import { beforeEach, describe, expect, it } from "vitest";
import { MOCK_TENANTS } from "@/config/mock";
import {
  LocalStorageTenantRepository,
  TenantPersistenceError,
  tenantStorageKey,
} from "@/features/tenant/local-storage-tenant-repository";
import type { TenantInfo } from "@/types/user";

describe("LocalStorageTenantRepository", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("initializes persisted tenants from the current mock tenant list", () => {
    const repository = new LocalStorageTenantRepository(localStorage, () => 1000);

    const result = repository.list();

    expect(result.recoveryNotice).toBeNull();
    expect(result.tenants).toHaveLength(MOCK_TENANTS.length);
    expect(result.tenants.some((tenant) => tenant.type === "platform" && tenant.enabled)).toBe(true);
    expect(localStorage.getItem(tenantStorageKey)).not.toBeNull();
  });

  it("persists tenant create and update records", () => {
    const repository = new LocalStorageTenantRepository(localStorage, () => 1000);
    const tenants = repository.list().tenants;
    const customTenant: TenantInfo = {
      id: "org-custom",
      name: "自定义机构",
      shortName: "自定义",
      type: "org",
      enabled: false,
      administrativeRegion: {
        code: "360000",
        name: "江西省",
        scope: "province",
        path: [{ code: "360000", name: "江西省", scope: "province" }],
      },
    };

    repository.replace([...tenants, customTenant]);

    expect(repository.list().tenants).toEqual(
      expect.arrayContaining([expect.objectContaining(customTenant)]),
    );
    expect(repository.list().tenants.find((tenant) => tenant.id === customTenant.id)?.administrativeRegion)
      .toEqual(customTenant.administrativeRegion);
  });

  it("migrates legacy non-platform tenants to the Guangdong map root", () => {
    const legacyTenants = MOCK_TENANTS.map(({ administrativeRegion: _region, ...tenant }) => tenant);
    localStorage.setItem(tenantStorageKey, JSON.stringify(legacyTenants));
    const repository = new LocalStorageTenantRepository(localStorage, () => 1000);

    const result = repository.list();

    expect(result.recoveryNotice).toBeNull();
    expect(result.tenants.filter((tenant) => tenant.type !== "platform").every(
      (tenant) => tenant.administrativeRegion?.code === "440000",
    )).toBe(true);
    expect(result.tenants.find((tenant) => tenant.type === "platform")?.administrativeRegion)
      .toBeUndefined();
  });

  it("backs up invalid data and recovers to default tenants", () => {
    const repository = new LocalStorageTenantRepository(localStorage, () => 1000);
    localStorage.setItem(tenantStorageKey, "{bad json");

    const result = repository.list();

    expect(result.recoveryNotice).toContain("组织数据已损坏");
    expect(result.tenants).toHaveLength(MOCK_TENANTS.length);
    expect(localStorage.getItem("operation-platform:tenants:invalid:1000")).toBe("{bad json");
  });

  it("does not overwrite invalid data when the backup cannot be persisted", () => {
    localStorage.setItem(tenantStorageKey, "{bad json");
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
    const repository = new LocalStorageTenantRepository(storage, () => 1000);

    expect(() => repository.list()).toThrow(TenantPersistenceError);
    expect(localStorage.getItem(tenantStorageKey)).toBe("{bad json");
  });

  it("rejects duplicate organization names", () => {
    const repository = new LocalStorageTenantRepository(localStorage, () => 1000);
    const tenants = repository.list().tenants;

    expect(() => repository.replace([
      ...tenants,
      {
        ...tenants[0]!,
        id: "duplicate-name",
      },
    ])).toThrow("Invalid tenant records");
  });
});
