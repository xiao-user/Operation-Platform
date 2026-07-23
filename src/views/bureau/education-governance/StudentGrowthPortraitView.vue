<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import MentalHealthPlaceholder from "@/features/student-growth-portrait/components/MentalHealthPlaceholder.vue";
import PortraitFilterBar from "@/features/student-growth-portrait/components/PortraitFilterBar.vue";
import RegionalOverviewPanel from "@/features/student-growth-portrait/components/RegionalOverviewPanel.vue";
import SchoolComparisonPanel from "@/features/student-growth-portrait/components/SchoolComparisonPanel.vue";
import TopicAnalysisPanel from "@/features/student-growth-portrait/components/TopicAnalysisPanel.vue";
import TrendFollowUpPanel from "@/features/student-growth-portrait/components/TrendFollowUpPanel.vue";
import {
  mockDataMeta,
  moreTopics,
  primaryTopics,
  topicDefinitionByKey,
} from "@/features/student-growth-portrait/mock-data";
import type { StudentGrowthTopicKey } from "@/features/student-growth-portrait/types";

type OverviewMode = "overview" | "schools" | "follow-up";

const activeTopic = ref<StudentGrowthTopicKey>("overview");
const overviewMode = ref<OverviewMode>("overview");
const academicYear = ref("2025-2026学年");
const semester = ref("第二学期");
const stage = ref("全部学段");
const schoolScope = ref("区域内全部学校");
const grade = ref("全部年级");
const town = ref("全部镇街");
const dataStatus = ref("全部数据");
const loading = ref(false);
const dataDrawerVisible = ref(false);
const allTopics = [...primaryTopics, ...moreTopics];

const activeTopicDefinition = computed(() => topicDefinitionByKey.get(
  activeTopic.value as Exclude<StudentGrowthTopicKey, "overview" | "mental-health">,
));

watch(activeTopic, (topic) => {
  if (topic !== "overview") overviewMode.value = "overview";
});

function selectTopic(index: string) {
  activeTopic.value = index as StudentGrowthTopicKey;
}

function changeOverviewView(view: "schools" | "follow-up") {
  overviewMode.value = view;
}

function queryData() {
  loading.value = true;
  window.setTimeout(() => {
    loading.value = false;
    const filterSummary = [
      `${academicYear.value} ${semester.value}`,
      stage.value,
      grade.value,
      town.value,
      schoolScope.value,
      dataStatus.value,
    ].join(" · ");
    ElMessage.success(`已更新：${filterSummary}`);
  }, 320);
}
</script>

<template>
  <div class="student-growth-portrait" v-loading="loading">
    <PortraitFilterBar
      v-model:academic-year="academicYear"
      v-model:semester="semester"
      v-model:stage="stage"
      v-model:school-scope="schoolScope"
      v-model:grade="grade"
      v-model:town="town"
      v-model:data-status="dataStatus"
      @query="queryData"
      @open-data="dataDrawerVisible = true"
    />

    <div class="student-growth-portrait__workspace">
      <nav class="student-growth-portrait__topics" aria-label="学生成长画像专题">
        <ElMenu :default-active="activeTopic" @select="selectTopic">
          <ElMenuItem v-for="topic in allTopics" :key="topic.key" :index="topic.key">
            <span>{{ topic.label }}</span>
            <ElTag v-if="topic.key === 'mental-health'" size="small" type="info" effect="plain">待接入</ElTag>
          </ElMenuItem>
        </ElMenu>
      </nav>

      <section class="student-growth-portrait__content">
        <template v-if="activeTopic === 'overview'">
          <div class="student-growth-portrait__view-switch">
            <ElSegmented
              v-model="overviewMode"
              :options="[
                { label: '发展总览', value: 'overview' },
                { label: '学校差异', value: 'schools' },
                { label: '趋势与跟进', value: 'follow-up' },
              ]"
            />
          </div>
          <RegionalOverviewPanel
            v-if="overviewMode === 'overview'"
            @change-view="changeOverviewView"
          />
          <SchoolComparisonPanel v-else-if="overviewMode === 'schools'" />
          <TrendFollowUpPanel v-else />
        </template>
        <MentalHealthPlaceholder v-else-if="activeTopic === 'mental-health'" />
        <TopicAnalysisPanel v-else-if="activeTopicDefinition" :topic="activeTopicDefinition" />
      </section>
    </div>
  </div>

  <ElDrawer v-model="dataDrawerVisible" title="数据与指标说明" size="440px">
    <ElAlert
      title="当前页面使用结构化模拟数据"
      description="模拟数据遵循未来后端契约，派生指标由原始模拟记录计算；接入真实后端后页面结构和统计口径保持不变。"
      type="info"
      :closable="false"
      show-icon
    />
    <ElDescriptions :column="1" border class="student-growth-data-drawer__descriptions">
      <ElDescriptionsItem label="数据版本">{{ mockDataMeta.version }}</ElDescriptionsItem>
      <ElDescriptionsItem label="来源类型">模拟数据（mock）</ElDescriptionsItem>
      <ElDescriptionsItem label="学校范围">区域共 {{ mockDataMeta.schoolCount }} 所学校</ElDescriptionsItem>
      <ElDescriptionsItem label="学生范围">{{ mockDataMeta.studentCount.toLocaleString() }} 名学生</ElDescriptionsItem>
      <ElDescriptionsItem label="更新时间">{{ mockDataMeta.updatedAt }}</ElDescriptionsItem>
    </ElDescriptions>
    <section class="student-growth-data-drawer__section">
      <h3>指标准入规则</h3>
      <ol>
        <li>来源字段、计算公式和统计分母明确。</li>
        <li>明确标注区域可比或仅校内纵向。</li>
        <li>缺失数据不使用 0 代替。</li>
        <li>敏感数据只展示授权后的匿名汇总。</li>
      </ol>
    </section>
    <section class="student-growth-data-drawer__section">
      <h3>心理健康边界</h3>
      <p>心理健康首期只展示建设规划和接入要求，不生成风险人数、诊断结论或学生标签。</p>
    </section>
  </ElDrawer>
</template>

<style scoped>
.student-growth-portrait {
  display: grid;
  min-width: 0;
  gap: var(--spacing-16);
  background: var(--color-bg);
}

.student-growth-portrait__workspace {
  display: grid;
  min-width: 0;
  align-items: start;
  grid-template-columns: 168px minmax(0, 1fr);
  gap: var(--spacing-16);
}

.student-growth-portrait__topics {
  position: sticky;
  top: 0;
  z-index: 2;
  min-width: 0;
  min-height: calc(
    100vh - var(--header-height) - var(--content-padding) - var(--content-padding)
  );
  max-height: calc(
    100vh - var(--header-height) - var(--content-padding) - var(--content-padding)
  );
  overflow-x: hidden;
  overflow-y: auto;
  border-radius: var(--radius-md);
  background: var(--color-white);
}

.student-growth-portrait__content {
  display: grid;
  min-width: 0;
  max-width: 100%;
  overflow-x: clip;
  gap: var(--spacing-16);
}

.student-growth-portrait__view-switch {
  display: flex;
  justify-content: flex-start;
}

.student-growth-data-drawer__descriptions {
  margin-top: var(--spacing-20);
}

.student-growth-data-drawer__section {
  margin-top: var(--spacing-24);
}

.student-growth-data-drawer__section h3 {
  margin-bottom: var(--spacing-12);
  font-size: var(--font-size-lg);
}

.student-growth-data-drawer__section ol {
  display: grid;
  gap: var(--spacing-8);
  padding-left: var(--spacing-20);
  color: var(--color-body);
}

.student-growth-data-drawer__section p {
  color: var(--color-body);
  line-height: var(--line-height-lg);
}

:deep(.student-growth-portrait__topics .el-menu) {
  border-right: 0;
}

:deep(.student-growth-portrait__topics .el-menu-item) {
  display: flex;
  height: 44px;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-8);
  padding: 0 var(--spacing-16);
}

:deep(.student-growth-portrait__topics .el-menu-item.is-active) {
  background: var(--color-primary-light);
  font-weight: var(--font-weight-medium);
}

@media (max-width: 860px) {
  .student-growth-portrait__workspace {
    grid-template-columns: 136px minmax(0, 1fr);
  }
}
</style>
