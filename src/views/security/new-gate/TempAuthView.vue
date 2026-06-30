<template>
  <NewGatePageShell active-tab="temp-auth">
    <div class="content-placeholder"><el-empty description="临时授权页面" :image-size="80" /></div>
  </NewGatePageShell>
</template>
<script setup lang="ts">
import NewGatePageShell from '@/components/security/NewGatePageShell.vue'
</script>
<style scoped>
.content-placeholder { flex: 1; display: flex; align-items: center; justify-content: center; background: var(--color-white); margin-top: 1px; }
</style>
