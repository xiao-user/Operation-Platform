import type { MapScope, MapState } from "@/features/digital-twin/map-state";
import {
  smartSportsDashboardData,
  type SmartSportsDashboardTab,
  type SmartSportsRankingData,
  type SmartSportsRankingMetric,
  type SmartSportsRankingRow,
} from "./smart-sports-dashboard-data";

const provinceCoveragePeople = 20_589_193;
const provinceSchoolCount = 553;
const provinceStudentCount = 26_482_382;
const prototypeReferenceDays = 23;

export type SmartSportsDateRange = readonly [string, string];

const scopeScale: Record<MapScope, number> = {
  province: 1,
  city: 0.065,
  district: 0.012,
  township: 0.003,
};

export interface SmartSportsScopeDashboardData {
  coveragePeople: number;
  totalSchools: number;
  totalStudents: number;
  tabs: SmartSportsDashboardTab[];
  ranking: SmartSportsRankingData;
  regionComparisonLabel: string;
}

function stableUnit(seed: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (Math.abs(hash) % 10_001) / 10_000;
}

function dataScale(state: MapState) {
  if (state.scope === "province") return 1;
  return scopeScale[state.scope] * (0.82 + stableUnit(state.code) * 0.36);
}

function inclusiveDateRangeDays(dateRange?: SmartSportsDateRange) {
  if (!dateRange) return prototypeReferenceDays;
  const start = Date.parse(`${dateRange[0]}T00:00:00Z`);
  const end = Date.parse(`${dateRange[1]}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return prototypeReferenceDays;
  }
  return Math.max(1, Math.min(366, Math.round((end - start) / 86_400_000) + 1));
}

function ratioDelta(state: MapState, salt: string) {
  if (state.scope === "province") return 0;
  return (stableUnit(`${state.code}:${salt}`) - 0.5) * 12;
}

function adjustedRatio(value: number, state: MapState, salt: string) {
  return Math.min(99.9, Math.max(1, value + ratioDelta(state, salt)));
}

function scaledInteger(value: number, scale: number, minimum = 1) {
  return Math.max(minimum, Math.round(value * scale));
}

function childRegionNames(state: MapState) {
  if (state.scope === "district" || state.scope === "township") {
    return ["第一实验学校", "第二实验学校", "中心学校", "外国语学校", "体育特色学校"]
      .map((name) => `${state.regionName}${name}`);
  }
  const names = state.geoData.features.flatMap((feature) => {
    const name = feature.properties.name?.trim();
    return name ? [name] : [];
  });
  return names.length > 0
    ? names.slice(0, 5)
    : Array.from({ length: 5 }, (_, index) => `${state.regionName}第${index + 1}区域`);
}

function regionComparisonLabel(scope: MapScope) {
  if (scope === "province") return "地市";
  if (scope === "city") return "区县";
  return "学校";
}

function scaledRankingRow(
  row: SmartSportsRankingRow,
  scale: number,
  state: MapState,
  salt: string,
  name = row.name,
): SmartSportsRankingRow {
  if (row.unit.includes("%")) {
    return {
      ...row,
      name,
      value: Number(adjustedRatio(row.value, state, salt).toFixed(1)),
      decimals: 1,
    };
  }
  if (row.unit.includes("万")) {
    return {
      ...row,
      name,
      value: Number(Math.max(0.1, row.value * scale).toFixed(1)),
      decimals: 1,
    };
  }
  return {
    ...row,
    name,
    value: scaledInteger(row.value, scale),
    decimals: 0,
  };
}

function scopedRunningOverview(
  tab: SmartSportsDashboardTab,
  state: MapState,
  scale: number,
) {
  const source = tab.runningOverview;
  if (!source) return undefined;
  const coveragePeople = scaledInteger(source.coveragePeople, scale);
  const baseIntensityTotal = source.intensity.reduce((sum, item) => sum + item.value, 0);
  const firstValues = source.intensity.slice(0, -1).map((item) => (
    Math.round(coveragePeople * item.value / baseIntensityTotal)
  ));
  const allocated = firstValues.reduce((sum, value) => sum + value, 0);
  return {
    coveragePeople,
    metrics: source.metrics.map((metric) => ({
      ...metric,
      value: metric.scopePrefix
        ? Number((metric.value * scale).toFixed(metric.decimals ?? 0))
        : Number((metric.value * (0.94 + stableUnit(`${state.code}:${metric.label}`) * 0.12))
          .toFixed(metric.decimals ?? 0)),
    })),
    intensity: source.intensity.map((item, index) => ({
      ...item,
      value: index < firstValues.length
        ? firstValues[index]!
        : Math.max(0, coveragePeople - allocated),
    })),
  };
}

function scopedAssessmentRadar(
  tab: SmartSportsDashboardTab,
  state: MapState,
) {
  const source = tab.assessmentRadar;
  if (!source) return undefined;
  return {
    ...source,
    items: source.items.map((item) => ({
      ...item,
      value: Number(
        adjustedRatio(item.value, state, `assessment:radar:${item.id}`).toFixed(1),
      ),
    })),
  };
}

function scopedAssessmentOverview(
  tab: SmartSportsDashboardTab,
  state: MapState,
  scale: number,
) {
  const source = tab.assessmentOverview;
  if (!source) return undefined;
  const assessmentParticipants = scaledInteger(source.assessmentParticipants, scale);
  const baseGradeTotal = source.gradeDistribution.reduce((sum, item) => sum + item.value, 0);
  const firstGradeValues = source.gradeDistribution.slice(0, -1).map((item) => (
    Math.round(assessmentParticipants * item.value / baseGradeTotal)
  ));
  const allocatedGrades = firstGradeValues.reduce((sum, value) => sum + value, 0);
  return {
    coveragePeople: scaledInteger(source.coveragePeople, scale),
    assessmentParticipants,
    totalAssessments: scaledInteger(source.totalAssessments, scale),
    testItemCount: source.testItemCount,
    averageScore: Number(
      adjustedRatio(source.averageScore, state, "assessment:average-score").toFixed(1),
    ),
    standardPassRate: Number(
      adjustedRatio(source.standardPassRate, state, "assessment:standard-pass-rate").toFixed(1),
    ),
    gradeDistribution: source.gradeDistribution.map((item, index) => ({
      ...item,
      value: index < firstGradeValues.length
        ? firstGradeValues[index]!
        : Math.max(0, assessmentParticipants - allocatedGrades),
    })),
  };
}

function scopedTab(
  tab: SmartSportsDashboardTab,
  state: MapState,
  scale: number,
  names: readonly string[],
) {
  return {
    ...tab,
    runningOverview: scopedRunningOverview(tab, state, scale),
    assessmentOverview: scopedAssessmentOverview(tab, state, scale),
    assessmentRadar: scopedAssessmentRadar(tab, state),
    summary: tab.summary.map((item) => {
      const ratio = adjustedRatio(item.ratio, state, `${tab.id}:${item.label}`);
      return { ...item, ratio, value: `${ratio.toFixed(1)}%` };
    }),
    goals: tab.goals.map((goal) => {
      const value = Number(
        adjustedRatio(goal.value, state, `${tab.id}:${goal.label}`).toFixed(1),
      );
      const total = scaledInteger(goal.complete + goal.pending, scale);
      const complete = Math.round(total * value / 100);
      return {
        ...goal,
        label: goal.label.startsWith("本周") || goal.label.startsWith("本学期")
          ? goal.label
          : `${state.regionName}${goal.label.replace(/^省级/, "")}`,
        value,
        complete,
        pending: total - complete,
      };
    }),
    trend: {
      tabs: tab.trend.tabs.map((trend) => ({
        ...trend,
        values: trend.values.map((value, index) => (
          trend.unit === "%"
            ? Number(
                adjustedRatio(value, state, `${tab.id}:${trend.id}:${index}`).toFixed(1),
              )
            : scaledInteger(value, scale)
        )),
      })),
    },
    ranking: tab.ranking
      ? scopedRankingData(tab.ranking, state, scale, names)
      : undefined,
  };
}

function scopedRankingMetric(
  metric: SmartSportsRankingMetric,
  state: MapState,
  scale: number,
  names: readonly string[],
) {
  return {
    ...metric,
    city: metric.city.map((row, index) => scaledRankingRow(
      row,
      scale,
      state,
      `${metric.id}:region:${index}`,
      names[index] ?? row.name,
    )),
    stage: metric.stage.map((row, index) => scaledRankingRow(
      row,
      scale,
      state,
      `${metric.id}:stage:${index}`,
    )),
  };
}

function scopedRankingData(
  ranking: SmartSportsRankingData,
  state: MapState,
  scale: number,
  names: readonly string[],
): SmartSportsRankingData {
  return {
    metrics: ranking.metrics.map((metric) => (
      scopedRankingMetric(metric, state, scale, names)
    )),
    top5Options: [...ranking.top5Options],
    top5: Object.fromEntries(
      Object.entries(ranking.top5).map(([key, comparisons]) => [
        key,
        {
          city: comparisons.city.map((row, index) => scaledRankingRow(
            row,
            scale,
            state,
            `${key}:region:${index}`,
            names[index] ?? row.name,
          )),
          stage: comparisons.stage.map((row, index) => scaledRankingRow(
            row,
            scale,
            state,
            `${key}:stage:${index}`,
          )),
        },
      ]),
    ),
  };
}

export function createSmartSportsScopeDashboardData(
  state: MapState,
  dateRange?: SmartSportsDateRange,
): SmartSportsScopeDashboardData {
  const geographyScale = dataScale(state);
  const activityScale = geographyScale
    * inclusiveDateRangeDays(dateRange) / prototypeReferenceDays;
  const names = childRegionNames(state);
  return {
    coveragePeople: scaledInteger(provinceCoveragePeople, activityScale),
    totalSchools: scaledInteger(provinceSchoolCount, geographyScale),
    totalStudents: scaledInteger(provinceStudentCount, geographyScale),
    tabs: smartSportsDashboardData.tabs.map(
      (tab) => scopedTab(tab, state, activityScale, names),
    ),
    ranking: scopedRankingData(
      smartSportsDashboardData.ranking,
      state,
      activityScale,
      names,
    ),
    regionComparisonLabel: regionComparisonLabel(state.scope),
  };
}
