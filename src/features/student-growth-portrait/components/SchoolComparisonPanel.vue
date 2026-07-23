<script setup lang="ts">
import { computed, ref } from "vue";
import { InfoFilled } from "@element-plus/icons-vue";
import { schoolRecords } from "../mock-data";
import type { SchoolGrowthRecord } from "../types";

const selectedSchool = ref<SchoolGrowthRecord | null>(null);
const drawerVisible = ref(false);
const currentPage = ref(1);
const pageSize = ref(10);

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

function handleSizeChange() {
  currentPage.value = 1;
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

    <div class="school-comparison__body">
      <div class="school-comparison__table-wrapper">
        <ElTable
          :data="pagedRecords"
          height="100%"
          stripe
          border
          highlight-current-row
          row-key="id"
          @row-click="openSchool"
        >
          <ElTableColumn
            column-key="index"
            label="序号"
            width="60"
            align="center"
            fixed="left"
          >
            <template #default="{ $index }">
              {{
                String((currentPage - 1) * pageSize + $index + 1).padStart(2, "0")
              }}
            </template>
          </ElTableColumn>
          <ElTableColumn
            prop="name"
            column-key="name"
            label="学校"
            min-width="190"
            fixed="left"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <button
                class="school-comparison__school-button"
                type="button"
                @click.stop="openSchool(row)"
              >
                {{ row.name }}
              </button>
            </template>
          </ElTableColumn>
          <ElTableColumn
            prop="students"
            column-key="students"
            label="学生规模"
            width="110"
            sortable
          >
            <template #default="{ row }">{{ row.students.toLocaleString() }}</template>
          </ElTableColumn>
          <ElTableColumn
            prop="fiveEducation"
            column-key="fiveEducation"
            min-width="132"
            sortable
          >
            <template #header>
              <span>
                五育均衡
                <ElTooltip content="评价量表标准化后支持区域比较">
                  <ElIcon><InfoFilled /></ElIcon>
                </ElTooltip>
              </span>
            </template>
            <template #default="{ row }">
              <strong>{{ row.fiveEducation }}</strong>
              <ElTag :type="scoreType(row.fiveEducation)" size="small" effect="light">
                {{
                  row.fiveEducation >= 80
                    ? "优秀"
                    : row.fiveEducation >= 70
                      ? "良好"
                      : "需关注"
                }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn
            prop="academicProgress"
            column-key="academicProgress"
            label="学业进步"
            min-width="120"
            sortable
          />
          <ElTableColumn
            prop="physicalHealth"
            column-key="physicalHealth"
            label="体质健康"
            min-width="120"
            sortable
          >
            <template #default="{ row }">{{ row.physicalHealth }}%</template>
          </ElTableColumn>
          <ElTableColumn
            prop="activityParticipation"
            column-key="activityParticipation"
            label="活动参与"
            min-width="120"
            sortable
          >
            <template #default="{ row }">{{ row.activityParticipation }}%</template>
          </ElTableColumn>
          <ElTableColumn
            prop="completeness"
            column-key="completeness"
            label="数据完整度"
            min-width="130"
            sortable
          >
            <template #default="{ row }">
              <ElProgress :percentage="row.completeness" :stroke-width="6" :show-text="false" />
              <span class="school-comparison__progress-value">{{ row.completeness }}%</span>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="trend" column-key="trend" label="趋势" width="96">
            <template #default="{ row }">
              <ElTag :type="trendType(row.trend)" size="small" effect="light">
                {{ row.trend }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn column-key="actions" label="操作" width="96" fixed="right">
            <template #default="{ row }">
              <button
                class="school-comparison__action-link"
                type="button"
                @click.stop="openSchool(row)"
              >
                查看详情
              </button>
            </template>
          </ElTableColumn>
        </ElTable>
      </div>
      <div class="school-comparison__pagination">
        <ElPagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="schoolRecords.length"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
        />
      </div>
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

.school-comparison__body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-16);
  min-width: 0;
  padding: var(--spacing-24);
  background: var(--color-white);
}

.school-comparison__table-wrapper {
  height: 540px;
  min-width: 0;
  overflow: hidden;
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

.school-comparison__school-button:hover,
.school-comparison__action-link:hover {
  color: var(--color-primary-hover);
}

.school-comparison__school-button:focus-visible,
.school-comparison__action-link:focus-visible {
  border-radius: var(--radius-sm);
  outline: 2px solid var(--color-primary-line-light);
  outline-offset: 2px;
}

.school-comparison__action-link {
  padding: 0;
  color: var(--color-primary);
  font: inherit;
  background: transparent;
  border: 0;
  cursor: pointer;
  white-space: nowrap;
}

.school-comparison__progress-value {
  display: block;
  margin-top: var(--spacing-4);
  color: var(--color-secondary);
  font-size: var(--font-size-xs);
}

.school-comparison__pagination {
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
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

:deep(.el-table__row) {
  cursor: pointer;
}

@media (max-width: 900px) {
  .school-comparison__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .school-comparison__benchmark {
    flex-wrap: wrap;
  }

  .school-comparison__body {
    padding: var(--spacing-16);
  }

  .school-comparison__pagination {
    overflow-x: auto;
  }
}
</style>
