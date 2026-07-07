import type {
  WorkbenchDataContext,
  WorkbenchDataSource,
  WorkbenchDistributionItemData,
  WorkbenchListItemData,
  WorkbenchMetricData,
  WorkbenchQuickLinkData,
  WorkbenchWidgetData,
  WorkbenchWidgetDefinition,
  WorkbenchWidgetSettings,
} from "@/features/workbench/types";

const metricValues: Record<string, Omit<WorkbenchMetricData, "kind">> = {
  "school.admin.student-count": { value: "2,486", trend: "本学期新增 128 人", trendTone: "up" },
  "school.admin.arrival-rate": { value: "97.6%", trend: "较昨日 +0.8%", trendTone: "up" },
  "school.admin.pending-approvals": { value: "18", trend: "其中 5 项较紧急", trendTone: "neutral" },
  "school.admin.device-online-rate": { value: "98.2%", trend: "12 台设备需巡检", trendTone: "neutral" },
  "school.business.today-courses": { value: "5", trend: "下一节 10:20", trendTone: "neutral" },
  "school.business.pending-tasks": { value: "7", trend: "2 项今天到期", trendTone: "neutral" },
  "school.business.class-attendance": { value: "98.1%", trend: "48 人已到校", trendTone: "up" },
  "bureau.admin.school-count": { value: "36", trend: "全部正常接入", trendTone: "up" },
  "bureau.admin.org-count": { value: "82", trend: "本月新增 4 家", trendTone: "up" },
  "bureau.admin.signup-count": { value: "12,680", trend: "较上期 +12.4%", trendTone: "up" },
  "bureau.admin.pending-reviews": { value: "24", trend: "6 项临近截止", trendTone: "neutral" },
  "bureau.business.my-reviews": { value: "16", trend: "今日新增 3 项", trendTone: "neutral" },
  "bureau.business.due-today": { value: "4", trend: "最早 14:00 到期", trendTone: "neutral" },
  "bureau.business.weekly-completed": { value: "31", trend: "较上周 +6 项", trendTone: "up" },
  "org.admin.course-count": { value: "48", trend: "本月新增 6 门", trendTone: "up" },
  "org.admin.class-count": { value: "126", trend: "92 个正在进行", trendTone: "up" },
  "org.admin.student-count": { value: "3,820", trend: "续报率 76.8%", trendTone: "up" },
  "org.admin.pending-settlement": { value: "¥86,400", trend: "3 笔待确认", trendTone: "neutral" },
  "org.business.today-classes": { value: "6", trend: "首节 09:00 开始", trendTone: "neutral" },
  "org.business.attendance-tasks": { value: "2", trend: "请及时完成点名", trendTone: "neutral" },
  "org.business.assigned-students": { value: "128", trend: "4 个课班", trendTone: "up" },
  "platform.admin.tenant-count": { value: "186", trend: "本月新增 8 个", trendTone: "up" },
  "platform.admin.enabled-tenants": { value: "178", trend: "启用率 95.7%", trendTone: "up" },
  "platform.admin.role-count": { value: "642", trend: "含 268 个自定义角色", trendTone: "neutral" },
  "platform.admin.config-alerts": { value: "9", trend: "3 项建议立即处理", trendTone: "neutral" },
  "platform.business.pending-tasks": { value: "8", trend: "2 项今天到期", trendTone: "neutral" },
  "platform.business.weekly-completed": { value: "26", trend: "较上周 +4 项", trendTone: "up" },
  "platform.business.service-status": { value: "正常", trend: "所有核心服务可用", trendTone: "up" },
};

const tenantNotices: Record<WorkbenchDataContext["tenant"]["type"], string[]> = {
  school: ["本周五完成月度安全巡检", "学期家长会材料已开放提交", "新版考勤规则将于下周生效"],
  bureau: ["托管课程审核规范已更新", "本月机构数据报送截止至周五", "退款审核流程新增复核节点"],
  org: ["春季课程续报活动已开始", "教师资质年审材料请及时补充", "本月结算单已生成"],
  platform: ["租户配置完整性检查已完成", "系统维护窗口安排在周六凌晨", "权限配置审计报告已生成"],
};

function tenantSeed(tenantId: string) {
  return [...tenantId].reduce((total, character) => total + character.charCodeAt(0), 0) % 7;
}

function metricForTenant(
  metric: Omit<WorkbenchMetricData, "kind">,
  context: WorkbenchDataContext,
) {
  const seed = tenantSeed(context.tenant.id);
  const percentage = metric.value.match(/^(\d+(?:\.\d+)?)%$/);
  const currency = metric.value.match(/^¥([\d,]+)$/);
  const count = metric.value.match(/^[\d,]+$/);
  let value = metric.value;

  if (percentage) {
    const decimals = percentage[1]!.split(".")[1]?.length ?? 0;
    value = `${(Number(percentage[1]) + seed * 0.1).toFixed(decimals)}%`;
  } else if (currency) {
    value = `¥${(Number(currency[1]!.replace(/,/g, "")) + seed * 1_200).toLocaleString("en-US")}`;
  } else if (count) {
    value = (Number(metric.value.replace(/,/g, "")) + seed * 3).toLocaleString("en-US");
  }

  return { ...metric, value };
}

function listItems(values: string[], prefix: string): WorkbenchListItemData[] {
  return values.map((title, index) => ({
    id: `${prefix}-${index}`,
    title,
    meta: index === 0 ? "今天" : `${index + 1} 天内`,
    tone: index === 0 ? "warning" : "neutral",
  }));
}

function scheduleItems(context: WorkbenchDataContext): WorkbenchListItemData[] {
  const values = context.tenant.type === "school"
    ? ["08:30 晨会与班级签到", "10:20 三年级科学课", "14:00 教研组例会", "16:30 放学值班"]
    : context.tenant.type === "bureau"
      ? ["09:00 机构资质审核", "10:30 课程细则复核", "14:00 学校数据沟通会", "16:00 审核结果汇总"]
      : context.tenant.type === "org"
        ? ["09:00 创意美术一班", "11:00 课后反馈整理", "14:30 科学实验二班", "17:00 教师教研会"]
        : ["09:30 租户配置巡检", "11:00 服务周会", "15:00 组织数据复核", "17:30 值班交接"];
  return values.map((value, index) => {
    const [time, ...title] = value.split(" ");
    return { id: `schedule-${index}`, title: title.join(" "), meta: time!, tone: "primary" };
  });
}

function taskItems(context: WorkbenchDataContext, dataKey: string) {
  const values = dataKey.includes("review")
    ? ["复核星辰艺术机构资质", "处理课程细则补充材料", "确认教师黑名单申诉", "完成本周审核汇总", "跟进退款异常记录"]
    : context.tenant.type === "school"
      ? ["审批学生请假申请", "确认本周值班安排", "补充班级考勤说明", "发布家长会通知", "检查门禁异常记录"]
      : context.tenant.type === "org"
        ? ["完成未点名课班", "提交课后教学反馈", "确认调课申请", "补充学生学习记录", "查看最新教学通知"]
        : ["复核租户菜单配置", "处理组织启用申请", "检查角色权限异常", "整理平台运营周报", "确认维护窗口通知"];
  return listItems(values, dataKey);
}

function distributionItems(context: WorkbenchDataContext): WorkbenchDistributionItemData[] {
  if (context.tenant.type === "school") {
    return [
      { label: "低年级", value: 34, displayValue: "846 人", tone: "primary" },
      { label: "中年级", value: 35, displayValue: "872 人", tone: "success" },
      { label: "高年级", value: 31, displayValue: "768 人", tone: "warning" },
    ];
  }
  if (context.tenant.type === "bureau") {
    return [
      { label: "正常合作", value: 72, displayValue: "59 家", tone: "success" },
      { label: "审核中", value: 20, displayValue: "16 家", tone: "primary" },
      { label: "需整改", value: 8, displayValue: "7 家", tone: "warning" },
    ];
  }
  if (context.tenant.type === "org") {
    return [
      { label: "在岗教师", value: 78, displayValue: "96 人", tone: "success" },
      { label: "审核中", value: 14, displayValue: "17 人", tone: "primary" },
      { label: "待补材料", value: 8, displayValue: "10 人", tone: "warning" },
    ];
  }
  return [
    { label: "学校", value: 48, displayValue: "89 个", tone: "primary" },
    { label: "教育局", value: 16, displayValue: "30 个", tone: "warning" },
    { label: "机构", value: 36, displayValue: "67 个", tone: "success" },
  ];
}

function trendData(
  definition: WorkbenchWidgetDefinition,
  settings: WorkbenchWidgetSettings,
  context: WorkbenchDataContext,
) {
  const isThirtyDays = settings.kind === "trend" && settings.range === "30d";
  const base = definition.tenantType === "school"
    ? [94, 96, 95, 97, 96, 98, 97]
    : definition.tenantType === "bureau"
      ? [52, 61, 58, 72, 76, 84, 91]
      : definition.tenantType === "org"
        ? [68, 74, 79, 76, 88, 92, 96]
        : [42, 48, 57, 66, 72, 79, 86];
  const seed = tenantSeed(context.tenant.id);
  const tenantValues = base.map((value) => Math.min(100, value + seed * 0.2));
  const values = isThirtyDays
    ? [
        ...tenantValues,
        ...tenantValues.map((value, index) => Math.min(100, value + (index % 3) * 2)),
      ]
    : tenantValues;
  return {
    kind: "trend" as const,
    labels: values.map((_, index) => isThirtyDays ? `${index * 2 + 1}日` : `周${"一二三四五六日"[index % 7]}`),
    values,
    summary: isThirtyDays ? "近 30 天整体保持稳定增长" : "近 7 天关键指标整体稳定",
  };
}

export class MockWorkbenchDataSource implements WorkbenchDataSource {
  async load(
    definition: WorkbenchWidgetDefinition,
    settings: WorkbenchWidgetSettings,
    context: WorkbenchDataContext,
    quickLinks: readonly WorkbenchQuickLinkData[],
  ): Promise<WorkbenchWidgetData> {
    if (definition.kind === "metric") {
      const metric = metricValues[definition.dataKey] ?? {
        value: "--",
        trend: "暂无变化",
        trendTone: "neutral" as const,
      };
      return { kind: "metric", ...metricForTenant(metric, context) };
    }
    if (definition.kind === "trend") return trendData(definition, settings, context);
    if (definition.kind === "distribution") {
      return { kind: "distribution", items: distributionItems(context) };
    }
    if (definition.kind === "quick-links") {
      const selectedIds = settings.kind === "quick-links" ? settings.menuIds : null;
      const items = selectedIds === null
        ? quickLinks.slice(0, 8)
        : selectedIds.flatMap((id) => quickLinks.find((item) => item.id === id) ?? []);
      return { kind: "quick-links", items };
    }
    const limit = settings.kind === "list" ? settings.limit : 5;
    if (definition.kind === "schedule") {
      return { kind: "schedule", items: scheduleItems(context).slice(0, limit) };
    }
    const values = definition.dataKey.endsWith(".notices")
      ? listItems(tenantNotices[context.tenant.type], definition.dataKey)
      : taskItems(context, definition.dataKey);
    return { kind: "list", items: values.slice(0, limit) };
  }
}

export const workbenchDataSource = new MockWorkbenchDataSource();
