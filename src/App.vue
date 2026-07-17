<template>
  <el-config-provider :locale="zhCn">
    <AuthView v-if="!authStore.isAuthenticated" />
    <RouterView v-else />
  </el-config-provider>
</template>

<script setup lang="ts">
import zhCn from "element-plus/es/locale/lang/zh-cn";
import AuthView from "@/views/AuthView.vue";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
</script>
