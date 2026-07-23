<script setup lang="ts">
import { InfoFilled, Search } from "@element-plus/icons-vue";
import PageFilterBar from "@/components/PageFilterBar.vue";

const emit = defineEmits<{
  query: [];
  openData: [];
}>();

const academicYear = defineModel<string>("academicYear", { required: true });
const semester = defineModel<string>("semester", { required: true });
const stage = defineModel<string>("stage", { required: true });
const schoolScope = defineModel<string>("schoolScope", { required: true });
const grade = defineModel<string>("grade", { required: true });
const town = defineModel<string>("town", { required: true });
const dataStatus = defineModel<string>("dataStatus", { required: true });

const yearOptions = ["2025-2026学年", "2024-2025学年", "2023-2024学年"];
const semesterOptions = ["第二学期", "第一学期"];
const stageOptions = ["全部学段", "小学", "初中", "高中"];
const scopeOptions = ["区域内全部学校", "直属学校", "重点关注学校"];
const gradeOptions = ["全部年级", "一年级", "六年级", "九年级"];
const townOptions = ["全部镇街", "东兴街道", "榕华街道", "新兴街道"];
const dataStatusOptions = ["全部数据", "数据完整", "需关注"];

function reset() {
  academicYear.value = "2025-2026学年";
  semester.value = "第二学期";
  stage.value = "全部学段";
  schoolScope.value = "区域内全部学校";
  grade.value = "全部年级";
  town.value = "全部镇街";
  dataStatus.value = "全部数据";
  emit("query");
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
        <span>年级：</span>
        <ElSelect v-model="grade" aria-label="年级" class="portrait-filter-field__control">
          <ElOption v-for="item in gradeOptions" :key="item" :label="item" :value="item" />
        </ElSelect>
      </label>
      <label class="portrait-filter-field">
        <span>镇街：</span>
        <ElSelect v-model="town" aria-label="镇街" class="portrait-filter-field__control">
          <ElOption v-for="item in townOptions" :key="item" :label="item" :value="item" />
        </ElSelect>
      </label>
      <label class="portrait-filter-field">
        <span>学校范围：</span>
        <ElSelect v-model="schoolScope" aria-label="学校范围" class="portrait-filter-field__control">
          <ElOption v-for="item in scopeOptions" :key="item" :label="item" :value="item" />
        </ElSelect>
      </label>
      <label class="portrait-filter-field">
        <span>数据状态：</span>
        <ElSelect v-model="dataStatus" aria-label="数据状态" class="portrait-filter-field__control">
          <ElOption
            v-for="item in dataStatusOptions"
            :key="item"
            :label="item"
            :value="item"
          />
        </ElSelect>
      </label>
      <template #actions>
        <ElButton type="primary" :icon="Search" @click="emit('query')">查询</ElButton>
        <ElButton @click="reset">重置</ElButton>
        <ElButton :icon="InfoFilled" @click="emit('openData')">数据说明</ElButton>
      </template>
  </PageFilterBar>
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
</style>
