<template>
  <div class="placeholder-page">
    <el-empty :description="`${pageTitle} 开发中...`" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const pageTitle = computed(() =>
  typeof route.meta.title === "string" ? route.meta.title : "页面",
);
</script>

<style scoped>
.placeholder-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
  background: var(--color-white);
}
</style>
