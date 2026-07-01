<template>
  <div class="placeholder-page">
    <el-empty :description="`${pageTitle} 开发中...`" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useNavigationStore } from "@/stores/navigation";

const route = useRoute();
const navigationStore = useNavigationStore();

const scopedMenuId = computed(() => {
  const value = route.params.menuId;
  if (Array.isArray(value)) return value[0];
  return typeof value === "string" ? value : "";
});

const pageTitle = computed(() =>
  navigationStore.records.find((record) => record.id === scopedMenuId.value)?.name ||
  (typeof route.meta.title === "string" ? route.meta.title : "页面"),
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
