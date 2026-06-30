<template>
  <div class="menu-unavailable">
    <el-empty description="当前租户暂无可访问页面">
      <template #description>
        <p>当前租户暂无可访问页面</p>
        <span>请联系管理员在菜单配置中启用至少一个内部页面。</span>
      </template>
    </el-empty>
  </div>
</template>

<style scoped>
.menu-unavailable {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - var(--header-height) - var(--spacing-32));
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.menu-unavailable p {
  margin: 0 0 var(--spacing-4);
  color: var(--color-title);
  font-weight: var(--font-weight-semibold);
}

.menu-unavailable span {
  color: var(--color-secondary);
  font-size: var(--font-size-sm);
}
</style>
