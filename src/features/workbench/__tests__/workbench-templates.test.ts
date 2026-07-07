import { describe, expect, it } from "vitest";
import { ADMIN_ROLE_ID, STAFF_ROLE_ID } from "@/features/access-control/types";
import {
  resolveWorkbenchProfile,
  validateWorkbenchTemplate,
} from "@/features/workbench/workbench-layout";
import {
  getWorkbenchTemplate,
  workbenchTemplates,
  workbenchWidgetRegistry,
} from "@/features/workbench/workbench-templates";
import { MockWorkbenchDataSource } from "@/features/workbench/mock-workbench-data-source";
import type { TenantInfo, TenantType } from "@/types/user";

const tenantTypes: TenantType[] = ["school", "bureau", "org", "platform"];

describe("workbench templates", () => {
  it("defines all eight tenant type and profile combinations", () => {
    expect(workbenchTemplates).toHaveLength(8);

    for (const tenantType of tenantTypes) {
      expect(getWorkbenchTemplate(tenantType, "admin").tenantType).toBe(tenantType);
      expect(getWorkbenchTemplate(tenantType, "business").tenantType).toBe(tenantType);
    }
  });

  it("keeps every fixed catalog unique and its default geometry valid", () => {
    for (const template of workbenchTemplates) {
      const keys = template.widgets.map((item) => item.widgetKey);
      expect(new Set(keys).size).toBe(keys.length);
      expect(validateWorkbenchTemplate(template)).toBe(true);
      expect(keys.every((key) => workbenchWidgetRegistry.has(key))).toBe(true);
    }
  });

  it("uses a stable total per profile while allowing admin and business catalogs to differ", () => {
    for (const tenantType of tenantTypes) {
      const admin = getWorkbenchTemplate(tenantType, "admin");
      const business = getWorkbenchTemplate(tenantType, "business");

      expect(admin.widgets).toHaveLength(9);
      expect(business.widgets).toHaveLength(7);
      expect(admin.widgets.map((item) => item.widgetKey)).not.toEqual(
        business.widgets.map((item) => item.widgetKey),
      );
    }
  });

  it("maps only the built-in administrator to the admin profile", () => {
    expect(resolveWorkbenchProfile(ADMIN_ROLE_ID)).toBe("admin");
    expect(resolveWorkbenchProfile(STAFF_ROLE_ID)).toBe("business");
    expect(resolveWorkbenchProfile("custom-auditor")).toBe("business");
    expect(resolveWorkbenchProfile(null)).toBe("business");
  });

  it("uses the active tenant context when producing mock widget data", async () => {
    const source = new MockWorkbenchDataSource();
    const definition = workbenchWidgetRegistry.get("school.admin.student-count")!;
    const firstTenant: TenantInfo = {
      id: "school-001",
      name: "学校一",
      shortName: "学校一",
      type: "school",
      enabled: true,
    };
    const secondTenant: TenantInfo = { ...firstTenant, id: "school-002", name: "学校二" };
    const first = await source.load(
      definition,
      { kind: "none" },
      { tenant: firstTenant, userId: "user-a", profile: "admin" },
      [],
    );
    const second = await source.load(
      definition,
      { kind: "none" },
      { tenant: secondTenant, userId: "user-a", profile: "admin" },
      [],
    );

    expect(first.kind).toBe("metric");
    expect(second.kind).toBe("metric");
    if (first.kind === "metric" && second.kind === "metric") {
      expect(first.value).not.toBe(second.value);
    }
  });
});
