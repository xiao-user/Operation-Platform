import type {
  WorkbenchDataContext,
  WorkbenchDataSource,
  WorkbenchDistributionItemData,
  WorkbenchEducationChartData,
  WorkbenchFeedItemData,
  WorkbenchListItemData,
  WorkbenchMetricData,
  WorkbenchQuickLinkData,
  WorkbenchSubscriptionItemData,
  WorkbenchTaskItemData,
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
  "bureau.admin.student-count": { value: "48,620", trend: "本学期净增 386 人", trendTone: "up" },
  "bureau.admin.teacher-count": { value: "3,286", trend: "专任教师占比 91.4%", trendTone: "up" },
  "bureau.admin.pending-actions": { value: "24", trend: "6 项临近截止", trendTone: "neutral" },
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

const bureauFeedData: Record<string, WorkbenchFeedItemData[]> = {
  "bureau-news": [
    { id: "news-1", title: "全区基础教育高质量发展推进会召开", meta: "今天", label: "局内动态", tone: "primary", source: "办公室", summary: "会议部署秋季学期重点工作，明确教育质量提升、校园安全和数字化建设三项任务的责任单位与完成时限。", unread: true },
    { id: "news-2", title: "暑期校园安全专项检查工作启动", meta: "07-17", label: "重点工作", source: "安全科", summary: "专项检查覆盖消防、校舍、食品和暑期值班四类事项，各学校需按计划完成自查和整改反馈。", unread: true },
    { id: "news-3", title: "数字化教学应用培训完成首期授课", meta: "07-16", label: "教育数字化", source: "电教中心", summary: "首期培训完成 12 所学校的教师实操辅导，后续将按学段组织专题应用工作坊。" },
    { id: "news-4", title: "区级名师工作室联合教研活动举行", meta: "07-15", label: "教研活动", source: "教研室", summary: "活动围绕跨学科主题学习开展课例研讨，并形成下一阶段联合教研任务清单。" },
    { id: "news-5", title: "课后服务质量监测结果完成复核", meta: "07-14", label: "工作简报", source: "基教科", summary: "本轮监测完成数据复核，学校覆盖率和课程开设达标率均较上期提升。" },
  ],
  "information-disclosure": [
    { id: "disclosure-1", title: "2026 年义务教育招生工作实施方案", meta: "07-18", label: "政策文件", tone: "primary", source: "基础教育科", summary: "方案明确招生对象、学区安排、报名流程及特殊群体入学保障要求。", unread: true },
    { id: "disclosure-2", title: "校外培训机构年度检查结果公示", meta: "07-16", label: "公示公告", source: "监管科", summary: "年度检查结果按合格、限期整改和不合格分类公示，公示期为七个工作日。" },
    { id: "disclosure-3", title: "教育行政事项办事指南更新", meta: "07-12", label: "办事指南", source: "行政审批科", summary: "更新教师资格认定、民办学校审批等事项的办理材料、流程和咨询方式。" },
    { id: "disclosure-4", title: "学生资助政策与申请流程说明", meta: "07-09", label: "政策解读", source: "学生资助中心", summary: "梳理各学段资助项目、认定条件、申请材料及办理时限。" },
    { id: "disclosure-5", title: "教育经费年度执行情况公开", meta: "07-05", label: "财政信息", source: "财务科", summary: "公开年度教育经费预算执行和重点项目资金使用情况。" },
  ],
  announcements: [
    { id: "announcement-1", title: "关于报送暑期值班安排的通知", meta: "今天", label: "工作通知", tone: "primary", source: "办公室", summary: "请各单位于本周五前完成暑期值班表在线填报，并确认应急联系人信息。", unread: true },
    { id: "announcement-2", title: "全区教师信息更新工作提醒", meta: "07-17", label: "数据报送", source: "人事科", summary: "教师基础信息更新将在 7 月 24 日截止，请及时处理系统校验提示。", unread: true },
    { id: "announcement-3", title: "秋季学期校历安排发布", meta: "07-15", label: "重要公告", source: "基础教育科", summary: "新学期报到、开学、考试及假期时间已确定，请各学校据此安排教学计划。" },
    { id: "announcement-4", title: "教育系统网络维护窗口说明", meta: "07-12", label: "系统通知", source: "电教中心", summary: "本周六 00:00 至 04:00 进行网络维护，部分平台服务可能短时不可用。" },
    { id: "announcement-5", title: "校外培训治理专项检查通知", meta: "07-10", label: "专项工作", source: "监管科", summary: "专项检查聚焦违规收费、隐形变异培训和安全管理，具体分组安排已下发。" },
  ],
};

const bureauTaskData: WorkbenchTaskItemData[] = [
  { id: "todo-1", title: "复核星辰艺术机构资质", meta: "今天 16:00", label: "待审核", tone: "warning", status: "pending" },
  { id: "todo-2", title: "确认秋季招生计划汇总数据", meta: "明天", label: "待办", status: "pending" },
  { id: "todo-3", title: "处理课程细则补充材料", meta: "2 天内", label: "待补充", status: "pending" },
  { id: "todo-4", title: "完成本周审核工作汇总", meta: "周五", label: "任务", status: "pending" },
  { id: "todo-5", title: "查看校园安全预警信息", meta: "昨天", label: "消息", tone: "danger", status: "completed" },
];

const bureauSubscriptionData: WorkbenchSubscriptionItemData[] = [
  { id: "subscription-1", title: "基础教育政策速递", meta: "更新 3 条", label: "政策", subscribed: true },
  { id: "subscription-2", title: "教育数字化建设动态", meta: "更新 2 条", label: "专题", subscribed: true },
  { id: "subscription-3", title: "区域教学质量监测", meta: "每周一", label: "数据", subscribed: true },
  { id: "subscription-4", title: "教师发展与教研资讯", meta: "更新 1 条", label: "教研", subscribed: false },
  { id: "subscription-5", title: "校园安全风险提示", meta: "实时", label: "安全", tone: "warning", subscribed: true },
];

const educationChartData: Record<string, Omit<WorkbenchEducationChartData, "kind">> = {
  "grade-applications": {
    variant: "grade-applications",
    labels: ["一年级", "二年级", "三年级", "四年级", "五年级", "六年级", "初一", "初二", "初三", "高一", "高二", "高三"],
    series: [{ name: "应用量", values: [8_260, 7_850, 7_530, 7_110, 6_940, 6_620, 5_780, 5_420, 5_060, 4_880, 4_510, 4_120] }],
    centerLabel: "小学",
    centerValue: "44,310",
  },
  "application-types": {
    variant: "application-types",
    labels: ["作业", "上课", "班测", "备课", "考试", "课程任务"],
    series: [{ name: "应用量", values: [2_383, 2_728, 1_128, 12_839, 240, 2_293] }],
    centerLabel: "作业",
    centerValue: "2,383",
  },
  "resource-sharing": {
    variant: "resource-sharing",
    labels: ["公开分享", "本校分享", "私人分享"],
    series: [{ name: "资源量", values: [7_383, 2_728, 1_128] }],
    centerLabel: "公开分享",
    centerValue: "7,383",
    metrics: [
      { label: "浏览量", value: "98", tone: "primary" },
      { label: "下载量", value: "32" },
      { label: "收藏量", value: "24" },
    ],
  },
  "resource-growth": {
    variant: "resource-growth",
    labels: ["11-09", "11-12", "11-15", "11-18", "11-21", "11-24", "11-27", "11-30", "12-03"],
    series: [{ name: "新增资源", values: [22, 40, 58, 48, 44, 64, 96, 112, 142] }],
    summary: "最近 30 天日均上传 471",
  },
  "resource-contribution": {
    variant: "resource-contribution",
    labels: ["作业", "班测", "备课", "考试", "课程任务"],
    series: [{ name: "资源贡献", values: [190, 170, 185, 100, 130] }],
    unit: "单位（个数）",
  },
  "subject-resources": {
    variant: "subject-resources",
    labels: ["语文", "英语", "数学", "政治", "思想品德", "历史", "化学", "美术", "物理", "体育"],
    series: [{ name: "资源量", values: [5.9, 5.1, 5.7, 2.7, 3.7, 4.6, 5.3, 2, 5.8, 1.9] }],
    unit: "单位（万）",
  },
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

function localIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calendarData() {
  const today = new Date();
  const dateAfter = (offset: number) => {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    return localIsoDate(date);
  };
  return {
    kind: "calendar" as const,
    events: [
      { id: "agenda-1", date: dateAfter(0), time: "09:30", endTime: "11:00", title: "重点项目周调度会", type: "meeting" as const, status: "pending" as const, location: "教育局第一会议室", audience: "项目负责人、业务科室代表" },
      { id: "agenda-2", date: dateAfter(0), time: "14:00", endTime: "16:00", title: "学校数据质量复核", type: "review" as const, status: "pending" as const, location: "数据中心", audience: "基教科、信息中心、辖区学校" },
      { id: "agenda-3", date: dateAfter(1), time: "10:00", endTime: "11:30", title: "秋季招生数据会审", type: "review" as const, status: "pending" as const, location: "招生考试中心", audience: "招生工作组" },
      { id: "agenda-4", date: dateAfter(3), time: "15:30", endTime: "17:00", title: "校园安全整改反馈", type: "task" as const, status: "pending" as const, location: "线上会议", audience: "安全科、相关学校负责人" },
      { id: "agenda-5", date: dateAfter(-2), time: "11:00", endTime: "12:00", title: "教研项目立项沟通", type: "meeting" as const, status: "completed" as const, location: "教研室", audience: "项目组成员" },
    ],
  };
}

function rankingData() {
  return {
    kind: "ranking" as const,
    items: [
      { id: "ranking-1", name: "智慧课堂", usage: 18.6, trend: "+12.8%" },
      { id: "ranking-2", name: "作业管理", usage: 15.2, trend: "+8.4%" },
      { id: "ranking-3", name: "在线教研", usage: 12.9, trend: "+6.7%" },
      { id: "ranking-4", name: "资源中心", usage: 10.4, trend: "+5.1%" },
      { id: "ranking-5", name: "学情分析", usage: 8.7, trend: "+3.6%" },
    ],
  };
}

function resourceRankingData() {
  return {
    kind: "ranking" as const,
    mode: "resource" as const,
    items: [
      { id: "resource-ranking-1", name: "七年级上册语文同步备课包", usage: 12_580, uploads: 2_180, trend: "+18.2%" },
      { id: "resource-ranking-2", name: "小学数学思维训练专题", usage: 10_960, uploads: 1_860, trend: "+15.6%" },
      { id: "resource-ranking-3", name: "初中英语听说训练资源", usage: 9_740, uploads: 1_520, trend: "+12.4%" },
      { id: "resource-ranking-4", name: "高中物理实验课程素材", usage: 8_160, uploads: 1_290, trend: "+9.8%" },
      { id: "resource-ranking-5", name: "跨学科主题学习案例集", usage: 7_430, uploads: 1_080, trend: "+8.1%" },
    ],
  };
}

function growthData() {
  return {
    kind: "growth" as const,
    score: "86",
    summary: "本月成长值 +12",
    items: [
      { label: "研修学习", value: 82, displayValue: "18 学时" },
      { label: "业务协同", value: 68, displayValue: "24 次" },
      { label: "知识贡献", value: 56, displayValue: "9 篇" },
    ],
  };
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
      { label: "运行正常", value: 83, displayValue: "30 所", tone: "success" },
      { label: "待补报数据", value: 11, displayValue: "4 所", tone: "primary" },
      { label: "存在风险", value: 6, displayValue: "2 所", tone: "warning" },
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
    if (definition.kind === "education-chart") {
      const dataKeyParts = definition.dataKey.split(".");
      const chartKey = dataKeyParts[dataKeyParts.length - 1] ?? "";
      const chart = educationChartData[chartKey];
      if (!chart) throw new Error(`未找到工作台图表数据：${definition.dataKey}`);
      return { kind: "education-chart", ...chart };
    }
    if (definition.kind === "activity-rank") {
      return { kind: "activity-rank", rank: 32, change: -12, summary: "较上月" };
    }
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
    if (definition.kind === "ranking") {
      return definition.dataKey.endsWith("resource-ranking") ? resourceRankingData() : rankingData();
    }
    if (definition.kind === "calendar") return calendarData();
    if (definition.kind === "growth") return growthData();
    const limit = settings.kind === "list" ? settings.limit : 5;
    if (definition.kind === "schedule") {
      return { kind: "schedule", items: scheduleItems(context).slice(0, limit) };
    }
    const dataKeyParts = definition.dataKey.split(".");
    const bureauDataKey = dataKeyParts[dataKeyParts.length - 1] ?? "";
    if (context.tenant.type === "bureau" && bureauFeedData[bureauDataKey]) {
      return { kind: "feed", items: bureauFeedData[bureauDataKey].slice(0, limit) };
    }
    if (context.tenant.type === "bureau" && bureauDataKey === "message-todo-center") {
      return { kind: "task-center", items: bureauTaskData.slice(0, limit) };
    }
    if (context.tenant.type === "bureau" && bureauDataKey === "subscriptions") {
      return { kind: "subscriptions", items: bureauSubscriptionData.slice(0, limit) };
    }
    const values = definition.dataKey.endsWith(".notices")
      ? listItems(tenantNotices[context.tenant.type], definition.dataKey)
      : taskItems(context, definition.dataKey);
    return { kind: "list", items: values.slice(0, limit) };
  }
}

export const workbenchDataSource = new MockWorkbenchDataSource();
