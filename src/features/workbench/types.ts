import type { TenantInfo, TenantType } from "@/types/user";
import type { MenuIconKey } from "@/types/navigation";

export const WORKBENCH_LAYOUT_VERSION = 4;
export const WORKBENCH_GRID_COLUMNS = 12;
export const SIMPLE_WORKBENCH_COLUMNS = 6;
export const SIMPLE_WORKBENCH_SPANS = [2, 3, 6] as const;
export const FLOW_WORKBENCH_SPANS = [3, 6] as const;

export type WorkbenchProfile = "admin" | "business";
export type WorkbenchWidgetKind =
  | "metric"
  | "trend"
  | "list"
  | "schedule"
  | "distribution"
  | "quick-links"
  | "ranking"
  | "calendar"
  | "growth"
  | "education-chart"
  | "activity-rank"
  | "user-overview";
export type WorkbenchWidgetTone = "primary" | "success" | "warning" | "danger" | "neutral";
export type WorkbenchWidgetSizePreset = "small" | "medium" | "large";
export type WorkbenchLayoutMode = "classic" | "simple";
export type SimpleWorkbenchSpan = (typeof SIMPLE_WORKBENCH_SPANS)[number];
export type FlowWorkbenchSpan = (typeof FLOW_WORKBENCH_SPANS)[number];
export type SimpleWorkbenchLayoutType = "flow" | "columns";
export type SimpleWorkbenchColumnRatio = "4:2" | "6:2";
export type SimpleWorkbenchColumn = "primary" | "secondary";
export type SimpleWorkbenchDropPlacement = "before" | "after" | "end";
export type WorkbenchWidgetAction =
  | "hide"
  | "move-left"
  | "move-right"
  | "move-up"
  | "move-down"
  | "move-backward"
  | "move-forward"
  | "move-primary"
  | "move-secondary"
  | "size-small"
  | "size-medium"
  | "size-large"
  | "span-3"
  | "span-6";

export type WorkbenchWidgetSettings =
  | { kind: "none" }
  | { kind: "trend"; range: "7d" | "30d" }
  | { kind: "list"; limit: 5 | 10 }
  | { kind: "quick-links"; menuIds: string[] | null };

export interface WorkbenchWidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WorkbenchWidgetSize {
  w: number;
  h: number;
}

export interface WorkbenchWidgetDefinition {
  key: string;
  title: string;
  description: string;
  kind: WorkbenchWidgetKind;
  dataKey: string;
  tenantType: TenantType;
  profile: WorkbenchProfile;
  tone: WorkbenchWidgetTone;
  minSize: WorkbenchWidgetSize;
  maxSize: WorkbenchWidgetSize;
  sizePresets: Record<WorkbenchWidgetSizePreset, WorkbenchWidgetSize>;
}

export interface WorkbenchWidgetItem {
  widgetKey: string;
  visible: boolean;
  settings: WorkbenchWidgetSettings;
}

export interface WorkbenchLayoutItem extends WorkbenchWidgetItem, WorkbenchWidgetPosition {}

export interface SimpleWorkbenchLayoutItem extends WorkbenchWidgetItem {
  order: number;
  columnOrder: number;
  span: FlowWorkbenchSpan;
  column: SimpleWorkbenchColumn;
}

export interface WorkbenchTemplate {
  tenantType: TenantType;
  profile: WorkbenchProfile;
  revision: number;
  widgets: WorkbenchLayoutItem[];
}

export interface UserWorkbenchLayout {
  version: typeof WORKBENCH_LAYOUT_VERSION;
  templateRevision: number;
  tenantId: string;
  userId: string;
  profile: WorkbenchProfile;
  mode: WorkbenchLayoutMode;
  simpleLayoutType: SimpleWorkbenchLayoutType;
  simpleColumnRatio: SimpleWorkbenchColumnRatio;
  items: WorkbenchLayoutItem[];
  simpleItems: SimpleWorkbenchLayoutItem[];
}

export interface WorkbenchLayoutContext {
  tenant: TenantInfo;
  userId: string;
  profile: WorkbenchProfile;
}

export interface WorkbenchLayoutLoadResult {
  layout: UserWorkbenchLayout;
  hasOverride: boolean;
  recoveryNotice: string | null;
}

export interface WorkbenchMetricData {
  kind: "metric";
  value: string;
  trend: string;
  trendTone: "up" | "down" | "neutral";
}

export interface WorkbenchTrendData {
  kind: "trend";
  labels: string[];
  values: number[];
  summary: string;
}

export interface WorkbenchListItemData {
  id: string;
  title: string;
  meta: string;
  label?: string;
  tone?: WorkbenchWidgetTone;
}

export interface WorkbenchListData {
  kind: "list" | "schedule";
  items: WorkbenchListItemData[];
}

export interface WorkbenchDistributionItemData {
  label: string;
  value: number;
  displayValue: string;
  tone: WorkbenchWidgetTone;
}

export interface WorkbenchDistributionData {
  kind: "distribution";
  items: WorkbenchDistributionItemData[];
}

export interface WorkbenchQuickLinkData {
  id: string;
  name: string;
  kind: "internal";
  target: string;
  openMode?: "current" | "new-tab";
  tenantId?: string;
  icon: MenuIconKey | null;
  moduleId: string;
  moduleName: string;
  moduleIcon: MenuIconKey | null;
}

export interface WorkbenchQuickLinksData {
  kind: "quick-links";
  items: WorkbenchQuickLinkData[];
}

export interface WorkbenchUserOverviewStatData {
  label: string;
  value: number;
  target?: WorkbenchQuickLinkData;
}

export interface WorkbenchUserOverviewData {
  kind: "user-overview";
  name: string;
  initials: string;
  account: string;
  roleName: string;
  stats: WorkbenchUserOverviewStatData[];
}

export interface WorkbenchRankingItemData {
  id: string;
  name: string;
  usage: number;
  trend: string;
  uploads?: number;
}

export interface WorkbenchRankingData {
  kind: "ranking";
  mode?: "application" | "resource";
  items: WorkbenchRankingItemData[];
}

export type WorkbenchEducationChartVariant =
  | "grade-applications"
  | "application-types"
  | "resource-sharing"
  | "resource-growth"
  | "resource-contribution"
  | "subject-resources";

export interface WorkbenchChartSeriesData {
  name: string;
  values: number[];
}

export interface WorkbenchChartMetricData {
  label: string;
  value: string;
  tone?: "primary" | "neutral";
}

export interface WorkbenchEducationChartData {
  kind: "education-chart";
  variant: WorkbenchEducationChartVariant;
  labels: string[];
  series: WorkbenchChartSeriesData[];
  summary?: string;
  unit?: string;
  centerLabel?: string;
  centerValue?: string;
  metrics?: WorkbenchChartMetricData[];
}

export interface WorkbenchActivityRankData {
  kind: "activity-rank";
  rank: number;
  change: number;
  summary: string;
}

export type WorkbenchCalendarEventType = "meeting" | "review" | "task";
export type WorkbenchCalendarEventStatus = "pending" | "completed" | "cancelled";
export type WorkbenchCalendarEventDisplayStatus = WorkbenchCalendarEventStatus | "overdue";

export interface WorkbenchCalendarEventData {
  id: string;
  date: string;
  time: string;
  endTime?: string;
  title: string;
  type: WorkbenchCalendarEventType;
  status: WorkbenchCalendarEventStatus;
  location?: string;
  audience?: string;
  viewedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkbenchCalendarData {
  kind: "calendar";
  events: WorkbenchCalendarEventData[];
}

export interface WorkbenchFeedItemData extends WorkbenchListItemData {
  summary: string;
  source: string;
  unread?: boolean;
}

export interface WorkbenchFeedData {
  kind: "feed";
  items: WorkbenchFeedItemData[];
}

export interface WorkbenchTaskItemData extends WorkbenchListItemData {
  status: "pending" | "completed";
}

export interface WorkbenchTaskCenterData {
  kind: "task-center";
  items: WorkbenchTaskItemData[];
}

export interface WorkbenchSubscriptionItemData extends WorkbenchListItemData {
  subscribed: boolean;
}

export interface WorkbenchSubscriptionsData {
  kind: "subscriptions";
  items: WorkbenchSubscriptionItemData[];
}

export interface WorkbenchGrowthItemData {
  label: string;
  value: number;
  displayValue: string;
}

export interface WorkbenchGrowthData {
  kind: "growth";
  score: string;
  summary: string;
  items: WorkbenchGrowthItemData[];
}

export type WorkbenchWidgetData =
  | WorkbenchMetricData
  | WorkbenchTrendData
  | WorkbenchListData
  | WorkbenchDistributionData
  | WorkbenchQuickLinksData
  | WorkbenchRankingData
  | WorkbenchCalendarData
  | WorkbenchFeedData
  | WorkbenchTaskCenterData
  | WorkbenchSubscriptionsData
  | WorkbenchGrowthData
  | WorkbenchEducationChartData
  | WorkbenchActivityRankData
  | WorkbenchUserOverviewData;

export interface WorkbenchDataContext {
  tenant: TenantInfo;
  profile: WorkbenchProfile;
  userId: string;
  userName?: string;
  userInitials?: string;
  userAccount?: string;
  roleName?: string;
}

export interface WorkbenchDataSource {
  load(
    definition: WorkbenchWidgetDefinition,
    settings: WorkbenchWidgetSettings,
    context: WorkbenchDataContext,
    quickLinks: readonly WorkbenchQuickLinkData[],
  ): Promise<WorkbenchWidgetData>;
}
