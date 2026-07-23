<script setup lang="ts">
import { computed, ref } from "vue";
import { createRegionalTrendOption } from "../chart-options";
import { followUpRecords } from "../mock-data";
import type { FollowUpRecord } from "../types";
import ChartExplanationTooltip from "./ChartExplanationTooltip.vue";
import StudentGrowthChart from "./StudentGrowthChart.vue";

const trendOption = createRegionalTrendOption();
const statusFilter = ref("all");
const trendExplanation = [
  "五育均衡指数 79.6，较上学期提升 1.2，整体发展持续向好。",
  "学业进步指数 78.2，高年级进步更明显，低年级需巩固基础。",
  "体质健康指数 65.5，提升相对缓慢，耐力类项目需加强。",
  "活动参与指数 70.1，艺术与科创活动参与度提升明显。",
  "优先关注体质健康提升行动和低年级学业基础巩固。",
].join("；");

const visibleRecords = computed(() => (
  statusFilter.value === "all"
    ? followUpRecords
    : followUpRecords.filter((record) => record.status === statusFilter.value)
));

function statusType(status: FollowUpRecord["status"]): "warning" | "primary" | "success" {
  if (status === "待研判") return "warning";
  if (status === "跟进中") return "primary";
  return "success";
}
</script>

<template>
  <section class="trend-follow-up" aria-label="区域发展趋势与跟进">
    <section class="trend-follow-up__chart-panel">
      <header>
        <div>
          <div class="trend-follow-up__chart-title">
            <h2>区域发展趋势（近 6 个学期）</h2>
            <ChartExplanationTooltip
              label="查看区域发展趋势说明"
              :content="trendExplanation"
            />
          </div>
          <p>指标范围 0–100，数值越高代表发展水平越好</p>
        </div>
      </header>
      <div class="trend-follow-up__chart">
        <StudentGrowthChart
          :option="trendOption"
          ariaLabelText="区域学生发展近六学期趋势图"
        />
      </div>
    </section>

    <section class="trend-follow-up__workflow">
      <header class="trend-follow-up__workflow-header">
        <div>
          <h2>从发现到改善</h2>
          <p>所有关注事项只定位到学校聚合层级</p>
        </div>
        <ElSelect v-model="statusFilter" aria-label="跟进状态" class="trend-follow-up__status-filter">
          <ElOption label="全部状态" value="all" />
          <ElOption label="待研判" value="待研判" />
          <ElOption label="跟进中" value="跟进中" />
          <ElOption label="已改善" value="已改善" />
        </ElSelect>
      </header>
      <ElSteps :active="1" finish-status="success" align-center class="trend-follow-up__steps">
        <ElStep title="发现" description="基于数据识别关注事项" />
        <ElStep title="研判" description="定位学校与影响范围" />
        <ElStep title="跟进" description="制定并推进改进计划" />
        <ElStep title="改善" description="复盘变化并沉淀经验" />
      </ElSteps>
      <ElTable
        :data="visibleRecords"
        class="trend-follow-up__table"
        row-key="id"
        stripe
        border
      >
        <ElTableColumn
          prop="title"
          column-key="title"
          label="关注事项"
          min-width="280"
          show-overflow-tooltip
        />
        <ElTableColumn prop="domain" column-key="domain" label="关联领域" width="120" />
        <ElTableColumn
          prop="schoolCount"
          column-key="schoolCount"
          label="涉及学校"
          width="100"
        >
          <template #default="{ row }">{{ row.schoolCount }} 所</template>
        </ElTableColumn>
        <ElTableColumn
          prop="schools"
          column-key="schools"
          label="典型学校（示例）"
          min-width="220"
          show-overflow-tooltip
        />
        <ElTableColumn prop="status" column-key="status" label="最新状态" width="110">
          <template #default="{ row }"><ElTag :type="statusType(row.status)" effect="light">{{ row.status }}</ElTag></template>
        </ElTableColumn>
        <ElTableColumn
          prop="updatedAt"
          column-key="updatedAt"
          label="更新时间"
          width="120"
        />
      </ElTable>
    </section>
  </section>
</template>

<style scoped>
.trend-follow-up {
  display: grid;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow-x: clip;
  gap: var(--spacing-16);
}

.trend-follow-up__chart-panel,
.trend-follow-up__workflow {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  padding: var(--spacing-20);
  border-radius: var(--radius-md);
  background: var(--color-white);
}

.trend-follow-up h2 {
  font-size: var(--font-size-lg);
  line-height: var(--line-height-lg);
}

.trend-follow-up header p,
.trend-follow-up__workflow-header p {
  margin-top: var(--spacing-4);
  color: var(--color-secondary);
  font-size: var(--font-size-xs);
}

.trend-follow-up__chart {
  height: 340px;
  margin-top: var(--spacing-12);
}

.trend-follow-up__chart-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-6);
}

.trend-follow-up__workflow-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-16);
}

.trend-follow-up__status-filter {
  width: 140px;
}

.trend-follow-up__steps {
  min-width: 0;
  margin: var(--spacing-24) 0 var(--spacing-20);
}

.trend-follow-up__table {
  width: 100%;
  max-width: 100%;
}

</style>
