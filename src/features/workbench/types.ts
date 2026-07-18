import type { TenantInfo, TenantType } from "@/types/user";

export const WORKBENCH_LAYOUT_VERSION = 1;
export const WORKBENCH_GRID_COLUMNS = 12;

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
  | "activity-rank";
export type WorkbenchWidgetTone = "primary" | "success" | "warning" | "danger" | "neutral";
export type WorkbenchWidgetSizePreset = "small" | "medium" | "large";

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

export interface WorkbenchLayoutItem extends WorkbenchWidgetPosition {
  widgetKey: string;
  visible: boolean;
  settings: WorkbenchWidgetSettings;
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
  items: WorkbenchLayoutItem[];
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
  kind: "internal" | "external";
  target: string;
  openMode?: "current" | "new-tab";
  tenantId?: string;
}

export interface WorkbenchQuickLinksData {
  kind: "quick-links";
  items: WorkbenchQuickLinkData[];
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
export type WorkbenchCalendarEventStatus = "pending" | "completed";

export interface WorkbenchCalendarEventData {
  id: string;
  date: string;
  time: string;
  title: string;
  type: WorkbenchCalendarEventType;
  status: WorkbenchCalendarEventStatus;
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
  | WorkbenchActivityRankData;

export interface WorkbenchDataContext {
  tenant: TenantInfo;
  profile: WorkbenchProfile;
  userId: string;
}

export interface WorkbenchDataSource {
  load(
    definition: WorkbenchWidgetDefinition,
    settings: WorkbenchWidgetSettings,
    context: WorkbenchDataContext,
    quickLinks: readonly WorkbenchQuickLinkData[],
  ): Promise<WorkbenchWidgetData>;
}
