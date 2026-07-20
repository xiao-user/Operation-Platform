<script setup lang="ts">
import { ref } from "vue";
import type { DigitalTwinChartPalette } from "../map-themes";
import AcademicTrendChart from "../academic-quality/AcademicTrendChart.vue";
import DashboardFilterBar from "./dashboard/DashboardFilterBar.vue";
import DashboardPanel from "./dashboard/DashboardPanel.vue";
import DashboardPanelActionButton from "./dashboard/DashboardPanelActionButton.vue";
import DashboardPanelSelect from "./dashboard/DashboardPanelSelect.vue";
import DashboardPanelTabs from "./dashboard/DashboardPanelTabs.vue";

defineProps<{ chartPalette: DigitalTwinChartPalette }>();

const leftPanels = [
  {
    id: "variance",
    title: "差异系数监测",
    helpText: "用于观察区域内学校之间成绩离散程度及其变化，差异系数越低代表校际均衡程度越高。",
  },
  {
    id: "subject",
    title: "学科质量精细分析",
    helpText: "按学科拆解平均分、优秀率、合格率等核心指标，辅助识别优势学科与薄弱环节。",
  },
] as const;
const centerPanels = [
  {
    id: "overview",
    title: "区域学业全景总览",
    helpText: "汇总区域或学校范围内的学业质量核心指标，支持在区域与学校两个观察层级之间切换。",
  },
  {
    id: "value-added",
    title: "增值评价—学校及教师增值榜",
    helpText: "基于学生起点与阶段性结果衡量学校及教师带来的增量变化，减少仅按绝对成绩排名的偏差。",
  },
] as const;
const rightPanels = [
  {
    id: "course",
    title: "课程实施监测",
    helpText: "监测课程开设、课时落实与教学进度等实施情况，辅助发现课程执行偏差。",
  },
  {
    id: "load",
    title: "学业负担关联分析",
    helpText: "关联作业时长、考试表现与学习反馈，观察学业负担和质量指标之间的变化关系。",
  },
  {
    id: "assessment",
    title: "试卷命题质量分析",
    helpText: "从难度、区分度、信度和知识点覆盖等维度评估试卷及试题的命题质量。",
  },
] as const;

const academicTrendHelpText = "对比历次考试的平均分、优秀率和合格率。可点击图例隐藏或恢复指标；横轴数据较多时可拖动缩放条或在图表内横向缩放。";

const semester = ref("2026-2027-2");
const grade = ref("grade-9");
const exam = ref("all");
const overviewScope = ref("region");
const reportCenterStatus = ref("");

const semesterOptions = [
  { value: "2026-2027-2", label: "2026-2027学年下学期" },
  { value: "2026-2027-1", label: "2026-2027学年上学期" },
  { value: "2025-2026-2", label: "2025-2026学年下学期" },
] as const;
const gradeOptions = [
  { value: "grade-7", label: "初一" },
  { value: "grade-8", label: "初二" },
  { value: "grade-9", label: "初三" },
] as const;
const examOptions = [
  { value: "all", label: "全部考试" },
  { value: "entrance", label: "入学统考" },
  { value: "midterm", label: "期中考试" },
  { value: "final", label: "期末考试" },
] as const;
const overviewScopeTabs = [
  { value: "region", label: "区域" },
  { value: "school", label: "学校" },
] as const;

function openReportCenter() {
  reportCenterStatus.value = "报告中心将在数据接口接入后开放";
}
</script>

<template>
  <section
    id="dashboard-panel-academic-quality"
    class="academic-quality dashboard-section"
    role="tabpanel"
    aria-label="学业质量监测"
  >
    <DashboardFilterBar data-dashboard-panel>
      <DashboardPanelSelect
        v-model="semester"
        label="学期筛选"
        :options="semesterOptions"
        width="250px"
      />
      <DashboardPanelSelect
        v-model="grade"
        label="年级筛选"
        :options="gradeOptions"
        width="136px"
      />
      <DashboardPanelSelect
        v-model="exam"
        label="考试"
        :options="examOptions"
        width="176px"
      />

      <template #actions>
        <DashboardPanelActionButton label="报告中心" @click="openReportCenter" />
        <span class="sr-only" role="status" aria-live="polite">{{ reportCenterStatus }}</span>
      </template>
    </DashboardFilterBar>

    <div class="academic-quality__grid">
      <div class="academic-quality__column academic-quality__column--side">
        <DashboardPanel
          title="学业趋势对比"
          :help-text="academicTrendHelpText"
          data-dashboard-panel
        >
          <div class="academic-trend-chart-module">
            <AcademicTrendChart :palette="chartPalette" />
          </div>
        </DashboardPanel>

        <DashboardPanel
          v-for="panel in leftPanels"
          :key="panel.id"
          :title="panel.title"
          :help-text="panel.helpText"
          data-dashboard-panel
        >
          <div class="academic-quality__chart-placeholder">
            <span>CHART MODULE</span>
            <p>指标数据待接入</p>
          </div>
        </DashboardPanel>
      </div>

      <div class="academic-quality__column academic-quality__column--center">
        <DashboardPanel
          :title="centerPanels[0].title"
          :help-text="centerPanels[0].helpText"
          variant="primary"
          data-dashboard-panel
        >
          <template #header-actions>
            <DashboardPanelTabs
              v-model="overviewScope"
              :items="overviewScopeTabs"
              label="区域学业全景查看范围"
            />
          </template>
          <div class="academic-quality__chart-placeholder is-primary">
            <span>OVERVIEW CHART</span>
            <p>{{ overviewScope === "region" ? "区域指标图表待接入" : "学校指标图表待接入" }}</p>
          </div>
        </DashboardPanel>

        <DashboardPanel
          :title="centerPanels[1].title"
          :help-text="centerPanels[1].helpText"
          variant="primary"
          data-dashboard-panel
        >
          <div class="academic-quality__chart-placeholder is-primary">
            <span>VALUE-ADDED CHART</span>
            <p>学校及教师增值排行待接入</p>
          </div>
        </DashboardPanel>
      </div>

      <div class="academic-quality__column academic-quality__column--side">
        <DashboardPanel
          v-for="panel in rightPanels"
          :key="panel.id"
          :title="panel.title"
          :help-text="panel.helpText"
          data-dashboard-panel
        >
          <div class="academic-quality__chart-placeholder">
            <span>CHART MODULE</span>
            <p>指标数据待接入</p>
          </div>
        </DashboardPanel>
      </div>
    </div>
  </section>
</template>

<style scoped>
.academic-quality {
  position: absolute;
  inset: calc(var(--dt-topbar-height) + var(--dt-space-7)) var(--dt-screen-gutter) calc(var(--dt-statusbar-height) + var(--dt-space-4));
  z-index: var(--dt-z-map-hud);
  display: grid;
  min-height: 0;
  grid-template-rows: 44px minmax(0, 1fr);
  gap: var(--dt-space-4);
}

.academic-quality::before {
  position: absolute;
  z-index: -1;
  inset: -28px -24px -16px;
  background:
    radial-gradient(circle at 50% 12%, color-mix(in srgb, var(--dt-color-accent) 9%, transparent), transparent 36%),
    linear-gradient(var(--normal--white--5) 1px, transparent 1px),
    linear-gradient(90deg, var(--normal--white--5) 1px, transparent 1px);
  background-size: auto, 48px 48px, 48px 48px;
  content: "";
  pointer-events: none;
}

.academic-quality__grid {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-columns: minmax(260px, 0.82fr) minmax(420px, 2.25fr) minmax(220px, 0.76fr);
  gap: var(--dt-space-4);
}

.academic-quality__column {
  display: grid;
  min-width: 0;
  min-height: 0;
  gap: var(--dt-space-4);
}

.academic-quality__column--side {
  grid-template-rows: repeat(3, minmax(0, 1fr));
}

.academic-quality__column--center {
  grid-template-rows: minmax(0, 1.15fr) minmax(0, 1fr);
}

.academic-trend-chart-module {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.academic-quality__chart-placeholder {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 54px;
  border-top: var(--dt-border-width) solid var(--dt-chart-grid-line);
  background:
    linear-gradient(var(--dt-chart-grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--dt-chart-grid-line) 1px, transparent 1px),
    linear-gradient(180deg, var(--dt-chart-area-secondary), transparent 66%);
  background-size: 28px 28px, 28px 28px, auto;
  color: var(--dt-chart-axis-text);
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.academic-quality__chart-placeholder span {
  color: var(--charts--2-50);
  font-size: var(--dt-font-size-2xs);
  line-height: var(--dt-line-height-xs);
  letter-spacing: var(--dt-letter-spacing-title);
}

.academic-quality__chart-placeholder p {
  margin: var(--dt-space-2) 0 0;
  color: var(--dt-panel-description);
  font-size: var(--dt-font-size-xs);
}

.academic-quality__chart-placeholder.is-primary {
  background-size: 36px 36px, 36px 36px, auto;
}

@media (max-width: 1320px) {
  .academic-quality {
    right: var(--dt-space-5);
    left: var(--dt-space-5);
  }

  .academic-quality__grid {
    grid-template-columns: minmax(240px, 0.78fr) minmax(390px, 2fr) minmax(200px, 0.72fr);
    gap: var(--dt-space-3);
  }

  .academic-quality__column {
    gap: var(--dt-space-3);
  }
}

@media (max-height: 820px) {
  .academic-quality {
    top: calc(var(--dt-topbar-height) + var(--dt-space-4));
    gap: var(--dt-space-3);
  }

  .academic-quality__chart-placeholder p {
    display: none;
  }
}
</style>
