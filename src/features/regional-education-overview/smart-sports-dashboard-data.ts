import dashboardFixture from "./smart-sports-dashboard.mock.json";

export type SmartSportsDashboardTabId = "overview" | "running" | "assessment";
export type SmartSportsComparisonMode = "city" | "stage";
export type SmartSportsMetricId = "coverage" | "participation" | "people" | "schools";

export interface SmartSportsSummaryMetric {
  label: string;
  value: string;
  ratio: number;
}

export interface SmartSportsGoal {
  label: string;
  value: number;
  complete: number;
  pending: number;
}

export interface SmartSportsTrend {
  id: string;
  label: string;
  unit: string;
  values: number[];
}

export interface SmartSportsDashboardTab {
  id: SmartSportsDashboardTabId;
  label: string;
  summary: SmartSportsSummaryMetric[];
  goals: SmartSportsGoal[];
  trend: { tabs: SmartSportsTrend[] };
}

export interface SmartSportsRankingMetric {
  id: SmartSportsMetricId;
  label: string;
  shortLabel: string;
  city: [string, string][];
  stage: [string, string][];
}

export const smartSportsDashboardData = dashboardFixture as unknown as {
  tabs: SmartSportsDashboardTab[];
  ranking: {
    metrics: SmartSportsRankingMetric[];
    top5Options: string[];
    top5: Record<string, Record<SmartSportsComparisonMode, [string, string][]>>;
  };
};

export function findDashboardTab(id: SmartSportsDashboardTabId) {
  return smartSportsDashboardData.tabs.find((item) => item.id === id)
    ?? smartSportsDashboardData.tabs[0]!;
}

export function findRankingMetric(id: SmartSportsMetricId) {
  return smartSportsDashboardData.ranking.metrics.find((item) => item.id === id)
    ?? smartSportsDashboardData.ranking.metrics[0]!;
}
