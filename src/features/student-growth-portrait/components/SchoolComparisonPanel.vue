<script setup lang="ts">
import { computed, ref } from "vue";
import { ArrowRight, InfoFilled } from "@element-plus/icons-vue";
import { schoolRecords } from "../mock-data";
import type { SchoolGrowthRecord } from "../types";

const selectedSchool = ref<SchoolGrowthRecord | null>(null);
const drawerVisible = ref(false);
const currentPage = ref(1);
const pageSize = ref(8);

const pagedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return schoolRecords.slice(start, start + pageSize.value);
});

function trendType(trend: SchoolGrowthRecord["trend"]): "success" | "warning" | "danger" {
  if (trend === "上升") return "success";
  if (trend === "下降") return "danger";
  return "warning";
}

function scoreType(score: number): "success" | "warning" | "danger" | "primary" {
  if (score >= 80) return "success";
  if (score >= 70) return "primary";
  if (score >= 60) return "warning";
  return "danger";
}

function openSchool(record: SchoolGrowthRecord) {
  selectedSchool.value = record;
  drawerVisible.value = true;
}
</script>

<template>
  <section class="school-comparison" aria-label="学校发展差异比较">
    <header class="school-comparison__header">
      <div>
        <h2>学校差异</h2>
        <p>基于同学段、同学期的标准化指标比较；点击学校查看聚合画像。</p>
      </div>
      <div class="school-comparison__benchmark">
        <span>区域基准</span>
        <span><strong>48</strong><small>所学校</small></span>
        <span><strong>28,643</strong><small>名学生</small></span>
        <span><strong>93.2%</strong><small>平均完整度</small></span>
      </div>
    </header>

    <div class="school-comparison__table">
      <ElTable
        :data="pagedRecords"
        height="540"
        stripe
        highlight-current-row
        row-key="id"
        @row-click="openSchool"
      >
        <ElTableColumn type="index" width="54" label="#" />
        <ElTableColumn prop="name" label="学校" min-width="190" fixed show-overflow-tooltip>
          <template #default="{ row }">
            <button class="school-comparison__school-button" type="button" @click.stop="openSchool(row)">
              {{ row.name }}
            </button>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="students" label="学生规模" width="110" sortable>
          <template #default="{ row }">{{ row.students.toLocaleString() }}</template>
        </ElTableColumn>
        <ElTableColumn prop="fiveEducation" min-width="132" sortable>
          <template #header>
            <span>五育均衡 <ElTooltip content="评价量表标准化后支持区域比较"><ElIcon><InfoFilled /></ElIcon></ElTooltip></span>
          </template>
          <template #default="{ row }">
            <strong>{{ row.fiveEducation }}</strong>
            <ElTag :type="scoreType(row.fiveEducation)" size="small" effect="light">{{ row.fiveEducation >= 80 ? "优秀" : row.fiveEducation >= 70 ? "良好" : "需关注" }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="academicProgress" label="学业进步" min-width="120" sortable />
        <ElTableColumn prop="physicalHealth" label="体质健康" min-width="120" sortable>
          <template #default="{ row }">{{ row.physicalHealth }}%</template>
        </ElTableColumn>
        <ElTableColumn prop="activityParticipation" label="活动参与" min-width="120" sortable>
          <template #default="{ row }">{{ row.activityParticipation }}%</template>
        </ElTableColumn>
        <ElTableColumn prop="completeness" label="数据完整度" min-width="130" sortable>
          <template #default="{ row }">
            <ElProgress :percentage="row.completeness" :stroke-width="6" :show-text="false" />
            <span class="school-comparison__progress-value">{{ row.completeness }}%</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="trend" label="趋势" width="96">
          <template #default="{ row }">
            <ElTag :type="trendType(row.trend)" size="small" effect="light">{{ row.trend }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="" width="64" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" :icon="ArrowRight" aria-label="查看学校画像" @click.stop="openSchool(row)" />
          </template>
        </ElTableColumn>
      </ElTable>
      <footer class="school-comparison__pagination">
        <span>共 {{ schoolRecords.length }} 所示例学校，区域总计 48 所</span>
        <ElPagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          background
          layout="prev, pager, next, sizes"
          :page-sizes="[8, 10, 12]"
          :total="schoolRecords.length"
        />
      </footer>
    </div>
  </section>

  <ElDrawer v-model="drawerVisible" :title="selectedSchool?.name ?? '学校聚合画像'" size="420px">
    <template v-if="selectedSchool">
      <ElAlert title="仅展示学校聚合数据，不包含个人学生信息" type="info" :closable="false" show-icon />
      <div class="school-drawer__meta">
        <span>{{ selectedSchool.stage }}</span>
        <span>在校生 {{ selectedSchool.students.toLocaleString() }} 人</span>
        <ElTag :type="trendType(selectedSchool.trend)" effect="light">{{ selectedSchool.trend }}</ElTag>
      </div>
      <dl class="school-drawer__metrics">
        <div><dt>五育均衡指数</dt><dd>{{ selectedSchool.fiveEducation }}</dd></div>
        <div><dt>学业进步指数</dt><dd>{{ selectedSchool.academicProgress }}</dd></div>
        <div><dt>体质健康优良率</dt><dd>{{ selectedSchool.physicalHealth }}%</dd></div>
        <div><dt>活动参与率</dt><dd>{{ selectedSchool.activityParticipation }}%</dd></div>
        <div><dt>数据完整度</dt><dd>{{ selectedSchool.completeness }}%</dd></div>
      </dl>
      <section class="school-drawer__attention">
        <h3>发展提示</h3>
        <p>{{ selectedSchool.attention }}</p>
      </section>
      <ElButton type="primary" class="school-drawer__action">查看完整学校画像</ElButton>
    </template>
  </ElDrawer>
</template>

<style scoped>
.school-comparison {
  display: grid;
  gap: var(--spacing-16);
}

.school-comparison__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--spacing-24);
}

.school-comparison__header h2 {
  font-size: 20px;
  line-height: 30px;
}

.school-comparison__header p {
  margin-top: var(--spacing-4);
  color: var(--color-secondary);
}

.school-comparison__benchmark {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-12);
  color: var(--color-secondary);
}

.school-comparison__benchmark > span {
  white-space: nowrap;
}

.school-comparison__benchmark > span:not(:first-child) {
  display: inline-flex;
  align-items: baseline;
  gap: var(--spacing-4);
}

.school-comparison__benchmark strong {
  color: var(--color-title);
  font-size: 18px;
}

.school-comparison__benchmark small {
  font-size: var(--font-size-xs);
}

.school-comparison__table {
  overflow: hidden;
  border-radius: var(--radius-md);
  background: var(--color-white);
}

.school-comparison__school-button {
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-primary);
  cursor: pointer;
  font: inherit;
  font-weight: var(--font-weight-medium);
  text-align: left;
}

.school-comparison__progress-value {
  display: block;
  margin-top: var(--spacing-4);
  color: var(--color-secondary);
  font-size: var(--font-size-xs);
}

.school-comparison__pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-14) var(--spacing-16);
  border-top: 1px solid var(--color-border);
  color: var(--color-secondary);
  font-size: var(--font-size-sm);
}

.school-drawer__meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-12);
  margin: var(--spacing-20) 0;
  color: var(--color-secondary);
}

.school-drawer__metrics {
  display: grid;
}

.school-drawer__metrics div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-16) 0;
  border-bottom: 1px solid var(--color-border);
}

.school-drawer__metrics dt {
  color: var(--color-body);
}

.school-drawer__metrics dd {
  color: var(--color-title);
  font-size: 18px;
  font-weight: var(--font-weight-semibold);
}

.school-drawer__attention {
  margin-top: var(--spacing-24);
  padding: var(--spacing-16);
  border-radius: var(--radius-md);
  background: var(--color-bg-muted);
}

.school-drawer__attention p {
  margin-top: var(--spacing-8);
  color: var(--color-body);
  line-height: var(--line-height-lg);
}

.school-drawer__action {
  width: 100%;
  margin-top: var(--spacing-24);
}

:deep(.el-table__cell) {
  height: 54px;
}

:deep(.el-table__header .el-table__cell) {
  color: var(--color-body);
  background: var(--color-bg-subtle);
  font-weight: var(--font-weight-medium);
}

:deep(.el-table__row) {
  cursor: pointer;
}

@media (max-width: 900px) {
  .school-comparison__header,
  .school-comparison__pagination {
    align-items: flex-start;
    flex-direction: column;
  }

  .school-comparison__benchmark {
    flex-wrap: wrap;
  }
}
</style>
