<script setup lang="ts">
import { computed } from "vue";
import { createTopicChartOption } from "../chart-options";
import type { StudentGrowthTopicDefinition, TopicDetailRow } from "../types";
import StudentGrowthChart from "./StudentGrowthChart.vue";

const props = defineProps<{
  topic: StudentGrowthTopicDefinition;
}>();

const chartOption = computed(() => createTopicChartOption(props.topic.chart));

function statusType(status: TopicDetailRow["status"]): "success" | "primary" | "info" | "warning" {
  if (status === "优秀") return "success";
  if (status === "良好") return "primary";
  if (status === "需关注") return "warning";
  return "info";
}
</script>

<template>
  <section class="topic-analysis" :aria-label="`${topic.label}专题分析`">
    <header class="topic-analysis__header">
      <div>
        <h2>{{ topic.label }}</h2>
        <p>{{ topic.description }}</p>
      </div>
    </header>

    <dl class="topic-analysis__metrics">
      <div v-for="metric in topic.metrics" :key="metric.label" :class="`is-${metric.tone ?? 'neutral'}`">
        <dt>{{ metric.label }}</dt>
        <dd>{{ metric.value }}<small>{{ metric.unit }}</small></dd>
        <span>{{ metric.change }}</span>
      </div>
    </dl>

    <div class="topic-analysis__main">
      <section class="topic-analysis__chart-panel">
        <h3>{{ topic.chart.title }}</h3>
        <div class="topic-analysis__chart">
          <StudentGrowthChart :option="chartOption" :ariaLabelText="`${topic.label}${topic.chart.title}图表`" />
        </div>
      </section>
      <aside class="topic-analysis__insights">
        <h3>区域解读</h3>
        <ul>
          <li v-for="insight in topic.insights" :key="insight">{{ insight }}</li>
        </ul>
        <ElAlert
          title="页面指标均可追溯到模拟原始记录；真实后端接入后保留相同口径。"
          type="info"
          :closable="false"
        />
      </aside>
    </div>

    <section class="topic-analysis__details">
      <header>
        <h3>指标详情</h3>
        <span>{{ topic.comparableScope }}</span>
      </header>
      <ElTable :data="topic.details">
        <ElTableColumn prop="name" label="指标" min-width="180" />
        <ElTableColumn prop="scope" label="统计范围" min-width="140" />
        <ElTableColumn prop="value" label="当前结果" min-width="140" />
        <ElTableColumn prop="change" label="较上期" width="110" />
        <ElTableColumn prop="status" label="状态" width="110">
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

.topic-analysis__header,
.topic-analysis__details > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-16);
}

.topic-analysis__header h2 {
  font-size: 20px;
  line-height: 30px;
}

.topic-analysis__header p {
  margin-top: var(--spacing-4);
  color: var(--color-secondary);
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

.topic-analysis__main {
  display: grid;
  min-height: 390px;
  grid-template-columns: minmax(0, 1.6fr) minmax(300px, 0.8fr);
  gap: var(--spacing-16);
}

.topic-analysis__chart-panel,
.topic-analysis__insights,
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

.topic-analysis__chart {
  height: 330px;
  margin-top: var(--spacing-8);
}

.topic-analysis__insights ul {
  display: grid;
  gap: var(--spacing-16);
  margin: var(--spacing-20) 0;
  padding-left: var(--spacing-20);
  color: var(--color-body);
}

.topic-analysis__insights li {
  padding-left: var(--spacing-4);
  line-height: var(--line-height-lg);
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

:deep(.topic-analysis__details .el-table__header .el-table__cell) {
  background: var(--color-bg-subtle);
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

  .topic-analysis__main {
    grid-template-columns: 1fr;
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
