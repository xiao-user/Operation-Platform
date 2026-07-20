import { describe, expect, it } from "vitest";
import { ADMIN_ROLE_ID, STAFF_ROLE_ID } from "@/features/access-control/types";
import {
  createDefaultWorkbenchLayout,
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

  it("derives classic logical rows and valid height contracts from every template", () => {
    for (const template of workbenchTemplates) {
      const tenant: TenantInfo = {
        id: `tenant-${template.tenantType}-${template.profile}`,
        name: "高度策略测试租户",
        shortName: "测试租户",
        type: template.tenantType,
        enabled: true,
      };
      const layout = createDefaultWorkbenchLayout(
        { tenant, userId: "user-height", profile: template.profile },
        template,
      );
      expect(layout.items.every((item) => item.h === 1)).toBe(true);
      expect(new Set(layout.items.map((item) => item.y)).size).toBeGreaterThan(1);
      for (const item of layout.items) {
        const policy = workbenchWidgetRegistry.get(item.widgetKey)!.heightPolicy;
        expect(policy.minHeight).toBeLessThanOrEqual(policy.preferredHeight);
        expect(policy.preferredHeight).toBeLessThanOrEqual(policy.maxContentHeight);
      }
    }
  });

  it("keeps the existing catalog size outside the education bureau", () => {
    for (const tenantType of tenantTypes.filter((type) => type !== "bureau")) {
      const admin = getWorkbenchTemplate(tenantType, "admin");
      const business = getWorkbenchTemplate(tenantType, "business");

      expect(admin.widgets).toHaveLength(9);
      expect(business.widgets).toHaveLength(7);
      expect(admin.widgets.map((item) => item.widgetKey)).not.toEqual(
        business.widgets.map((item) => item.widgetKey),
      );
    }
  });

  it("adds portal and education resource widgets only to education bureau profiles", () => {
    const portalWidgetIds = [
      "user-overview",
      "quick-apps",
      "bureau-news",
      "information-disclosure",
      "teaching-app-ranking",
      "message-todo-center",
      "calendar-tasks",
      "personal-growth",
      "subscriptions",
      "announcements",
      "grade-applications",
      "application-types",
      "activity-rank",
      "resource-sharing",
      "resource-growth",
      "resource-contribution",
      "subject-resources",
      "resource-ranking",
    ];

    for (const profile of ["admin", "business"] as const) {
      const bureau = getWorkbenchTemplate("bureau", profile);
      expect(bureau.revision).toBe(6);
      expect(portalWidgetIds.every((id) =>
        bureau.widgets.some((item) => item.widgetKey === `bureau.${profile}.${id}`),
      )).toBe(true);
    }

    for (const tenantType of tenantTypes.filter((type) => type !== "bureau")) {
      for (const profile of ["admin", "business"] as const) {
        expect(getWorkbenchTemplate(tenantType, profile).widgets.some((item) =>
          portalWidgetIds.some((id) => item.widgetKey.endsWith(`.${id}`)),
        )).toBe(false);
      }
    }

    expect(getWorkbenchTemplate("bureau", "admin").widgets).toHaveLength(24);
    expect(getWorkbenchTemplate("bureau", "business").widgets).toHaveLength(21);

    const businessWidgets = getWorkbenchTemplate("bureau", "business").widgets;
    expect(businessWidgets.find((item) => item.widgetKey.endsWith(".calendar-tasks"))).toMatchObject({
      y: 4,
      h: 5,
    });
    expect(businessWidgets.find((item) => item.widgetKey.endsWith(".quick-apps"))).toMatchObject({
      y: 9,
    });
    expect(businessWidgets.find((item) => item.widgetKey.endsWith(".grade-applications"))).toMatchObject({
      y: 21,
    });
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

  it("provides structured interactive and chart data for bureau widgets", async () => {
    const source = new MockWorkbenchDataSource();
    const tenant: TenantInfo = {
      id: "bureau-001",
      name: "体验区教育局",
      shortName: "体验区教育局",
      type: "bureau",
      enabled: true,
    };
    const context = { tenant, userId: "user-a", profile: "business" as const };

    const results = await Promise.all([
      source.load(
        workbenchWidgetRegistry.get("bureau.business.teaching-app-ranking")!,
        { kind: "none" },
        context,
        [],
      ),
      source.load(
        workbenchWidgetRegistry.get("bureau.business.calendar-tasks")!,
        { kind: "none" },
        context,
        [],
      ),
      source.load(
        workbenchWidgetRegistry.get("bureau.business.personal-growth")!,
        { kind: "none" },
        context,
        [],
      ),
      source.load(
        workbenchWidgetRegistry.get("bureau.business.grade-applications")!,
        { kind: "none" },
        context,
        [],
      ),
      source.load(
        workbenchWidgetRegistry.get("bureau.business.resource-ranking")!,
        { kind: "none" },
        context,
        [],
      ),
      source.load(
        workbenchWidgetRegistry.get("bureau.business.user-overview")!,
        { kind: "none" },
        {
          ...context,
          userName: "罗吴航",
          userInitials: "罗",
          userAccount: "luowuhang@example.com",
          roleName: "教研员",
        },
        [],
      ),
    ]);

    expect(results.map((result) => result.kind)).toEqual([
      "ranking",
      "calendar",
      "growth",
      "education-chart",
      "ranking",
      "user-overview",
    ]);
    expect(results[5]).toMatchObject({
      kind: "user-overview",
      name: "罗吴航",
      account: "luowuhang@example.com",
      roleName: "教研员",
    });
    expect(results[0]).toMatchObject({ kind: "ranking", items: { length: 5 } });
    expect(results[1]).toMatchObject({ kind: "calendar", events: { length: 5 } });
    expect(results[2]).toMatchObject({ kind: "growth", score: "86" });
    expect(results[3]).toMatchObject({ kind: "education-chart", variant: "grade-applications" });
    expect(results[4]).toMatchObject({ kind: "ranking", mode: "resource", items: { length: 5 } });
  });
});
