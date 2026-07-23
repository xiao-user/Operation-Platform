<script setup lang="ts">
import { computed } from "vue";
import { ArrowRight, Warning } from "@element-plus/icons-vue";
import type { EChartsCoreOption } from "echarts/core";
import { createFiveEducationOption, createRegionalTrendOption } from "../chart-options";
import { followUpRecords, mockDataMeta, schoolRecords } from "../mock-data";
import StudentGrowthChart from "./StudentGrowthChart.vue";

const emit = defineEmits<{
  changeView: [view: "schools" | "follow-up"];
}>();

const fiveEducationOption = createFiveEducationOption();
const trendOption = createRegionalTrendOption();
const chartMode = defineModel<"structure" | "trend">({ default: "structure" });
const chartOption = computed<EChartsCoreOption>(() => (
  chartMode.value === "structure" ? fiveEducationOption : trendOption
));
const attentionSchools = schoolRecords
  .filter((school) => school.trend === "下降" || school.fiveEducation < 70)
  .slice(0, 4);
const activeFollowUpCount = followUpRecords.filter((record) => record.status !== "已改善").length;

function statusType(score: number) {
  if (score < 65) return "danger";
  if (score < 72) return "warning";
  return "info";
}
</script>

<template>
  <section class="regional-overview" aria-label="区域学生成长画像总览">
    <div class="regional-overview__summary">
      <div class="regional-overview__reading">
        <span class="regional-overview__eyebrow">区域总体判读</span>
        <h2>本学期已覆盖 {{ mockDataMeta.schoolCount }} 所学校，{{ activeFollowUpCount }} 项事项待研判或跟进</h2>
        <p>五育与运动健康整体改善，学校差异仍需结合学段、学生规模和统一统计口径进一步研判。</p>
      </div>
      <dl class="regional-overview__metrics">
        <div>
          <dt>覆盖学校</dt>
          <dd>{{ mockDataMeta.schoolCount }}<small>所</small></dd>
          <span>本区域学校范围</span>
        </div>
        <div>
          <dt>覆盖学生</dt>
          <dd>{{ mockDataMeta.studentCount.toLocaleString() }}<small>人</small></dd>
          <span>仅展示匿名聚合结果</span>
        </div>
        <div>
          <dt>待跟进事项</dt>
          <dd>{{ activeFollowUpCount }}<small>项</small></dd>
          <span>待研判或跟进中</span>
        </div>
      </dl>
      <ElButton type="primary" :icon="ArrowRight" @click="emit('changeView', 'schools')">
        查看学校差异
      </ElButton>
    </div>

    <div class="regional-overview__main">
      <section class="portrait-panel regional-overview__chart-panel">
        <header class="portrait-panel__header">
          <div>
            <h3>五育发展结构与趋势</h3>
            <p>得分基于模拟评价数据标准化，满分 100 分</p>
          </div>
          <ElSegmented
            v-model="chartMode"
            :options="[
              { label: '五育结构', value: 'structure' },
              { label: '发展趋势', value: 'trend' },
            ]"
          />
        </header>
        <div class="regional-overview__chart">
          <StudentGrowthChart
            :option="chartOption"
            :ariaLabelText="chartMode === 'structure' ? '区域五育发展结构雷达图' : '区域学生发展趋势折线图'"
          />
        </div>
      </section>

      <aside class="portrait-panel regional-overview__attention">
        <header class="portrait-panel__header">
          <div>
            <h3>学校关注提示</h3>
            <p>依据当前规则筛选，仅展示学校聚合数据</p>
          </div>
          <ElButton link type="primary" @click="emit('changeView', 'follow-up')">查看跟进事项</ElButton>
        </header>
        <ul>
          <li v-for="school in attentionSchools" :key="school.id">
            <div class="regional-overview__school-title">
              <strong>{{ school.name }}</strong>
              <ElTag :type="statusType(school.fiveEducation)" effect="light" size="small">
                {{ school.trend === "下降" ? "趋势下降" : "均衡不足" }}
              </ElTag>
            </div>
            <p>{{ school.attention }}</p>
            <span>{{ school.stage }} · {{ school.students.toLocaleString() }} 名学生</span>
          </li>
        </ul>
        <ElButton class="regional-overview__attention-action" :icon="Warning" @click="emit('changeView', 'follow-up')">
          查看待跟进事项
        </ElButton>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.regional-overview {
  display: grid;
  gap: var(--spacing-16);
}

.regional-overview__summary {
  display: grid;
  min-width: 0;
  align-items: center;
  grid-template-columns: minmax(300px, 1.35fr) minmax(420px, 1fr) auto;
  gap: var(--spacing-24);
  padding: var(--spacing-24);
  border-radius: var(--radius-md);
  background: var(--color-white);
}

.regional-overview__eyebrow {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.regional-overview__reading h2 {
  margin-top: var(--spacing-8);
  color: var(--color-title);
  font-size: 20px;
  line-height: 30px;
}

.regional-overview__reading p,
.portrait-panel__header p,
.regional-overview__attention li p {
  margin-top: var(--spacing-6);
  color: var(--color-secondary);
  line-height: var(--line-height-md);
}

.regional-overview__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.regional-overview__metrics > div {
  padding: 0 var(--spacing-20);
  border-left: 1px solid var(--color-border);
}

.regional-overview__metrics dt {
  color: var(--color-body);
  font-size: var(--font-size-sm);
}

.regional-overview__metrics dd {
  margin-top: var(--spacing-8);
  color: var(--color-title);
  font-size: 28px;
  font-weight: var(--font-weight-semibold);
  line-height: 36px;
}

.regional-overview__metrics dd small,
.regional-overview__metrics span {
  color: var(--color-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-regular);
}

.regional-overview__metrics strong {
  color: var(--color-success-dark-text);
}

.regional-overview__main {
  display: grid;
  min-height: 440px;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: var(--spacing-16);
}

.portrait-panel {
  min-width: 0;
  padding: var(--spacing-20);
  border-radius: var(--radius-md);
  background: var(--color-white);
}

.portrait-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-16);
}

.portrait-panel__header h3 {
  font-size: var(--font-size-lg);
  line-height: var(--line-height-lg);
}

.portrait-panel__header p {
  font-size: var(--font-size-xs);
}

.regional-overview__chart {
  height: 360px;
  margin-top: var(--spacing-16);
}

.regional-overview__attention {
  display: flex;
  flex-direction: column;
}

.regional-overview__attention ul {
  display: grid;
  margin-top: var(--spacing-8);
  list-style: none;
}

.regional-overview__attention li {
  padding: var(--spacing-14) 0;
  border-bottom: 1px solid var(--color-border);
}

.regional-overview__school-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-8);
}

.regional-overview__attention li > span {
  color: var(--color-placeholder);
  font-size: var(--font-size-xs);
}

.regional-overview__attention-action {
  width: 100%;
  margin-top: auto;
}

@media (max-width: 1180px) {
  .regional-overview__summary {
    grid-template-columns: 1fr;
  }

  .regional-overview__main {
    grid-template-columns: 1fr;
  }

  .regional-overview__metrics > div:first-child {
    border-left: 0;
  }
}

@media (min-width: 1181px) and (max-width: 1400px) {
  .regional-overview__summary {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .regional-overview__reading {
    grid-column: 1 / -1;
  }
}

</style>
