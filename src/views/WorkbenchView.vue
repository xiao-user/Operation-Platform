<template>
  <div class="workbench-page">
    <section class="workbench-hero">
      <div>
        <p class="eyebrow">{{ tenantTypeLabel }}工作台</p>
        <h1>{{ currentTenant.name }}</h1>
        <span>聚合关键运营数据、待办事项和常用入口，后续可按租户类型接入真实业务指标。</span>
      </div>
      <el-button type="primary">查看今日概览</el-button>
    </section>

    <section class="metric-grid">
      <article v-for="metric in metrics" :key="metric.label" class="metric-card">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
        <small>{{ metric.trend }}</small>
      </article>
    </section>

    <section class="content-grid">
      <article class="panel-card panel-card-large">
        <div class="panel-heading">
          <strong>数据趋势</strong>
          <span>近 7 日</span>
        </div>
        <div class="chart-placeholder">
          <span v-for="bar in chartBars" :key="bar" :style="{ height: `${bar}%` }" />
        </div>
      </article>

      <article class="panel-card">
        <div class="panel-heading">
          <strong>待办提醒</strong>
          <span>{{ todos.length }} 项</span>
        </div>
        <ul class="todo-list">
          <li v-for="todo in todos" :key="todo">
            <span />
            {{ todo }}
          </li>
        </ul>
      </article>

      <article class="panel-card panel-card-large">
        <div class="panel-heading">
          <strong>常用功能</strong>
          <span>快捷入口</span>
        </div>
        <div class="shortcut-grid">
          <button v-for="shortcut in shortcuts" :key="shortcut" type="button">
            {{ shortcut }}
          </button>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { TENANT_TYPE_LABEL } from "@/config/tenant";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();
const { currentTenant } = storeToRefs(userStore);

const tenantTypeLabel = computed(() => TENANT_TYPE_LABEL[currentTenant.value.type]);

const metrics = [
  { label: "今日访问", value: "12,846", trend: "较昨日 +8.2%" },
  { label: "待处理事项", value: "28", trend: "高优先级 6 项" },
  { label: "本周新增", value: "436", trend: "持续增长" },
  { label: "服务完成率", value: "96.8%", trend: "稳定运行" },
];
const chartBars = [42, 58, 46, 72, 66, 84, 78, 90, 62, 74, 88, 70];
const todos = ["审核待处理", "菜单配置需确认", "本周数据报表", "服务异常巡检"];
const shortcuts = ["数据看板", "人员管理", "课程管理", "通知公告", "结算中心", "系统设置"];
</script>

<style scoped>
.workbench-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-16);
}

.workbench-hero,
.metric-card,
.panel-card {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-s);
}

.workbench-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-24);
  padding: var(--spacing-24);
}

.eyebrow {
  margin: 0 0 var(--spacing-8);
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.workbench-hero h1 {
  margin: 0;
  color: var(--color-title);
  font-size: 24px;
  line-height: 32px;
}

.workbench-hero span {
  display: inline-block;
  margin-top: var(--spacing-8);
  color: var(--color-secondary);
  font-size: var(--font-size-md);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--spacing-16);
}

.metric-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-8);
  padding: var(--spacing-20);
}

.metric-card span,
.panel-heading span,
.metric-card small {
  color: var(--color-secondary);
  font-size: var(--font-size-sm);
}

.metric-card strong {
  color: var(--color-title);
  font-size: 28px;
  line-height: 36px;
}

.content-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--spacing-16);
}

.panel-card {
  min-height: 260px;
  padding: var(--spacing-20);
}

.panel-card-large {
  grid-column: span 1;
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-20);
}

.panel-heading strong {
  color: var(--color-title);
  font-size: var(--font-size-lg);
}

.chart-placeholder {
  display: flex;
  align-items: end;
  gap: var(--spacing-12);
  height: 188px;
  padding: var(--spacing-16);
  background: linear-gradient(180deg, var(--color-bg-page), var(--color-white));
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.chart-placeholder span {
  flex: 1;
  min-width: 10px;
  background: linear-gradient(180deg, var(--color-primary), var(--color-primary-line-light));
  border-radius: var(--radius-full) var(--radius-full) 0 0;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-12);
  padding: 0;
  margin: 0;
  list-style: none;
}

.todo-list li {
  display: flex;
  align-items: center;
  gap: var(--spacing-10);
  color: var(--color-body);
  font-size: var(--font-size-md);
}

.todo-list li span {
  width: 8px;
  height: 8px;
  background: var(--color-primary);
  border-radius: var(--radius-full);
}

.shortcut-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--spacing-12);
}

.shortcut-grid button {
  min-height: 64px;
  color: var(--color-body);
  background: var(--color-bg-page);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
}

.shortcut-grid button:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

@media (max-width: 1200px) {
  .metric-grid,
  .content-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

