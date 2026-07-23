<script setup lang="ts">
import { Lock, Connection, DocumentChecked } from "@element-plus/icons-vue";

const plannedMetrics = [
  "心理筛查参与与完成情况",
  "心理咨询服务覆盖情况",
  "学校心理服务资源配置",
  "个案跟进、转介与复测闭环",
];

const requiredData = [
  { name: "筛查批次与量表版本", status: "待接入" },
  { name: "应参与和实际完成人数", status: "待接入" },
  { name: "匿名风险等级汇总", status: "待接入" },
  { name: "咨询、干预、转介和复测状态", status: "待接入" },
  { name: "学校心理教师与服务资源", status: "待接入" },
];
</script>

<template>
  <section class="mental-placeholder" aria-label="心理健康模块规划占位">
    <div class="mental-placeholder__hero">
      <ElIcon class="mental-placeholder__hero-icon"><Lock /></ElIcon>
      <div>
        <ElTag type="info" effect="light">已规划 · 待数据接入</ElTag>
        <h2>心理健康治理模块</h2>
        <p>区域层关注服务覆盖、资源配置和干预闭环，不展示原始答卷、咨询文本或学生心理标签。</p>
      </div>
    </div>

    <div class="mental-placeholder__grid">
      <section>
        <header>
          <ElIcon><DocumentChecked /></ElIcon>
          <div><h3>计划建设指标</h3><p>接入后只展示匿名聚合结果</p></div>
        </header>
        <ul>
          <li v-for="metric in plannedMetrics" :key="metric">{{ metric }}</li>
        </ul>
      </section>
      <section>
        <header>
          <ElIcon><Connection /></ElIcon>
          <div><h3>数据接入要求</h3><p>独立权限、审计和脱敏边界</p></div>
        </header>
        <ElTable :data="requiredData" row-key="name" stripe border>
          <ElTableColumn
            prop="name"
            column-key="name"
            label="数据项"
            min-width="220"
            show-overflow-tooltip
          />
          <ElTableColumn prop="status" column-key="status" label="状态" width="96">
            <template #default="{ row }"><ElTag type="info" effect="plain" size="small">{{ row.status }}</ElTag></template>
          </ElTableColumn>
        </ElTable>
      </section>
    </div>

    <ElAlert
      title="安全边界"
      description="心理健康数据不参与学生综合评分和学校公开排名；个体下钻必须单独授权并记录审计日志。"
      type="warning"
      :closable="false"
      show-icon
    />
  </section>
</template>

<style scoped>
.mental-placeholder {
  display: grid;
  gap: var(--spacing-16);
}

.mental-placeholder__hero {
  display: flex;
  align-items: center;
  gap: var(--spacing-20);
  padding: var(--spacing-32);
  border-radius: var(--radius-md);
  background: var(--color-white);
}

.mental-placeholder__hero-icon {
  width: 56px;
  height: 56px;
  flex: none;
  border-radius: var(--radius-md);
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: 26px;
}

.mental-placeholder__hero h2 {
  margin-top: var(--spacing-12);
  font-size: 22px;
  line-height: 32px;
}

.mental-placeholder__hero p,
.mental-placeholder header p {
  margin-top: var(--spacing-4);
  color: var(--color-secondary);
}

.mental-placeholder__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-16);
}

.mental-placeholder__grid > section {
  padding: var(--spacing-24);
  border-radius: var(--radius-md);
  background: var(--color-white);
}

.mental-placeholder header {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-12);
}

.mental-placeholder header > .el-icon {
  margin-top: var(--spacing-4);
  color: var(--color-primary);
  font-size: 20px;
}

.mental-placeholder h3 {
  font-size: var(--font-size-lg);
}

.mental-placeholder ul {
  display: grid;
  gap: var(--spacing-14);
  margin-top: var(--spacing-20);
  padding-left: var(--spacing-20);
  color: var(--color-body);
}

@media (max-width: 1180px) {
  .mental-placeholder__grid {
    grid-template-columns: 1fr;
  }
}
</style>
