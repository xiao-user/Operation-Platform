<script setup lang="ts">
import { ref } from "vue";
import { Filter, InfoFilled, Search } from "@element-plus/icons-vue";
import PageFilterBar from "@/components/PageFilterBar.vue";

const emit = defineEmits<{
  query: [];
  openData: [];
}>();

const academicYear = defineModel<string>("academicYear", { required: true });
const semester = defineModel<string>("semester", { required: true });
const stage = defineModel<string>("stage", { required: true });
const schoolScope = defineModel<string>("schoolScope", { required: true });

const advancedVisible = ref(false);
const grade = ref("all");
const town = ref("all");
const dataStatus = ref("all");

const yearOptions = ["2025-2026学年", "2024-2025学年", "2023-2024学年"];
const semesterOptions = ["第二学期", "第一学期"];
const stageOptions = ["全部学段", "小学", "初中", "高中"];
const scopeOptions = ["区域内全部学校", "直属学校", "重点关注学校"];

function reset() {
  academicYear.value = "2025-2026学年";
  semester.value = "第二学期";
  stage.value = "全部学段";
  schoolScope.value = "区域内全部学校";
  grade.value = "all";
  town.value = "all";
  dataStatus.value = "all";
}
</script>

<template>
  <PageFilterBar aria-label="学生成长画像筛选条件">
      <label class="portrait-filter-field">
        <span>学年：</span>
        <ElSelect v-model="academicYear" aria-label="学年" class="portrait-filter-field__control">
          <ElOption v-for="item in yearOptions" :key="item" :label="item" :value="item" />
        </ElSelect>
      </label>
      <label class="portrait-filter-field">
        <span>学期：</span>
        <ElSelect v-model="semester" aria-label="学期" class="portrait-filter-field__control">
          <ElOption v-for="item in semesterOptions" :key="item" :label="item" :value="item" />
        </ElSelect>
      </label>
      <label class="portrait-filter-field">
        <span>教育阶段：</span>
        <ElSelect v-model="stage" aria-label="教育阶段" class="portrait-filter-field__control">
          <ElOption v-for="item in stageOptions" :key="item" :label="item" :value="item" />
        </ElSelect>
      </label>
      <label class="portrait-filter-field">
        <span>学校范围：</span>
        <ElSelect v-model="schoolScope" aria-label="学校范围" class="portrait-filter-field__control">
          <ElOption v-for="item in scopeOptions" :key="item" :label="item" :value="item" />
        </ElSelect>
      </label>
      <template #actions>
        <ElButton type="primary" :icon="Search" @click="emit('query')">查询</ElButton>
        <ElButton @click="reset">重置</ElButton>
        <ElButton :icon="Filter" @click="advancedVisible = true">更多筛选</ElButton>
        <ElButton :icon="InfoFilled" @click="emit('openData')">数据说明</ElButton>
      </template>
  </PageFilterBar>

  <ElDrawer v-model="advancedVisible" title="更多筛选" size="360px">
    <ElForm label-position="top">
      <ElFormItem label="年级">
        <ElSelect v-model="grade" class="portrait-drawer-control">
          <ElOption label="全部年级" value="all" />
          <ElOption label="一年级" value="grade-1" />
          <ElOption label="六年级" value="grade-6" />
          <ElOption label="九年级" value="grade-9" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="镇街">
        <ElSelect v-model="town" class="portrait-drawer-control">
          <ElOption label="全部镇街" value="all" />
          <ElOption label="东兴街道" value="dongxing" />
          <ElOption label="榕华街道" value="ronghua" />
          <ElOption label="新兴街道" value="xinxing" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="数据状态">
        <ElRadioGroup v-model="dataStatus">
          <ElRadioButton value="all">全部</ElRadioButton>
          <ElRadioButton value="complete">完整</ElRadioButton>
          <ElRadioButton value="attention">需关注</ElRadioButton>
        </ElRadioGroup>
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="advancedVisible = false">取消</ElButton>
      <ElButton type="primary" @click="advancedVisible = false; emit('query')">应用筛选</ElButton>
    </template>
  </ElDrawer>
</template>

<style scoped>
.portrait-filter-field {
  display: flex;
  width: 280px;
  height: 32px;
  align-items: center;
  flex: none;
  color: var(--color-title);
  font-size: var(--font-size-md);
}

.portrait-filter-field > span {
  flex: none;
  white-space: nowrap;
}

.portrait-filter-field__control {
  min-width: 0;
  flex: 1;
}

.portrait-drawer-control {
  width: 100%;
}
</style>
