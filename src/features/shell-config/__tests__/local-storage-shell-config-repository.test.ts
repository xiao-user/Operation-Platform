import { beforeEach, describe, expect, it } from "vitest";
import {
  defaultTenantShellConfig,
  LocalStorageTenantShellConfigRepository,
  tenantShellConfigStorageKey,
} from "@/features/shell-config/local-storage-shell-config-repository";
import type { TenantInfo } from "@/types/user";

const school: TenantInfo = {
  id: "school-a",
  name: "学校 A",
  shortName: "学校 A",
  type: "school",
};

describe("local storage shell config repository", () => {
  beforeEach(() => localStorage.clear());

  it("persists the default workbench config for a new tenant", () => {
    const repository = new LocalStorageTenantShellConfigRepository(localStorage);

    const result = repository.list(school);

    expect(result.config).toEqual(defaultTenantShellConfig());
    expect(JSON.parse(localStorage.getItem(tenantShellConfigStorageKey(school.id))!)).toEqual(
      defaultTenantShellConfig(),
    );
  });

  it("keeps shell config isolated by tenant", () => {
    const repository = new LocalStorageTenantShellConfigRepository(localStorage);
    repository.replace(school, {
      version: 1,
      workbench: { enabled: false, label: "首页", sort: 20 },
    });

    expect(repository.list(school).config.workbench).toEqual({
      enabled: false,
      label: "首页",
      sort: 20,
    });
    expect(repository.list({ ...school, id: "school-b" }).config.workbench.enabled).toBe(true);
  });

  it("backs up invalid config and restores defaults", () => {
    const repository = new LocalStorageTenantShellConfigRepository(localStorage, () => 123);
    localStorage.setItem(tenantShellConfigStorageKey(school.id), "{broken");

    const result = repository.list(school);

    expect(result.config).toEqual(defaultTenantShellConfig());
    expect(result.recoveryNotice).toBe("检测到无效系统入口配置，已恢复默认配置");
    expect(localStorage.getItem(`operation-platform:tenant-shell:invalid:${school.id}:123`)).toBe(
      "{broken",
    );
  });
});

