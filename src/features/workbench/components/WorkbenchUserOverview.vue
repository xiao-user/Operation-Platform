<template>
  <div class="user-overview">
    <div class="user-identity">
      <span class="user-avatar">{{ data.initials }}</span>
      <div class="user-details">
        <div class="user-name-row">
          <strong>{{ data.name }}</strong>
          <span class="role-tag">{{ data.roleName }}</span>
        </div>
        <div class="account-row">
          <span>账号 ID：{{ data.account }}</span>
          <el-button text circle aria-label="复制账号 ID" @click="copyAccount">
            <el-icon><CopyDocument /></el-icon>
          </el-button>
        </div>
      </div>
    </div>

    <div class="overview-stats" aria-label="个人消息概览">
      <template v-for="stat in data.stats" :key="stat.label">
        <RouterLink
          v-if="stat.target"
          class="overview-stat"
          :to="internalLocation(stat.target)"
          :target="stat.target.openMode === 'new-tab' ? '_blank' : undefined"
          :rel="stat.target.openMode === 'new-tab' ? 'noopener noreferrer' : undefined"
        >
          <strong>{{ stat.value }}</strong>
          <span>{{ stat.label }}</span>
        </RouterLink>
        <div v-else class="overview-stat is-static">
          <strong>{{ stat.value }}</strong>
          <span>{{ stat.label }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CopyDocument } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import type {
  WorkbenchQuickLinkData,
  WorkbenchUserOverviewData,
} from "@/features/workbench/types";

const props = defineProps<{ data: WorkbenchUserOverviewData }>();

function internalLocation(item: WorkbenchQuickLinkData) {
  if (item.openMode === "current" || !item.tenantId) return item.target;
  return { path: item.target, query: { tenantId: item.tenantId } };
}

async function copyAccount() {
  try {
    await navigator.clipboard.writeText(props.data.account);
    ElMessage.success("账号 ID 已复制");
  } catch {
    ElMessage.error("复制失败，请手动复制账号 ID");
  }
}
</script>

<style scoped>
.user-overview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 121px;
  gap: var(--spacing-24);
  padding: 32px;
}

.user-identity,
.user-name-row,
.account-row,
.overview-stats {
  display: flex;
  align-items: center;
}

.user-identity {
  min-width: 0;
  gap: var(--spacing-16);
}

.user-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  flex: 0 0 56px;
  color: var(--color-primary);
  font-size: 24px;
  font-weight: var(--font-weight-semibold);
  background: var(--color-primary-light);
  border-radius: var(--radius-full);
}

.user-details {
  min-width: 0;
}

.user-name-row {
  min-width: 0;
  gap: var(--spacing-8);
}

.user-name-row strong {
  overflow: hidden;
  color: var(--color-title);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-tag {
  flex-shrink: 0;
  padding: 0 var(--spacing-8);
  color: var(--color-body);
  font-size: var(--font-size-xs);
  line-height: 22px;
  background: var(--color-bg-muted);
  border-radius: var(--radius-sm);
}

.account-row {
  min-width: 0;
  margin-top: var(--spacing-4);
  color: var(--color-body);
  font-size: var(--font-size-sm);
  line-height: 22px;
}

.account-row > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-row :deep(.el-button) {
  width: 24px;
  height: 24px;
  margin-left: var(--spacing-2);
  color: var(--color-secondary);
}

.overview-stats {
  flex-shrink: 0;
  gap: 40px;
}

.overview-stat {
  display: flex;
  min-width: 48px;
  flex-direction: column;
  color: inherit;
  text-decoration: none;
}

.overview-stat strong {
  color: var(--color-title);
  font-size: 18px;
  font-weight: var(--font-weight-medium);
  line-height: 27px;
}

.overview-stat span {
  color: var(--color-secondary);
  font-size: var(--font-size-xs);
  line-height: 20px;
  white-space: nowrap;
}

.overview-stat:not(.is-static):hover strong,
.overview-stat:not(.is-static):hover span {
  color: var(--color-primary);
}

@container (max-width: 680px) {
  .user-overview {
    align-items: flex-start;
    flex-direction: column;
    padding: var(--spacing-20);
  }

  .overview-stats {
    width: 100%;
    justify-content: space-between;
    gap: var(--spacing-16);
  }
}
</style>
