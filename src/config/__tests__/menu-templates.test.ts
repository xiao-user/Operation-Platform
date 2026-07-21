import { describe, expect, it } from "vitest";
import { DEVELOPING_PAGE_KEY, pageRegistryByKey } from "@/config/page-registry";
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

  it("uses the supplied school module structure", () => {
    expect(
      tenantMenuTemplates.school
        .filter((item) => item.type === "module")
        .map((item) => item.name),
    ).toEqual([
      "家校共育",
      "教育教学",
      "教育评价",
      "教育管理",
      "平安校园",
      "文化生活",
      "数据中心",
    ]);
    expect(tenantMenuTemplates.school.some((item) => item.name === "工作台")).toBe(false);
    expect(tenantMenuTemplates.bureau.some((item) => item.name === "工作台")).toBe(false);
    expect(
      tenantMenuTemplates.bureau
        .filter((item) => item.type === "module")
        .map((item) => item.name),
    ).toEqual([
      "基础平台",
      "协同办公",
      "教育管理",
      "公共服务",
      "AI精准教学",
      "AI教师发展",
      "AI教育治理",
      "智慧大脑",
    ]);
    expect(tenantMenuTemplates.org.filter((item) => item.type === "module")).toHaveLength(4);
    expect(tenantMenuTemplates.platform.filter((item) => item.type === "module")).toHaveLength(1);
  });

  it("preserves the education bureau common menu hierarchy", () => {
    const records = tenantMenuTemplates.bureau;
    const child = (parentId: string, name: string) =>
      records.find((record) => record.parentId === parentId && record.name === name)!;

    const publicService = records.find(
      (record) => record.parentId === null && record.name === "公共服务",
    )!;
    const schoolService = child(publicService.id, "学校服务");
    expect(child(schoolService.id, "课后管理")).toMatchObject({
      type: "page",
      pageKey: DEVELOPING_PAGE_KEY,
    });

    const aiGovernance = records.find(
      (record) => record.parentId === null && record.name === "AI教育治理",
    )!;
    const studentEvaluation = child(aiGovernance.id, "学生发展评价");
    expect(child(studentEvaluation.id, "学生成长画像")).toMatchObject({
      type: "page",
      pageKey: "bureau-student-growth-portrait",
    });
    const mentalHealth = child(aiGovernance.id, "学生心理健康管理");
    expect(child(mentalHealth.id, "心理健康档案")).toMatchObject({
      type: "page",
      pageKey: DEVELOPING_PAGE_KEY,
    });

    const smartBrain = records.find(
      (record) => record.parentId === null && record.name === "智慧大脑",
    )!;
    const cockpit = child(smartBrain.id, "数据驾驶舱");
    expect(child(cockpit.id, "区域教育总览")).toMatchObject({
      type: "page",
      pageKey: "bureau-regional-education-overview",
    });
  });

  it("preserves representative school menu hierarchy and flattens only beyond level four", () => {
    const records = tenantMenuTemplates.school;
    const child = (parentId: string, name: string) =>
      records.find((record) => record.parentId === parentId && record.name === name)!;

    const educationEvaluation = records.find(
      (record) => record.parentId === null && record.name === "教育评价",
    )!;
    const comprehensive = child(educationEvaluation.id, "综合评价");
    const classReview = child(comprehensive.id, "班级评比");
    expect(child(classReview.id, "班级点评")).toMatchObject({
      type: "page",
      pageKey: DEVELOPING_PAGE_KEY,
    });

    const educationManagement = records.find(
      (record) => record.parentId === null && record.name === "教育管理",
    )!;
    const campusOffice = child(educationManagement.id, "校园办公");
    const agendaManagement = child(campusOffice.id, "议题管理");
    expect(child(agendaManagement.id, "议题设置")).toMatchObject({ type: "page" });
    expect(child(agendaManagement.id, "会议设置")).toMatchObject({ type: "page" });
  });

  it("keeps the school template valid for the four-level editor", () => {
    const records = tenantMenuTemplates.school;
    const byId = new Map(records.map((record) => [record.id, record]));
    const levelOf = (recordId: string) => {
      let level = 1;
      let current = byId.get(recordId);
      while (current?.parentId) {
        level += 1;
        current = byId.get(current.parentId);
      }
      return level;
    };
    const siblingNames = new Set<string>();

    for (const record of records) {
      expect(levelOf(record.id)).toBeLessThanOrEqual(4);
      const siblingKey = `${record.parentId ?? "root"}:${record.name}`;
      expect(siblingNames.has(siblingKey)).toBe(false);
      siblingNames.add(siblingKey);
    }
  });

  it("binds menu configuration to the operation platform template", () => {
    expect(tenantMenuTemplates.platform).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "page", name: "组织管理", pageKey: "system-organization-management" }),
        expect.objectContaining({ type: "page", name: "角色管理", pageKey: "system-role-management" }),
        expect.objectContaining({ type: "page", name: "菜单配置", pageKey: "system-menu-config" }),
      ]),
    );
    expect(tenantMenuTemplates.platform.some((item) => item.name === "权限管理")).toBe(false);
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
