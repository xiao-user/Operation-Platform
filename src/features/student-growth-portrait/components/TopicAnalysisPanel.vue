<script setup lang="ts">
import { computed } from "vue";
import { createTopicChartOption } from "../chart-options";
import type { StudentGrowthTopicDefinition, TopicDetailRow } from "../types";
import ChartExplanationTooltip from "./ChartExplanationTooltip.vue";
import StudentGrowthChart from "./StudentGrowthChart.vue";

const props = defineProps<{
  topic: StudentGrowthTopicDefinition;
}>();

const chartOption = computed(() => createTopicChartOption(props.topic.chart));
const chartExplanation = computed(() => [
  props.topic.description,
  ...props.topic.insights,
  "页面指标均可追溯到模拟原始记录；真实后端接入后保留相同口径。",
].join("；"));

function statusType(status: TopicDetailRow["status"]): "success" | "primary" | "info" | "warning" {
  if (status === "优秀") return "success";
  if (status === "良好") return "primary";
  if (status === "需关注") return "warning";
  return "info";
}
</script>

<template>
  <section class="topic-analysis" :aria-label="`${topic.label}专题分析`">
    <dl class="topic-analysis__metrics">
      <div v-for="metric in topic.metrics" :key="metric.label" :class="`is-${metric.tone ?? 'neutral'}`">
        <dt>{{ metric.label }}</dt>
        <dd>{{ metric.value }}<small>{{ metric.unit }}</small></dd>
        <span>{{ metric.change }}</span>
      </div>
    </dl>

    <section class="topic-analysis__chart-panel">
      <header class="topic-analysis__chart-header">
        <h3>{{ topic.chart.title }}</h3>
        <ChartExplanationTooltip
          :label="`查看${topic.chart.title}说明`"
          :content="chartExplanation"
        />
      </header>
      <div class="topic-analysis__chart">
        <StudentGrowthChart
          :option="chartOption"
          :ariaLabelText="`${topic.label}${topic.chart.title}图表`"
        />
      </div>
    </section>

    <section class="topic-analysis__details">
      <header>
        <h3>指标详情</h3>
        <span>{{ topic.comparableScope }}</span>
      </header>
      <ElTable :data="topic.details" row-key="name" stripe border>
        <ElTableColumn
          prop="name"
          column-key="name"
          label="指标"
          min-width="180"
          show-overflow-tooltip
        />
        <ElTableColumn
          prop="scope"
          column-key="scope"
          label="统计范围"
          min-width="140"
          show-overflow-tooltip
        />
        <ElTableColumn
          prop="value"
          column-key="value"
          label="当前结果"
          min-width="140"
          show-overflow-tooltip
        />
        <ElTableColumn prop="change" column-key="change" label="较上期" width="110" />
        <ElTableColumn prop="status" column-key="status" label="状态" width="110">
          <template #default="{ row }"><ElTag :type="statusType(row.status)" effect="light">{{ row.status }}</ElTag></template>
        </ElTableColumn>
      </ElTable>
    </section>
  </section>
</template>

<style scoped>
.topic-analysis {
  display: grid;
  min-width: 0;
  gap: var(--spacing-16);
}

.topic-analysis__details > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-16);
}

.topic-analysis__metrics {
  display: grid;
  overflow: hidden;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-radius: var(--radius-md);
  background: var(--color-white);
}

.topic-analysis__metrics > div {
  padding: var(--spacing-20) var(--spacing-24);
  border-left: 1px solid var(--color-border);
}

.topic-analysis__metrics > div:first-child {
  border-left: 0;
}

.topic-analysis__metrics dt {
  color: var(--color-body);
}

.topic-analysis__metrics dd {
  margin-top: var(--spacing-8);
  color: var(--color-title);
  font-size: 28px;
  font-weight: var(--font-weight-semibold);
  line-height: 36px;
}

.topic-analysis__metrics dd small,
.topic-analysis__metrics span {
  margin-left: var(--spacing-4);
  color: var(--color-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-regular);
}

.topic-analysis__metrics .is-success span {
  color: var(--color-success-dark-text);
}

.topic-analysis__chart-panel,
.topic-analysis__details {
  min-width: 0;
  padding: var(--spacing-20);
  border-radius: var(--radius-md);
  background: var(--color-white);
}

.topic-analysis h3 {
  font-size: var(--font-size-lg);
  line-height: var(--line-height-lg);
}

.topic-analysis__chart-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-6);
}

.topic-analysis__chart {
  height: 330px;
  margin-top: var(--spacing-8);
}

.topic-analysis__details > header {
  align-items: center;
  margin-bottom: var(--spacing-12);
}

:deep(.topic-analysis__details .el-table) {
  max-width: 100%;
}

.topic-analysis__details > header span {
  color: var(--color-secondary);
  font-size: var(--font-size-xs);
}

@media (max-width: 1180px) {
  .topic-analysis__metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .topic-analysis__metrics > div:nth-child(3) {
    grid-column: 1 / -1;
    border-top: 1px solid var(--color-border);
    border-left: 0;
  }

}

@media (max-width: 760px) {
  .topic-analysis__metrics {
    grid-template-columns: 1fr;
  }

  .topic-analysis__metrics > div {
    grid-column: auto;
    border-top: 1px solid var(--color-border);
    border-left: 0;
  }

  .topic-analysis__metrics > div:first-child {
    border-top: 0;
  }
}
</style>
