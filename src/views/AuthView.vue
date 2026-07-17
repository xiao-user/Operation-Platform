<template>
  <main class="auth-page">
    <section class="auth-card">
      <div class="auth-brand">智慧校园运营管理平台</div>
      <h1>登录平台</h1>
      <p>使用 Supabase 中创建的账号登录，组织与权限配置将从云端加载。</p>

      <el-form label-position="top" @submit.prevent="handleSubmit">
        <el-form-item label="邮箱">
          <el-input v-model="email" autocomplete="username" placeholder="请输入登录邮箱" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="password"
            type="password"
            show-password
            autocomplete="current-password"
            placeholder="请输入密码"
            @keyup.enter="handleSubmit"
          />
        </el-form-item>
        <el-alert
          v-if="errorMessage"
          :title="errorMessage"
          type="error"
          show-icon
          :closable="false"
        />
        <el-button class="submit-button" type="primary" :loading="loading" @click="handleSubmit">
          登录
        </el-button>
      </el-form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useAuthStore } from "@/stores/auth";
import { useUserStore } from "@/stores/user";

const authStore = useAuthStore();
const userStore = useUserStore();
const router = useRouter();
const { loading, errorMessage } = storeToRefs(authStore);
const email = ref("");
const password = ref("");

async function handleSubmit() {
  if (!email.value.trim() || !password.value) {
    ElMessage.warning("请输入邮箱和密码");
    return;
  }
  try {
    const session = await authStore.signIn(email.value, password.value);
    await userStore.initializePersistence(session.user, true);
    await router.replace(userStore.currentTenant.id ? "/workbench" : "/menu-unavailable");
  } catch (error) {
    if (!errorMessage.value) {
      ElMessage.error(error instanceof Error ? error.message : "登录失败");
    }
  }
}
</script>

<style scoped>
.auth-page {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: var(--spacing-24);
  background:
    radial-gradient(circle at 20% 10%, var(--color-primary-line-light), transparent 34%),
    var(--color-bg);
}

.auth-card {
  width: min(420px, 100%);
  padding: var(--spacing-32);
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-l);
}

.auth-brand {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

h1 {
  margin: var(--spacing-12) 0 var(--spacing-8);
  color: var(--color-title);
}

p {
  margin: 0 0 var(--spacing-24);
  color: var(--color-secondary);
  line-height: var(--line-height-lg);
}

.submit-button {
  width: 100%;
  margin-top: var(--spacing-8);
}
</style>
