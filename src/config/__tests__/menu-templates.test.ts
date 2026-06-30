import { describe, expect, it } from "vitest";
import { pageRegistryByKey } from "@/config/page-registry";
import {
  cloneTenantTemplate,
  tenantMenuTemplates,
} from "@/config/menu-templates";
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

describe("tenant menu templates", () => {
  it("contains templates for every tenant type", () => {
    expect(Object.keys(tenantMenuTemplates)).toEqual(["school", "bureau", "org", "platform"]);
  });

  it("preserves the current top-level module counts", () => {
    expect(tenantMenuTemplates.school.filter((item) => item.type === "module")).toHaveLength(9);
    expect(tenantMenuTemplates.bureau.filter((item) => item.type === "module")).toHaveLength(3);
    expect(tenantMenuTemplates.org.filter((item) => item.type === "module")).toHaveLength(4);
    expect(tenantMenuTemplates.platform.filter((item) => item.type === "module")).toHaveLength(1);
  });

  it("binds menu configuration to the operation platform template", () => {
    expect(tenantMenuTemplates.platform).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "page", name: "菜单配置", pageKey: "system-menu-config" }),
      ]),
    );
  });

  it("references only registered pages", () => {
    const pageKeys = Object.values(tenantMenuTemplates)
      .flat()
      .flatMap((item) => (item.pageKey ? [item.pageKey] : []));

    expect(pageKeys.every((key) => pageRegistryByKey.has(key))).toBe(true);
  });

  it("clones templates into isolated tenant-owned records", () => {
    const first = cloneTenantTemplate(schoolA);
    const second = cloneTenantTemplate(schoolB);

    expect(first.every((item) => item.tenantId === schoolA.id)).toBe(true);
    expect(second.every((item) => item.tenantId === schoolB.id)).toBe(true);
    expect(new Set(first.map((item) => item.id))).not.toEqual(new Set(second.map((item) => item.id)));
    expect(first.every((item) => item.parentId === null || first.some((parent) => parent.id === item.parentId))).toBe(true);
  });
});
