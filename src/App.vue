<template>
  <el-config-provider :locale="zhCn">
    <main
      v-if="isBooting"
      v-loading="!userStore.persistenceError"
      class="app-bootstrap"
      element-loading-text="加载中"
    >
      <section v-if="userStore.persistenceError" class="bootstrap-error">
        <el-alert
          :title="userStore.persistenceError"
          type="error"
          show-icon
          :closable="false"
        />
        <el-button type="primary" :loading="userStore.persistenceLoading" @click="retryBootstrap">
          重新加载
        </el-button>
      </section>
    </main>
    <AuthView v-else-if="!authStore.isAuthenticated" />
    <RouterView v-else />
  </el-config-provider>
</template>

<script setup lang="ts">
import { computed } from "vue";
import zhCn from "element-plus/es/locale/lang/zh-cn";
import AuthView from "@/views/AuthView.vue";
import { useAuthStore } from "@/stores/auth";
import { useUserStore } from "@/stores/user";

const authStore = useAuthStore();
const userStore = useUserStore();

const isBooting = computed(() =>
  !authStore.initialized ||
  (authStore.isAuthenticated && !userStore.persistenceInitialized),
);

function retryBootstrap() {
  const identity = authStore.session?.user ?? null;
  if (!identity) return;
  void userStore.initializePersistence(identity, true).catch(() => {
    // The visible bootstrap state is driven by the user store error.
  });
}
</script>

<style scoped>
.app-bootstrap {
  display: grid;
  min-height: 100vh;
  place-items: center;
  background: var(--color-bg);
}

.bootstrap-error {
  display: grid;
  width: min(420px, calc(100% - 48px));
  gap: var(--spacing-16);
  justify-items: center;
}
</style>
