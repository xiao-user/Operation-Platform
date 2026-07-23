import type { EnergyTowerValueFrame, MapState } from "@/features/digital-twin/map-state";
import type { SmartSportsDashboardTabId } from "./smart-sports-dashboard-data";
import {
  createSmartSportsScopeDashboardData,
  type SmartSportsDateRange,
} from "./smart-sports-scope-data";

export type SmartSportsEnergyTowerValueFrame = EnergyTowerValueFrame;

export function remapEnergyTowerValues(
  baseValues: Readonly<Record<string, number>>,
  targetTotal: number,
): { values: Record<string, number>; total: number } {
  const entries = Object.entries(baseValues);
  const baseTotal = entries.reduce((sum, [, value]) => sum + value, 0);
  const safeTarget = Math.max(0, Math.round(targetTotal));
  if (entries.length === 0 || baseTotal <= 0 || safeTarget === 0) {
    return { values: {}, total: 0 };
  }

  const exact = entries.map(([code, value]) => ({
    code,
    exact: safeTarget * value / baseTotal,
  }));
  const floors = exact.map((item) => ({
    code: item.code,
    value: Math.floor(item.exact),
    fraction: item.exact - Math.floor(item.exact),
  }));
  let remaining = safeTarget - floors.reduce((sum, item) => sum + item.value, 0);
  floors.sort((left, right) => (
    right.fraction - left.fraction || left.code.localeCompare(right.code)
  ));
  for (let index = 0; remaining > 0 && index < floors.length; index += 1, remaining -= 1) {
    floors[index]!.value += 1;
  }

  return {
    values: Object.fromEntries(floors.map((item) => [item.code, item.value])),
    total: safeTarget,
  };
}

function runningPeopleTotal(mapState: MapState, dateRange?: SmartSportsDateRange) {
  const overview = createSmartSportsScopeDashboardData(mapState, dateRange).tabs
    .find((tab) => tab.id === "running")
    ?.runningOverview;
  const metric = overview?.metrics.find((item) => item.label === "累计运动人数");
  return Math.round(metric?.value ?? overview?.coveragePeople ?? 0);
}

function assessmentPeopleTotal(mapState: MapState, dateRange?: SmartSportsDateRange) {
  const overview = createSmartSportsScopeDashboardData(mapState, dateRange).tabs
    .find((tab) => tab.id === "assessment")
    ?.assessmentOverview;
  return overview?.assessmentParticipants ?? 0;
}

function overviewPeopleTotal(mapState: MapState, dateRange?: SmartSportsDateRange) {
  return createSmartSportsScopeDashboardData(mapState, dateRange).coveragePeople;
}

/**
 * Every sports metric frame reuses the map-data-source spatial weights.
 * Only values and presentation metadata change; tower topology remains stable.
 */
export function createSmartSportsEnergyTowerValueFrame(
  tabId: SmartSportsDashboardTabId,
  mapState: MapState,
  dateRange?: SmartSportsDateRange,
): SmartSportsEnergyTowerValueFrame | undefined {
  if (mapState.energyTowerMetric !== "coverage-population") return undefined;

  const metricLabel = tabId === "overview"
    ? "覆盖人数"
    : tabId === "running" ? "运动人数" : "体测人数";
  const targetTotal = tabId === "overview"
    ? overviewPeopleTotal(mapState, dateRange)
    : tabId === "running"
      ? runningPeopleTotal(mapState, dateRange)
      : assessmentPeopleTotal(mapState, dateRange);
  const remapped = remapEnergyTowerValues(mapState.energyTowerValues ?? {}, targetTotal);
  if (remapped.total <= 0) return undefined;

  return {
    values: remapped.values,
    total: remapped.total,
    metricLabel,
  };
}
