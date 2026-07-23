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

export interface SmartSportsRunningMetric {
  label: string;
  value: number;
  unit: string;
  decimals?: number;
  scopePrefix?: boolean;
}

export interface SmartSportsRunningOverview {
  coveragePeople: number;
  metrics: SmartSportsRunningMetric[];
  intensity: { label: string; value: number }[];
}

export interface SmartSportsAssessmentRadarItem {
  id: string;
  label: string;
  value: number;
}

export interface SmartSportsAssessmentRadar {
  items: SmartSportsAssessmentRadarItem[];
  defaultVisibleCount: number;
}

export interface SmartSportsAssessmentOverview {
  coveragePeople: number;
  assessmentParticipants: number;
  totalAssessments: number;
  testItemCount: number;
  averageScore: number;
  standardPassRate: number;
  gradeDistribution: { label: string; value: number }[];
}

export interface SmartSportsDashboardTab {
  id: SmartSportsDashboardTabId;
  label: string;
  runningOverview?: SmartSportsRunningOverview;
  assessmentOverview?: SmartSportsAssessmentOverview;
  assessmentRadar?: SmartSportsAssessmentRadar;
  summary: SmartSportsSummaryMetric[];
  goals: SmartSportsGoal[];
  trend: { tabs: SmartSportsTrend[] };
  ranking?: SmartSportsRankingData;
}

export interface SmartSportsRankingMetric {
  id: SmartSportsMetricId;
  label: string;
  shortLabel: string;
  city: SmartSportsRankingRow[];
  stage: SmartSportsRankingRow[];
}

export interface SmartSportsRankingRow {
  name: string;
  value: number;
  unit: string;
  decimals: number;
}

export interface SmartSportsRankingData {
  metrics: SmartSportsRankingMetric[];
  top5Options: string[];
  top5: Record<string, Record<SmartSportsComparisonMode, SmartSportsRankingRow[]>>;
}

type RawRankingRow = [string, string];
type RawRankingMetric = Omit<SmartSportsRankingMetric, "city" | "stage"> & {
  city: RawRankingRow[];
  stage: RawRankingRow[];
};
type RawRankingData = Omit<SmartSportsRankingData, "metrics" | "top5"> & {
  metrics: RawRankingMetric[];
  top5: Record<string, Record<SmartSportsComparisonMode, RawRankingRow[]>>;
};
type RawDashboardTab = Omit<SmartSportsDashboardTab, "ranking"> & {
  ranking?: RawRankingData | null;
};

function rankingRow([name, displayValue]: RawRankingRow): SmartSportsRankingRow {
  const match = displayValue.trim().match(/^([\d,.]+)(.*)$/);
  if (!match) {
    throw new Error(`Invalid smart-sports ranking value: ${displayValue}`);
  }
  const numericText = match[1]!.replace(/,/g, "");
  const value = Number(numericText);
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid smart-sports ranking number: ${displayValue}`);
  }
  return {
    name,
    value,
    unit: match[2]!,
    decimals: numericText.includes(".") ? numericText.split(".")[1]!.length : 0,
  };
}

function rankingData(data?: RawRankingData | null): SmartSportsRankingData | undefined {
  if (!data) return undefined;
  return {
    metrics: data.metrics.map((metric) => ({
      ...metric,
      city: metric.city.map(rankingRow),
      stage: metric.stage.map(rankingRow),
    })),
    top5Options: [...data.top5Options],
    top5: Object.fromEntries(
      Object.entries(data.top5).map(([key, comparisons]) => [
        key,
        {
          city: comparisons.city.map(rankingRow),
          stage: comparisons.stage.map(rankingRow),
        },
      ]),
    ),
  };
}

const rawDashboardFixture = dashboardFixture as unknown as {
  tabs: RawDashboardTab[];
  ranking: RawRankingData;
};

export const smartSportsDashboardData: {
  tabs: SmartSportsDashboardTab[];
  ranking: SmartSportsRankingData;
} = {
  tabs: rawDashboardFixture.tabs.map((tab) => ({
    ...tab,
    ranking: rankingData(tab.ranking),
  })),
  ranking: rankingData(rawDashboardFixture.ranking)!,
};

export function findDashboardTab(id: SmartSportsDashboardTabId) {
  return smartSportsDashboardData.tabs.find((item) => item.id === id)
    ?? smartSportsDashboardData.tabs[0]!;
}

export function findRankingMetric(id: SmartSportsMetricId) {
  return smartSportsDashboardData.ranking.metrics.find((item) => item.id === id)
    ?? smartSportsDashboardData.ranking.metrics[0]!;
}
