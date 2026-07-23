<script setup lang="ts">
import { computed, ref, watch, type CSSProperties } from "vue";
import type { EChartsCoreOption } from "echarts/core";
import { ElDatePicker } from "element-plus";
import rankingFrameUrl from "@/assets/figma/smart-sports/rank-frame.svg";
import AnimatedNumber from "@/features/digital-twin/components/AnimatedNumber.vue";
import EChartCanvas from "@/features/digital-twin/components/dashboard/EChartCanvas.vue";
import type { MapNavigationNode } from "@/features/digital-twin/map-state";
import type { DigitalTwinChartPalette } from "@/features/digital-twin/map-themes";
import {
  findDashboardTab,
  findRankingMetric,
  smartSportsDashboardData,
  type SmartSportsComparisonMode,
  type SmartSportsDashboardTabId,
  type SmartSportsMetricId,
} from "../smart-sports-dashboard-data";

const props = defineProps<{
  scopeName: string;
  scopePath: readonly MapNavigationNode[];
  palette: DigitalTwinChartPalette;
  coverageLabel: string;
  dateRange: readonly [string, string];
}>();

const emit = defineEmits<{
  scopeBack: [];
  scopeNavigate: [code: string];
  dateRangeChange: [range: [string, string]];
}>();

const activeDashboard = ref<SmartSportsDashboardTabId>("overview");
const comparisonMode = ref<SmartSportsComparisonMode>("city");
const activeMetric = ref<SmartSportsMetricId>("coverage");
const activeTrendId = ref(findDashboardTab(activeDashboard.value).trend.tabs[0]!.id);
const activeTop5 = ref(smartSportsDashboardData.ranking.top5Options[0]!);
const coveragePeople = 20_589_193;
const totalSchools = 553;
const totalStudents = 26_482_382;
const gaugeDangerColor = "#ff3b30";
const gaugeTrackColor = "rgba(255,255,255,0.14)";
const gaugeLabelColor = "rgba(255,255,255,0.48)";
const rankingFrameStyle = {
  maskImage: `url("${rankingFrameUrl}")`,
  WebkitMaskImage: `url("${rankingFrameUrl}")`,
} satisfies CSSProperties;

const dashboard = computed(() => findDashboardTab(activeDashboard.value));
const metric = computed(() => findRankingMetric(activeMetric.value));
const trend = computed(() => dashboard.value.trend.tabs.find((item) => item.id === activeTrendId.value)
  ?? dashboard.value.trend.tabs[0]!);
const rankingRows = computed(() => metric.value[comparisonMode.value]);
const rankingName = computed(() => comparisonMode.value === "city" ? "地市" : "学段");
const topRankingRows = computed(() => (
  smartSportsDashboardData.ranking.top5[activeTop5.value]?.[comparisonMode.value] ?? []
));
const topRank = computed(() => rankingRows.value[0]);

const trendOption = computed<EChartsCoreOption>(() => ({
  animationDuration: 360,
  animationEasing: "cubicOut",
  grid: { top: 8, right: 0, bottom: 16, left: 28, containLabel: false },
  xAxis: {
    type: "category",
    boundaryGap: false,
    data: ["01", "02", "03", "04", "05", "06", "07"],
    axisLine: { lineStyle: { color: props.palette.series1.subtle } },
    axisTick: { show: false },
    axisLabel: { color: props.palette.series1.medium, fontFamily: "D-DIN", fontSize: 12 },
  },
  yAxis: {
    type: "value",
    min: 0,
    max: 500,
    interval: 100,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: props.palette.series1.medium, fontFamily: "D-DIN", fontSize: 12 },
    splitLine: { lineStyle: { color: props.palette.series1.subtle, type: "dashed" } },
  },
  tooltip: {
    trigger: "axis",
    borderWidth: 1,
    borderColor: props.palette.series2.medium,
    backgroundColor: props.palette.echartsBackground,
    textStyle: { color: props.palette.series1.strong },
    valueFormatter: (value: string | number) => `${value}${trend.value.unit}`,
  },
  series: [{
    type: "bar",
    name: trend.value.label,
    data: trend.value.values,
    barWidth: 16,
    itemStyle: {
      color: {
        type: "linear",
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          { offset: 0, color: props.palette.series1.strong },
          { offset: 1, color: props.palette.series1.subtle },
        ],
      },
    },
  }],
}));

function goalOption(value: number, index: number): EChartsCoreOption {
  const progressColor = index === 1 ? gaugeDangerColor : props.palette.series2.strong;
  return {
    animationDuration: 760,
    animationEasing: "cubicOut",
    graphic: [
      { type: "text", left: "46%", top: "15%", style: { text: "55", fill: gaugeLabelColor, font: "12px D-DIN, sans-serif", textAlign: "center" } },
      { type: "text", left: "22%", top: "84%", style: { text: "0", fill: gaugeLabelColor, font: "12px D-DIN, sans-serif", textAlign: "center" } },
      { type: "text", left: "72%", top: "84%", style: { text: "100", fill: gaugeLabelColor, font: "12px D-DIN, sans-serif", textAlign: "center" } },
    ],
    series: [
      {
        type: "gauge",
        startAngle: 220,
        endAngle: -40,
        min: 0,
        max: 100,
        radius: "98%",
        center: ["50%", "55%"],
        axisLine: { lineStyle: { width: 1.5, color: [[1, progressColor]] } },
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: { show: false },
      },
      {
        type: "gauge",
        startAngle: 220,
        endAngle: -40,
        min: 0,
        max: 100,
        radius: "88%",
        center: ["50%", "55%"],
        progress: { show: true, width: 7, roundCap: true, itemStyle: { color: progressColor } },
        axisLine: { lineStyle: { width: 7, color: [[1, gaugeTrackColor]] } },
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        title: { show: false },
        detail: {
          valueAnimation: true,
          formatter: "{value|{value}}{unit|%}",
          rich: {
            value: { color: props.palette.series1.strong, fontFamily: "D-DIN", fontSize: 32, fontWeight: 700 },
            unit: { color: props.palette.series1.strong, fontFamily: "D-DIN", fontSize: 14, fontWeight: 500, padding: [6, 0, 0, 1] },
          },
          offsetCenter: [0, "8%"],
        },
        data: [{ value }],
      },
    ],
  };
}

function navigateTo(node: MapNavigationNode) {
  if (node.code) emit("scopeNavigate", node.code);
  else emit("scopeBack");
}

function selectDashboard(id: SmartSportsDashboardTabId) {
  activeDashboard.value = id;
}

function metricWholeNumber(value: string) {
  return Math.round(Number.parseFloat(value));
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function metricLevel(ratio: number) {
  if (ratio < 60) return "is-danger";
  if (ratio < 80) return "is-normal";
  return "is-success";
}

function updateDateRange(value: unknown) {
  if (!Array.isArray(value) || value.length !== 2) return;
  const [start, end] = value;
  if (typeof start === "string" && typeof end === "string") {
    emit("dateRangeChange", [start, end]);
  }
}

watch(dashboard, (nextDashboard) => {
  activeTrendId.value = nextDashboard.trend.tabs[0]!.id;
});
</script>

<template>
  <section
    class="smart-sports-hud"
    aria-label="智慧体育数据概览"
  >
    <div class="sports-date-range" role="group" aria-label="智慧体育统计时间">
      <span>统计时间</span>
      <ElDatePicker
        :model-value="[...dateRange]"
        type="daterange"
        value-format="YYYY-MM-DD"
        format="YYYY-MM-DD"
        range-separator="至"
        start-placeholder="开始时间"
        end-placeholder="结束时间"
        :clearable="false"
        :editable="false"
        :teleported="true"
        popper-class="smart-sports-date-picker-popper"
        aria-label="智慧体育开始时间和结束时间"
        @update:model-value="updateDateRange"
      />
    </div>

    <aside class="sports-summary" aria-label="智慧体育范围概览">
      <nav v-if="scopePath.length > 1" class="scope-breadcrumb" aria-label="地图下钻路径">
        <template v-for="(node, index) in scopePath" :key="`${node.scope}-${node.code}`">
          <button v-if="index < scopePath.length - 1" type="button" @click="navigateTo(node)">
            {{ node.name }}
          </button>
          <h2 v-else>{{ node.name }}</h2>
          <span v-if="index < scopePath.length - 1" aria-hidden="true">/</span>
        </template>
      </nav>
      <h2 v-else>{{ scopeName }}</h2>

      <dl class="sports-summary__primary">
        <div><dt>全省覆盖人数</dt><dd><AnimatedNumber :value="coveragePeople" :formatter="formatInteger" /></dd></div>
        <div><dt>学校总数</dt><dd><AnimatedNumber :value="totalSchools" :formatter="formatInteger" /></dd></div>
        <div><dt>学生总数</dt><dd><AnimatedNumber :value="totalStudents" :formatter="formatInteger" /></dd></div>
      </dl>

      <ul class="sports-summary__metrics">
        <li v-for="item in dashboard.summary" :key="item.label">
          <strong><AnimatedNumber :value="metricWholeNumber(item.value)" /><small>%</small></strong>
          <div>
            <span>{{ item.label }}</span>
            <i aria-hidden="true"><b :class="metricLevel(item.ratio)" :style="{ width: `${item.ratio}%` }" /></i>
          </div>
        </li>
      </ul>
    </aside>

    <aside class="sports-ranking" aria-label="区域指标排名">
      <div class="sports-ranking__global-tabs" role="tablist" aria-label="智慧体育数据类型">
        <button
          v-for="item in smartSportsDashboardData.tabs"
          :key="item.id"
          type="button"
          role="tab"
          :aria-selected="activeDashboard === item.id"
          :class="{ 'is-active': activeDashboard === item.id }"
          @click="selectDashboard(item.id)"
        >{{ item.label }}</button>
      </div>

      <section class="ranking-panel">
        <div class="ranking-panel__heading">
          <h2>区域指标排名</h2>
          <div class="comparison-toggle" role="group" aria-label="排行榜对比维度">
            <button
              type="button"
              :aria-pressed="comparisonMode === 'city'"
              @click="comparisonMode = 'city'"
            >地市对比</button>
            <button
              type="button"
              :aria-pressed="comparisonMode === 'stage'"
              @click="comparisonMode = 'stage'"
            >学段对比</button>
          </div>
        </div>

        <div v-if="topRank" class="ranking-panel__leader">
          <span>第 <strong>1</strong> 名</span>
          <b>{{ topRank[0] }}</b>
          <small>{{ scopeName }} · 实时汇总</small>
        </div>

        <div class="metric-tabs" role="tablist" aria-label="区域指标">
          <button
            v-for="item in smartSportsDashboardData.ranking.metrics"
            :key="item.id"
            type="button"
            role="tab"
            :aria-selected="activeMetric === item.id"
            :class="{ 'is-active': activeMetric === item.id }"
            @click="activeMetric = item.id"
          >{{ item.label }}</button>
        </div>

        <div class="ranking-table" role="table" :aria-label="`${rankingName}${metric.label}排行榜`">
          <div class="ranking-table__head" role="row"><span>排名</span><span>{{ rankingName }}</span><span>{{ metric.shortLabel }}</span></div>
          <div v-for="([name, value], index) in rankingRows" :key="name" class="ranking-table__row" role="row">
            <strong><i class="ranking-table__rank-frame" :style="rankingFrameStyle" aria-hidden="true" /><span>{{ index + 1 }}</span></strong><span>{{ name }}</span><b>{{ value }}</b>
          </div>
        </div>
      </section>

      <section class="ranking-panel ranking-panel--compact">
        <div class="ranking-panel__heading">
          <h2>区域概览 TOP5</h2>
          <label class="top-five-select">项目
            <select v-model="activeTop5" aria-label="区域概览项目">
              <option v-for="option in smartSportsDashboardData.ranking.top5Options" :key="option" :value="option">{{ option }}</option>
            </select>
          </label>
        </div>
        <div class="ranking-table ranking-table--compact" role="table" :aria-label="`${activeTop5}${metric.shortLabel}排行榜`">
          <div class="ranking-table__head" role="row"><span>排名</span><span>{{ rankingName }}</span><span>{{ metric.shortLabel }}</span></div>
          <div v-for="([name, value], index) in topRankingRows" :key="name" class="ranking-table__row" role="row">
            <strong><i class="ranking-table__rank-frame" :style="rankingFrameStyle" aria-hidden="true" /><span>{{ index + 1 }}</span></strong><span>{{ name }}</span><b>{{ value }}</b>
          </div>
        </div>
      </section>
    </aside>

    <section class="sports-goals" aria-label="省级健康目标达成">
      <article v-for="(goal, index) in dashboard.goals" :key="goal.label" class="sports-goal-card">
        <h2>{{ goal.label }}</h2>
        <div class="sports-goal-card__content">
          <EChartCanvas :class="{ 'is-secondary': index === 1 }" :option="goalOption(goal.value, index)" :ariaLabelText="`${goal.label} ${goal.value}%`" />
          <div class="sports-goal-card__stats">
            <p><AnimatedNumber :value="metricWholeNumber(`${goal.value}`)" />%</p>
            <dl><div><dt>已完成</dt><dd class="is-complete"><AnimatedNumber :value="goal.complete" :formatter="formatInteger" /></dd></div><div><dt>未完成</dt><dd class="is-pending"><AnimatedNumber :value="goal.pending" :formatter="formatInteger" /></dd></div></dl>
          </div>
        </div>
      </article>

      <article class="sports-trend-card">
        <div class="sports-trend-card__heading">
          <div role="tablist" aria-label="全省趋势指标">
            <button
              v-for="item in dashboard.trend.tabs"
              :key="item.id"
              type="button"
              role="tab"
              :aria-selected="activeTrendId === item.id"
              :class="{ 'is-active': activeTrendId === item.id }"
              @click="activeTrendId = item.id"
            >{{ item.label }}</button>
          </div>
        </div>
        <EChartCanvas class="sports-trend-card__chart" :option="trendOption" :ariaLabelText="`全省${trend.label}趋势图`" />
      </article>
    </section>
    <p class="sr-only">{{ coverageLabel }}。公开地图原型数据。</p>
  </section>
</template>

<style scoped>
.smart-sports-hud { --sports-number-font: "D-DIN", "DIN Alternate", "Arial Narrow", var(--dt-font-family); --sports-rank-first: #ffd166; --sports-rank-second: #66d9ff; --sports-rank-third: #ff9b6a; --sports-rank-default: var(--normal--white--100); position: absolute; inset: 0; pointer-events: none !important; color: var(--dt-color-text); font-size: var(--dt-font-size-sm); font-weight: var(--dt-font-weight-light); }
.sports-summary, .sports-ranking, .sports-goals, .sports-date-range { pointer-events: auto; }
.sports-date-range { position: absolute; z-index: 1; top: calc(var(--dt-right-panel-top) - var(--dt-topbar-height)); right: var(--dt-ai-entry-right); display: flex; box-sizing: border-box; width: 280px; height: 40px; color: var(--dt-color-text-muted); align-items: center; gap: var(--dt-space-2); white-space: nowrap; }
.sports-date-range > span { flex: 0 0 auto; font-size: var(--dt-font-size-xs); }
.sports-date-range :deep(.el-date-editor) { --el-input-bg-color: var(--normal--white--5); --el-input-border-color: var(--dt-color-line); --el-input-hover-border-color: var(--dt-color-accent); --el-input-focus-border-color: var(--dt-color-accent); --el-input-text-color: var(--dt-color-text-secondary); --el-text-color-regular: var(--dt-color-text-secondary); --el-text-color-placeholder: var(--dt-color-text-muted); width: 100%; height: 32px; border-radius: var(--dt-radius-xs); padding: 0 var(--dt-space-2); box-shadow: 0 0 0 var(--dt-border-width) var(--dt-color-line) inset; background: var(--normal--white--5); }
.sports-date-range :deep(.el-range-input), .sports-date-range :deep(.el-range-separator) { color: var(--dt-color-text-secondary); font-family: var(--sports-number-font); font-size: var(--dt-font-size-xs); font-variant-numeric: tabular-nums; }
.sports-date-range :deep(.el-range__icon) { color: var(--dt-color-accent); }
.sports-date-range :deep(.el-range__close-icon) { display: none; }
.sports-summary { position: absolute; top: calc(var(--dt-left-panel-top) - var(--dt-topbar-height)); left: var(--dt-left-panel-left); width: var(--dt-left-panel-width); }
.sports-summary h2, .ranking-panel h2, .sports-goal-card h2, .sports-trend-card h2 { margin: 0; color: var(--dt-color-text); font-size: var(--dt-font-size-md); font-weight: var(--dt-font-weight-light); line-height: var(--dt-line-height-md); }
.scope-breadcrumb { display: flex; max-width: 340px; align-items: center; gap: var(--dt-space-2); white-space: nowrap; }
.scope-breadcrumb button { border: 0; padding: 0; background: transparent; color: var(--dt-color-text-secondary); cursor: pointer; font: inherit; }
.scope-breadcrumb button:hover { color: var(--charts--2-100); }
.scope-breadcrumb > span { color: var(--dt-color-text-muted); }
.sports-summary__primary { display: grid; margin: 24px 0 0; gap: 16px; }
.sports-summary__primary div { display: grid; gap: 4px; }
.sports-summary dt { color: var(--dt-color-text-secondary); font-size: var(--dt-font-size-sm); line-height: var(--dt-line-height-sm); font-weight: var(--dt-font-weight-light); }
.sports-summary dd { margin: 0; color: var(--dt-color-text); font-family: var(--sports-number-font); font-size: 28px; font-weight: var(--dt-font-weight-regular); line-height: 36px; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.sports-summary__primary div:first-child dd { color: var(--dt-color-text-strong); font-weight: var(--dt-font-weight-bold); }
.sports-summary__metrics { display: grid; margin: 16px 0 0; padding: 0; list-style: none; gap: 16px; }
.sports-summary__metrics li { display: grid; grid-template-columns: 48px 1fr; align-items: center; gap: 16px; }
.sports-summary__metrics > li > strong { color: var(--dt-color-text); font-family: var(--sports-number-font); font-size: 28px; font-weight: var(--dt-font-weight-regular); line-height: 36px; letter-spacing: -0.02em; white-space: nowrap; }
.sports-summary__metrics small { margin-left: 1px; font-size: var(--dt-font-size-sm); font-weight: var(--dt-font-weight-medium); }
.sports-summary__metrics li > div { display: grid; gap: 4px; color: var(--dt-color-text-secondary); white-space: nowrap; }
.sports-summary__metrics i { display: block; width: 108px; height: 4px; overflow: hidden; background: var(--charts--1-10); }
.sports-summary__metrics b { display: block; height: 100%; }
.sports-summary__metrics b.is-danger { background: linear-gradient(90deg, var(--dt-color-danger), var(--charts--1-100)); }
.sports-summary__metrics b.is-normal { background: linear-gradient(90deg, var(--charts--2-100), var(--charts--1-100)); }
.sports-summary__metrics b.is-success { background: linear-gradient(90deg, var(--charts--3-100), var(--charts--1-100)); }
.sports-ranking { position: absolute; top: calc(var(--dt-right-panel-top) - var(--dt-topbar-height)); right: var(--dt-right-panel-right); width: var(--dt-right-panel-width); }
.sports-ranking__global-tabs { display: grid; grid-template-columns: repeat(3, 1fr); height: 40px; gap: var(--dt-space-4); }
.sports-ranking__global-tabs button, .metric-tabs button, .sports-trend-card button, .comparison-toggle button { border: 0; background: transparent; color: var(--dt-color-text-muted); cursor: pointer; font: inherit; }
.sports-ranking__global-tabs button { min-width: 0; padding: 0 var(--dt-space-3); font-size: var(--dt-font-size-md); line-height: 40px; }
.sports-ranking__global-tabs button.is-active { color: var(--dt-color-text); background: var(--dt-color-panel-raised); }
.ranking-panel { margin-top: 40px; padding: 0; border: 0; background: transparent; }
.ranking-panel__heading { display: flex; min-height: 32px; justify-content: space-between; gap: var(--dt-space-3); align-items: center; }
.ranking-panel__heading h2 { font-size: var(--dt-font-size-lg); line-height: var(--dt-line-height-lg); font-weight: var(--dt-font-weight-regular); }
.comparison-toggle { display: flex; align-items: center; gap: var(--dt-space-2); }
.comparison-toggle button { height: 24px; padding: 0 var(--dt-space-2); color: var(--dt-color-text-muted); font-size: var(--dt-font-size-xs); line-height: var(--dt-line-height-xs); }
.comparison-toggle button[aria-pressed="true"] { border: 1px solid var(--dt-color-accent); color: var(--dt-color-text); }
.ranking-panel__leader { display: flex; margin-top: 24px; align-items: baseline; gap: var(--dt-space-4); white-space: nowrap; }
.ranking-panel__leader span { display: flex; color: var(--dt-color-text-secondary); font-size: var(--dt-font-size-sm); align-items: baseline; gap: 4px; }
.ranking-panel__leader strong { color: var(--dt-color-text-strong); font-family: var(--sports-number-font); font-size: 54px; font-weight: var(--dt-font-weight-bold); line-height: 58px; }
.ranking-panel__leader b { color: var(--dt-color-text); font-size: var(--dt-font-size-md); font-weight: var(--dt-font-weight-light); }
.ranking-panel__leader small { margin-left: auto; color: var(--dt-color-text-secondary); font-size: var(--dt-font-size-sm); }
.metric-tabs { display: flex; height: 34px; margin-top: 24px; border-bottom: 1px solid var(--dt-color-border-muted); align-items: flex-start; }
.metric-tabs button { position: relative; padding: 0 var(--dt-space-3) 12px; font-size: var(--dt-font-size-md); line-height: 20px; white-space: nowrap; }
.metric-tabs button:first-child { padding-left: 0; }
.metric-tabs button + button::before { position: absolute; top: 2px; left: 0; width: 1px; height: 16px; background: var(--dt-color-border-muted); content: ""; }
.metric-tabs button.is-active { color: var(--dt-color-text); }
.metric-tabs button.is-active::after { position: absolute; right: var(--dt-space-3); bottom: -1px; left: 0; height: 2px; background: var(--charts--2-100); content: ""; }
.ranking-table { margin-top: 16px; border: 0; padding: 16px; background: var(--dt-detail-card-background); backdrop-filter: blur(var(--dt-detail-card-blur)); }
.ranking-table__head, .ranking-table__row { display: grid; grid-template-columns: 56px 1fr auto; min-height: 36px; align-items: center; gap: var(--dt-space-2); }
.ranking-table__head { min-height: 36px; color: var(--dt-color-text-muted); font-size: var(--dt-font-size-sm); }
.ranking-table__row { padding: var(--dt-space-2); color: var(--dt-color-text-secondary); }
.ranking-table__row:nth-child(even) { background: var(--dt-color-panel-raised); }
.ranking-table__row strong { position: relative; display: grid; width: 27px; height: 27px; place-items: center; color: var(--sports-rank-default); font-family: var(--sports-number-font); font-size: var(--dt-font-size-md); font-weight: var(--dt-font-weight-regular); }
.ranking-table__row:nth-child(2) strong { color: var(--sports-rank-first); }
.ranking-table__row:nth-child(3) strong { color: var(--sports-rank-second); }
.ranking-table__row:nth-child(4) strong { color: var(--sports-rank-third); }
.ranking-table__rank-frame { position: absolute; inset: 0; display: block; width: 27px; height: 27px; background: currentColor; -webkit-mask-position: center; mask-position: center; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-size: contain; mask-size: contain; pointer-events: none; }
.ranking-table__row strong span { position: relative; z-index: 1; }
.ranking-table__row b { color: var(--charts--2-100); font-family: var(--sports-number-font); font-size: var(--dt-font-size-md); font-weight: var(--dt-font-weight-medium); font-variant-numeric: tabular-nums; }
.ranking-panel--compact { margin-top: 42px; }
.top-five-select { display: flex; height: 32px; padding: 0 12px; background: var(--dt-color-panel-raised); color: var(--dt-color-text); font-size: var(--dt-font-size-sm); align-items: center; }
.top-five-select select { max-width: 106px; border: 0; padding: 0 0 0 var(--dt-space-2); background: transparent; color: var(--dt-color-text); font: inherit; outline: 0; }
.top-five-select option { color: #111; }
.ranking-table--compact { margin-top: 16px; }
.sports-goals { position: absolute; right: calc(var(--dt-right-panel-width) + var(--dt-right-panel-right) + var(--dt-space-6)); bottom: var(--dt-space-8); left: var(--dt-left-panel-left); display: grid; height: 160px; grid-template-columns: minmax(300px, 360px) minmax(300px, 360px) minmax(0, 1fr); gap: var(--dt-space-4); }
.sports-goal-card, .sports-trend-card { box-sizing: border-box; width: 100%; min-width: 0; height: 160px; border: 0; border-radius: var(--dt-radius-sm); padding: 16px; background: var(--dt-detail-card-background); backdrop-filter: blur(var(--dt-detail-card-blur)); }
.sports-goal-card { min-width: 300px; }
.sports-goal-card h2, .sports-trend-card h2 { font-size: var(--dt-font-size-md); font-weight: var(--dt-font-weight-regular); line-height: 24px; }
.sports-goal-card { display: flex; flex-direction: column; gap: var(--dt-space-2); }
.sports-goal-card__content { display: grid; min-height: 0; flex: 1; grid-template-columns: 100px minmax(0, 1fr); gap: var(--dt-space-10); align-items: start; }
.sports-goal-card__content :deep(.dashboard-echart) { width: 100px; height: 96px; min-height: 96px; }
.sports-goal-card__stats { display: flex; min-width: 0; height: 100%; flex-direction: column; padding-top: var(--dt-space-4); gap: var(--dt-space-4); }
.sports-goal-card__stats > p { min-height: 0; flex: 1; margin: 0; color: var(--dt-color-text); font-family: var(--sports-number-font); font-size: var(--dt-font-size-md); font-weight: var(--dt-font-weight-medium); line-height: var(--dt-line-height-md); }
.sports-goal-card dl { display: grid; margin: 0; gap: var(--dt-space-2); }
.sports-goal-card dl > div { display: flex; justify-content: space-between; gap: var(--dt-space-2); }
.sports-goal-card dt { color: var(--dt-color-text-secondary); font-size: var(--dt-font-size-sm); line-height: var(--dt-line-height-sm); }
.sports-goal-card dd { margin: 0; font-family: var(--sports-number-font); font-size: var(--dt-font-size-sm); font-weight: var(--dt-font-weight-medium); line-height: var(--dt-line-height-sm); font-variant-numeric: tabular-nums; }
.sports-goal-card dd.is-complete { color: var(--dt-chart-series-tertiary); }
.sports-goal-card dd.is-pending { color: var(--dt-color-danger); }
.sports-trend-card { display: grid; grid-template-rows: 24px minmax(0, 1fr); gap: var(--dt-space-2); }
.sports-trend-card__heading { min-width: 0; overflow-x: auto; overflow-y: hidden; scrollbar-color: color-mix(in srgb, var(--dt-color-text) 24%, transparent) transparent; scrollbar-width: thin; }
.sports-trend-card__heading > div { display: flex; width: max-content; min-width: 100%; gap: 24px; }
.sports-trend-card button { padding: 0; font-size: var(--dt-font-size-md); line-height: 24px; }
.sports-trend-card button.is-active { color: var(--dt-color-text); }
.sports-trend-card__chart { min-height: 0; margin-top: 0; }
</style>
