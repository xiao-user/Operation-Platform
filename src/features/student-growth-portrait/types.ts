export type StudentGrowthTopicKey =
  | "overview"
  | "five-education"
  | "academic"
  | "honor"
  | "sports-health"
  | "mental-health"
  | "growth-support"
  | "behavior-life"
  | "practice"
  | "daily-evaluation";

export type MetricTone = "primary" | "success" | "warning" | "neutral";

export interface MetricSnapshot {
  label: string;
  value: string;
  unit?: string;
  change?: string;
  tone?: MetricTone;
}

export interface ChartSeriesDefinition {
  name: string;
  values: number[];
}

export interface TopicChartDefinition {
  type: "line" | "bar" | "pie" | "radar";
  title: string;
  categories: string[];
  series: ChartSeriesDefinition[];
  max?: number;
}

export interface TopicDetailRow {
  name: string;
  scope: string;
  value: string;
  change: string;
  status: "优秀" | "良好" | "平稳" | "需关注";
}

export interface StudentGrowthTopicDefinition {
  key: Exclude<StudentGrowthTopicKey, "overview" | "mental-health">;
  label: string;
  description: string;
  metrics: MetricSnapshot[];
  chart: TopicChartDefinition;
  insights: string[];
  details: TopicDetailRow[];
  sourceLabel: string;
  comparableScope: string;
}

export interface SchoolGrowthRecord {
  id: string;
  name: string;
  stage: string;
  students: number;
  fiveEducation: number;
  academicProgress: number;
  physicalHealth: number;
  activityParticipation: number;
  trend: "上升" | "平稳" | "下降";
  attention: string;
}

export interface FollowUpRecord {
  id: string;
  title: string;
  domain: string;
  schoolCount: number;
  schools: string;
  status: "待研判" | "跟进中" | "已改善";
  updatedAt: string;
}
