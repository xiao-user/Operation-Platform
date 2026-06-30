<template>
  <NewGatePageShell active-tab="person-group">
    <div class="content-placeholder">
      <el-empty description="人员分组页面" :image-size="80" />
    </div>
  </NewGatePageShell>
</template>

<script setup lang="ts">
import NewGatePageShell from '@/components/security/NewGatePageShell.vue'
</script>

<style scoped>
.content-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-white);
  margin-top: 1px;
}
</style>
