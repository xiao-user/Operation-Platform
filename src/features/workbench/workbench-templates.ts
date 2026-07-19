import type {
  WorkbenchLayoutItem,
  WorkbenchProfile,
  WorkbenchTemplate,
  WorkbenchWidgetDefinition,
  WorkbenchWidgetKind,
  WorkbenchWidgetSettings,
  WorkbenchWidgetSize,
  WorkbenchWidgetTone,
} from "@/features/workbench/types";
import type { TenantType } from "@/types/user";

interface WidgetSpec {
  id: string;
  title: string;
  description: string;
  kind: WorkbenchWidgetKind;
  tone: WorkbenchWidgetTone;
  position: { x: number; y: number; w: number; h: number };
  settings?: WorkbenchWidgetSettings;
  minSize?: WorkbenchWidgetSize;
  maxSize?: WorkbenchWidgetSize;
}

interface TemplateSpec {
  tenantType: TenantType;
  profile: WorkbenchProfile;
  revision: number;
  widgets: WidgetSpec[];
}

const metricPositions = [0, 3, 6, 9];
const businessMetricPositions = [0, 4, 8];

function metrics(
  values: Array<Pick<WidgetSpec, "id" | "title" | "description" | "tone">>,
  business = false,
): WidgetSpec[] {
  const positions = business ? businessMetricPositions : metricPositions;
  const width = business ? 4 : 3;
  return values.map((item, index) => ({
    ...item,
    kind: "metric",
    position: { x: positions[index]!, y: 0, w: width, h: 2 },
    settings: { kind: "none" },
    minSize: { w: 3, h: 2 },
    maxSize: { w: business ? 6 : 4, h: 2 },
  }));
}

function adminPanels(
  trend: Pick<WidgetSpec, "id" | "title" | "description">,
  list: Pick<WidgetSpec, "id" | "title" | "description" | "tone">,
  notice: Pick<WidgetSpec, "id" | "title" | "description" | "tone">,
  distribution: Pick<WidgetSpec, "id" | "title" | "description">,
): WidgetSpec[] {
  return [
    {
      ...trend,
      kind: "trend",
      tone: "primary",
      position: { x: 0, y: 2, w: 8, h: 4 },
      settings: { kind: "trend", range: "7d" },
      minSize: { w: 6, h: 3 },
      maxSize: { w: 12, h: 6 },
    },
    {
      ...list,
      kind: "list",
      position: { x: 8, y: 2, w: 4, h: 4 },
      settings: { kind: "list", limit: 5 },
      minSize: { w: 3, h: 3 },
      maxSize: { w: 8, h: 6 },
    },
    {
      ...notice,
      kind: "list",
      position: { x: 0, y: 6, w: 4, h: 3 },
      settings: { kind: "list", limit: 5 },
      minSize: { w: 3, h: 3 },
      maxSize: { w: 8, h: 6 },
    },
    {
      ...distribution,
      kind: "distribution",
      tone: "success",
      position: { x: 4, y: 6, w: 4, h: 3 },
      settings: { kind: "none" },
      minSize: { w: 3, h: 3 },
      maxSize: { w: 8, h: 5 },
    },
    {
      id: "quick-links",
      title: "快捷导航",
      description: "按一级菜单展示当前角色可访问的内部页面。",
      kind: "quick-links",
      tone: "primary",
      position: { x: 8, y: 6, w: 4, h: 3 },
      settings: { kind: "quick-links", menuIds: null },
      minSize: { w: 3, h: 3 },
      maxSize: { w: 8, h: 5 },
    },
  ];
}

function businessPanels(
  schedule: Pick<WidgetSpec, "id" | "title" | "description">,
  tasks: Pick<WidgetSpec, "id" | "title" | "description" | "tone">,
  notice: Pick<WidgetSpec, "id" | "title" | "description" | "tone">,
): WidgetSpec[] {
  return [
    {
      ...schedule,
      kind: "schedule",
      tone: "primary",
      position: { x: 0, y: 2, w: 7, h: 4 },
      settings: { kind: "list", limit: 5 },
      minSize: { w: 5, h: 3 },
      maxSize: { w: 12, h: 6 },
    },
    {
      ...tasks,
      kind: "list",
      position: { x: 7, y: 2, w: 5, h: 4 },
      settings: { kind: "list", limit: 5 },
      minSize: { w: 3, h: 3 },
      maxSize: { w: 8, h: 6 },
    },
    {
      ...notice,
      kind: "list",
      position: { x: 0, y: 6, w: 6, h: 3 },
      settings: { kind: "list", limit: 5 },
      minSize: { w: 3, h: 3 },
      maxSize: { w: 8, h: 6 },
    },
    {
      id: "quick-links",
      title: "快捷导航",
      description: "按一级菜单展示当前角色可访问的内部页面。",
      kind: "quick-links",
      tone: "primary",
      position: { x: 6, y: 6, w: 6, h: 3 },
      settings: { kind: "quick-links", menuIds: null },
      minSize: { w: 3, h: 3 },
      maxSize: { w: 8, h: 5 },
    },
  ];
}

function bureauPortalPanels(startY: number): WidgetSpec[] {
  return [
    {
      id: "user-overview",
      title: "个人概览",
      description: "当前账号、角色和个人消息概览。",
      kind: "user-overview",
      tone: "primary",
      position: { x: 0, y: startY, w: 12, h: 2 },
      settings: { kind: "none" },
      minSize: { w: 8, h: 2 },
      maxSize: { w: 12, h: 2 },
    },
    {
      id: "calendar-tasks",
      title: "日程与任务管理",
      description: "按日期管理会议、审核与个人任务。",
      kind: "calendar",
      tone: "primary",
      position: { x: 0, y: startY + 2, w: 8, h: 5 },
      settings: { kind: "none" },
      minSize: { w: 6, h: 5 },
      maxSize: { w: 12, h: 8 },
    },
    {
      id: "message-todo-center",
      title: "消息与待办中心",
      description: "筛选并处理本人审核、消息与任务。",
      kind: "list",
      tone: "warning",
      position: { x: 8, y: startY + 2, w: 4, h: 5 },
      settings: { kind: "list", limit: 5 },
      minSize: { w: 3, h: 5 },
      maxSize: { w: 8, h: 8 },
    },
    {
      id: "quick-apps",
      title: "快捷导航",
      description: "按一级菜单展示当前角色可访问的内部页面。",
      kind: "quick-links",
      tone: "primary",
      position: { x: 0, y: startY + 7, w: 12, h: 4 },
      settings: { kind: "quick-links", menuIds: null },
      minSize: { w: 6, h: 4 },
      maxSize: { w: 12, h: 6 },
    },
    {
      id: "bureau-news",
      title: "局内新闻",
      description: "教育局内部动态与重点工作进展。",
      kind: "list",
      tone: "neutral",
      position: { x: 0, y: startY + 11, w: 6, h: 4 },
      settings: { kind: "list", limit: 5 },
      minSize: { w: 3, h: 3 },
      maxSize: { w: 12, h: 6 },
    },
    {
      id: "information-disclosure",
      title: "信息公开",
      description: "政策文件、办事指南与公开信息。",
      kind: "list",
      tone: "neutral",
      position: { x: 6, y: startY + 11, w: 6, h: 4 },
      settings: { kind: "list", limit: 5 },
      minSize: { w: 3, h: 3 },
      maxSize: { w: 12, h: 6 },
    },
    {
      id: "teaching-app-ranking",
      title: "教学应用排行榜",
      description: "辖区教学应用近 30 天活跃排行。",
      kind: "ranking",
      tone: "primary",
      position: { x: 0, y: startY + 15, w: 3, h: 4 },
      settings: { kind: "none" },
      minSize: { w: 3, h: 4 },
      maxSize: { w: 8, h: 6 },
    },
    {
      id: "personal-growth",
      title: "个人成长与发展",
      description: "个人学习、研修与能力成长概览。",
      kind: "growth",
      tone: "success",
      position: { x: 3, y: startY + 15, w: 3, h: 4 },
      settings: { kind: "none" },
      minSize: { w: 3, h: 4 },
      maxSize: { w: 8, h: 6 },
    },
    {
      id: "subscriptions",
      title: "我的订阅",
      description: "本人订阅的政策、教研与数据专题。",
      kind: "list",
      tone: "neutral",
      position: { x: 6, y: startY + 15, w: 3, h: 4 },
      settings: { kind: "list", limit: 5 },
      minSize: { w: 3, h: 3 },
      maxSize: { w: 8, h: 6 },
    },
    {
      id: "announcements",
      title: "通知公告",
      description: "面向辖区单位发布的通知与公告。",
      kind: "list",
      tone: "neutral",
      position: { x: 9, y: startY + 15, w: 3, h: 4 },
      settings: { kind: "list", limit: 5 },
      minSize: { w: 3, h: 3 },
      maxSize: { w: 8, h: 6 },
    },
  ];
}

function bureauResourcePanels(startY: number): WidgetSpec[] {
  const chartSize = { minSize: { w: 4, h: 3 }, maxSize: { w: 12, h: 6 } };
  return [
    {
      id: "grade-applications",
      title: "年级应用情况",
      description: "辖区各年级数字教学应用量分布。",
      kind: "education-chart",
      tone: "primary",
      position: { x: 0, y: startY, w: 4, h: 3 },
      settings: { kind: "none" },
      ...chartSize,
    },
    {
      id: "application-types",
      title: "应用类型分布",
      description: "作业、备课、考试等教学场景的应用分布。",
      kind: "education-chart",
      tone: "primary",
      position: { x: 4, y: startY, w: 4, h: 3 },
      settings: { kind: "none" },
      ...chartSize,
    },
    {
      id: "activity-rank",
      title: "区域活跃度排名",
      description: "当前区域在同级教育平台中的活跃排名。",
      kind: "activity-rank",
      tone: "warning",
      position: { x: 8, y: startY, w: 4, h: 3 },
      settings: { kind: "none" },
      minSize: { w: 3, h: 2 },
      maxSize: { w: 8, h: 4 },
    },
    {
      id: "resource-sharing",
      title: "资源应用情况",
      description: "资源分享范围及浏览、下载、收藏情况。",
      kind: "education-chart",
      tone: "primary",
      position: { x: 0, y: startY + 3, w: 6, h: 3 },
      settings: { kind: "none" },
      ...chartSize,
    },
    {
      id: "resource-growth",
      title: "资源增长趋势",
      description: "最近 30 天辖区资源新增趋势。",
      kind: "education-chart",
      tone: "primary",
      position: { x: 6, y: startY + 3, w: 6, h: 3 },
      settings: { kind: "none" },
      ...chartSize,
    },
    {
      id: "resource-contribution",
      title: "资源贡献分布",
      description: "不同教学场景的资源贡献数量。",
      kind: "education-chart",
      tone: "success",
      position: { x: 0, y: startY + 6, w: 4, h: 3 },
      settings: { kind: "none" },
      ...chartSize,
    },
    {
      id: "subject-resources",
      title: "学科资源统计",
      description: "辖区主要学科资源数量对比。",
      kind: "education-chart",
      tone: "primary",
      position: { x: 4, y: startY + 6, w: 8, h: 3 },
      settings: { kind: "none" },
      ...chartSize,
    },
    {
      id: "resource-ranking",
      title: "资源使用排行",
      description: "辖区资源浏览与上传数量排行。",
      kind: "ranking",
      tone: "primary",
      position: { x: 0, y: startY + 9, w: 6, h: 4 },
      settings: { kind: "none" },
      minSize: { w: 4, h: 4 },
      maxSize: { w: 12, h: 6 },
    },
  ];
}

const templateSpecs: TemplateSpec[] = [
  {
    tenantType: "school",
    profile: "admin",
    revision: 1,
    widgets: [
      ...metrics([
        { id: "student-count", title: "在校学生", description: "当前组织在校学生规模。", tone: "primary" },
        { id: "arrival-rate", title: "今日到校率", description: "今日学生到校情况。", tone: "success" },
        { id: "pending-approvals", title: "待审批", description: "当前需要管理员处理的事项。", tone: "warning" },
        { id: "device-online-rate", title: "设备在线率", description: "校园设备实时在线情况。", tone: "success" },
      ]),
      ...adminPanels(
        { id: "attendance-trend", title: "考勤趋势", description: "学生到校率变化趋势。" },
        { id: "operational-alerts", title: "运营告警", description: "需要管理员关注的校园异常。", tone: "danger" },
        { id: "notices", title: "通知工作", description: "近期校务通知与发布状态。", tone: "neutral" },
        { id: "student-distribution", title: "学生分布", description: "学生按年级的结构分布。" },
      ),
    ],
  },
  {
    tenantType: "school",
    profile: "business",
    revision: 1,
    widgets: [
      ...metrics([
        { id: "today-courses", title: "今日课程", description: "今天安排的课程数量。", tone: "primary" },
        { id: "pending-tasks", title: "待处理任务", description: "需要本人处理的工作。", tone: "warning" },
        { id: "class-attendance", title: "班级出勤率", description: "负责班级今日出勤情况。", tone: "success" },
      ], true),
      ...businessPanels(
        { id: "today-schedule", title: "今日安排", description: "课程、值班与会议安排。" },
        { id: "my-tasks", title: "我的待办", description: "按优先级整理的个人任务。", tone: "warning" },
        { id: "notices", title: "通知工作", description: "与当前工作相关的最新通知。", tone: "neutral" },
      ),
    ],
  },
  {
    tenantType: "bureau",
    profile: "admin",
    revision: 6,
    widgets: [
      ...metrics([
        { id: "school-count", title: "覆盖学校", description: "当前教育局纳管的学校数量。", tone: "primary" },
        { id: "student-count", title: "在校学生", description: "辖区学校在校学生总数。", tone: "success" },
        { id: "teacher-count", title: "教职工", description: "辖区学校教职工总数。", tone: "primary" },
        { id: "pending-actions", title: "待处置事项", description: "风险预警、数据报送与审核事项。", tone: "warning" },
      ]),
      {
        id: "operation-trend",
        title: "区域教育运行趋势",
        description: "辖区核心教育运行指标变化趋势。",
        kind: "trend",
        tone: "primary",
        position: { x: 0, y: 2, w: 8, h: 4 },
        settings: { kind: "trend", range: "7d" },
        minSize: { w: 6, h: 3 },
        maxSize: { w: 12, h: 6 },
      },
      {
        id: "school-operating-status",
        title: "学校运行状态",
        description: "学校数据上报与风险状态分布。",
        kind: "distribution",
        tone: "success",
        position: { x: 8, y: 2, w: 4, h: 4 },
        settings: { kind: "none" },
        minSize: { w: 3, h: 3 },
        maxSize: { w: 8, h: 6 },
      },
      ...bureauPortalPanels(6),
      ...bureauResourcePanels(25),
    ],
  },
  {
    tenantType: "bureau",
    profile: "business",
    revision: 6,
    widgets: [
      ...metrics([
        { id: "my-reviews", title: "我的审核", description: "分配给本人的审核事项。", tone: "primary" },
        { id: "due-today", title: "今日到期", description: "今天需要办结的任务。", tone: "warning" },
        { id: "weekly-completed", title: "本周完成", description: "本周已完成审核数量。", tone: "success" },
      ], true),
      ...bureauPortalPanels(2),
      ...bureauResourcePanels(21),
    ],
  },
  {
    tenantType: "org",
    profile: "admin",
    revision: 1,
    widgets: [
      ...metrics([
        { id: "course-count", title: "在售课程", description: "当前可报名课程数量。", tone: "primary" },
        { id: "class-count", title: "开设课班", description: "当前进行中的课班数量。", tone: "success" },
        { id: "student-count", title: "报名学生", description: "本期课程报名学生数量。", tone: "primary" },
        { id: "pending-settlement", title: "待结算", description: "等待处理的结算事项。", tone: "warning" },
      ]),
      ...adminPanels(
        { id: "enrollment-trend", title: "报名趋势", description: "课程报名人数变化趋势。" },
        { id: "refund-tasks", title: "退款待办", description: "待处理退款与异常支付。", tone: "danger" },
        { id: "notices", title: "通知工作", description: "近期机构运营通知。", tone: "neutral" },
        { id: "teacher-status", title: "师资状态", description: "教师审核与在岗状态分布。" },
      ),
    ],
  },
  {
    tenantType: "org",
    profile: "business",
    revision: 1,
    widgets: [
      ...metrics([
        { id: "today-classes", title: "今日课班", description: "今天需要授课的课班数量。", tone: "primary" },
        { id: "attendance-tasks", title: "待点名", description: "尚未完成点名的课班。", tone: "warning" },
        { id: "assigned-students", title: "负责学生", description: "当前负责的学生数量。", tone: "success" },
      ], true),
      ...businessPanels(
        { id: "class-schedule", title: "今日安排", description: "授课、备课与教研安排。" },
        { id: "my-tasks", title: "我的待办", description: "需要本人处理的课程工作。", tone: "warning" },
        { id: "notices", title: "通知工作", description: "与课程和课班相关的通知。", tone: "neutral" },
      ),
    ],
  },
  {
    tenantType: "platform",
    profile: "admin",
    revision: 1,
    widgets: [
      ...metrics([
        { id: "tenant-count", title: "租户总数", description: "平台当前维护的租户数量。", tone: "primary" },
        { id: "enabled-tenants", title: "启用租户", description: "当前正常启用的租户数量。", tone: "success" },
        { id: "role-count", title: "角色总数", description: "各租户已配置角色数量。", tone: "primary" },
        { id: "config-alerts", title: "配置提醒", description: "需要处理的配置异常。", tone: "warning" },
      ]),
      ...adminPanels(
        { id: "tenant-trend", title: "租户趋势", description: "平台租户数量变化趋势。" },
        { id: "config-health", title: "配置健康", description: "租户菜单与角色配置检查。", tone: "danger" },
        { id: "notices", title: "平台通知", description: "平台运营与维护通知。", tone: "neutral" },
        { id: "tenant-distribution", title: "组织分布", description: "租户按组织类型分布。" },
      ),
    ],
  },
  {
    tenantType: "platform",
    profile: "business",
    revision: 1,
    widgets: [
      ...metrics([
        { id: "pending-tasks", title: "个人待办", description: "当前需要处理的运营任务。", tone: "primary" },
        { id: "weekly-completed", title: "本周完成", description: "本周完成的工作数量。", tone: "success" },
        { id: "service-status", title: "服务状态", description: "平台服务当前运行状态。", tone: "success" },
      ], true),
      ...businessPanels(
        { id: "operation-schedule", title: "今日安排", description: "平台运营和值班安排。" },
        { id: "my-tasks", title: "我的待办", description: "按优先级整理的平台任务。", tone: "warning" },
        { id: "notices", title: "服务通知", description: "平台服务与维护通知。", tone: "neutral" },
      ),
    ],
  },
];

function defaultSettings(kind: WorkbenchWidgetKind): WorkbenchWidgetSettings {
  if (kind === "trend") return { kind: "trend", range: "7d" };
  if (kind === "list" || kind === "schedule") return { kind: "list", limit: 5 };
  if (kind === "quick-links") return { kind: "quick-links", menuIds: null };
  return { kind: "none" };
}

function defaultSizes(spec: WidgetSpec) {
  const current = { w: spec.position.w, h: spec.position.h };
  const minSize = spec.minSize ?? current;
  const maxSize = spec.maxSize ?? current;
  return {
    minSize,
    maxSize,
    sizePresets: {
      small: { ...minSize },
      medium: { ...current },
      large: { ...maxSize },
    },
  };
}

const registryEntries: WorkbenchWidgetDefinition[] = [];

export const workbenchTemplates: WorkbenchTemplate[] = templateSpecs.map((template) => {
  const widgets: WorkbenchLayoutItem[] = template.widgets.map((widget) => {
    const key = `${template.tenantType}.${template.profile}.${widget.id}`;
    const sizes = defaultSizes(widget);
    registryEntries.push({
      key,
      title: widget.title,
      description: widget.description,
      kind: widget.kind,
      dataKey: key,
      tenantType: template.tenantType,
      profile: template.profile,
      tone: widget.tone,
      ...sizes,
    });
    return {
      widgetKey: key,
      visible: true,
      ...widget.position,
      settings: widget.settings ?? defaultSettings(widget.kind),
    };
  });
  return {
    tenantType: template.tenantType,
    profile: template.profile,
    revision: template.revision,
    widgets,
  };
});

export const workbenchWidgetRegistry = new Map(
  registryEntries.map((definition) => [definition.key, definition]),
);

export function workbenchTemplateKey(tenantType: TenantType, profile: WorkbenchProfile) {
  return `${tenantType}:${profile}`;
}

export const workbenchTemplatesByKey = new Map(
  workbenchTemplates.map((template) => [
    workbenchTemplateKey(template.tenantType, template.profile),
    template,
  ]),
);

export function getWorkbenchTemplate(tenantType: TenantType, profile: WorkbenchProfile) {
  const template = workbenchTemplatesByKey.get(workbenchTemplateKey(tenantType, profile));
  if (!template) throw new Error(`未找到 ${tenantType}/${profile} 工作台模板`);
  return template;
}
