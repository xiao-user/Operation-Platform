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
    minSize: { w: width, h: 2 },
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
      minSize: { w: 4, h: 3 },
      maxSize: { w: 8, h: 6 },
    },
    {
      ...notice,
      kind: "list",
      position: { x: 0, y: 6, w: 4, h: 3 },
      settings: { kind: "list", limit: 5 },
      minSize: { w: 4, h: 3 },
      maxSize: { w: 8, h: 6 },
    },
    {
      ...distribution,
      kind: "distribution",
      tone: "success",
      position: { x: 4, y: 6, w: 4, h: 3 },
      settings: { kind: "none" },
      minSize: { w: 4, h: 3 },
      maxSize: { w: 8, h: 5 },
    },
    {
      id: "quick-links",
      title: "快捷入口",
      description: "仅展示当前角色有权访问的菜单。",
      kind: "quick-links",
      tone: "primary",
      position: { x: 8, y: 6, w: 4, h: 3 },
      settings: { kind: "quick-links", menuIds: null },
      minSize: { w: 4, h: 3 },
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
      minSize: { w: 4, h: 3 },
      maxSize: { w: 8, h: 6 },
    },
    {
      ...notice,
      kind: "list",
      position: { x: 0, y: 6, w: 6, h: 3 },
      settings: { kind: "list", limit: 5 },
      minSize: { w: 4, h: 3 },
      maxSize: { w: 8, h: 6 },
    },
    {
      id: "quick-links",
      title: "快捷入口",
      description: "仅展示当前角色有权访问的菜单。",
      kind: "quick-links",
      tone: "primary",
      position: { x: 6, y: 6, w: 6, h: 3 },
      settings: { kind: "quick-links", menuIds: null },
      minSize: { w: 4, h: 3 },
      maxSize: { w: 8, h: 5 },
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
    revision: 1,
    widgets: [
      ...metrics([
        { id: "school-count", title: "接入学校", description: "当前教育局覆盖的学校数量。", tone: "primary" },
        { id: "org-count", title: "合作机构", description: "已接入托管机构数量。", tone: "success" },
        { id: "signup-count", title: "报名学生", description: "本期托管课程报名人数。", tone: "primary" },
        { id: "pending-reviews", title: "待审核", description: "待处理的机构与课程审核。", tone: "warning" },
      ]),
      ...adminPanels(
        { id: "signup-trend", title: "报名趋势", description: "托管课程报名变化趋势。" },
        { id: "review-alerts", title: "审核提醒", description: "超时或临近截止的审核事项。", tone: "danger" },
        { id: "notices", title: "通知工作", description: "近期教育局工作通知。", tone: "neutral" },
        { id: "org-distribution", title: "机构分布", description: "合作机构按状态分布。" },
      ),
    ],
  },
  {
    tenantType: "bureau",
    profile: "business",
    revision: 1,
    widgets: [
      ...metrics([
        { id: "my-reviews", title: "我的审核", description: "分配给本人的审核事项。", tone: "primary" },
        { id: "due-today", title: "今日到期", description: "今天需要办结的任务。", tone: "warning" },
        { id: "weekly-completed", title: "本周完成", description: "本周已完成审核数量。", tone: "success" },
      ], true),
      ...businessPanels(
        { id: "review-schedule", title: "审核日程", description: "机构、课程与师资审核计划。" },
        { id: "review-queue", title: "待办队列", description: "按优先级排列的审核任务。", tone: "warning" },
        { id: "notices", title: "工作通知", description: "与当前审核工作相关的通知。", tone: "neutral" },
      ),
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
