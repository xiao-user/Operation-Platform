<template>
  <div class="header-actions">
    <el-dropdown trigger="click" @command="handleTenantSwitch">
      <button class="tenant-switch" type="button">
        <el-tag :type="TENANT_TAG_TYPE[currentTenant.type]" size="small" class="tenant-type-tag">
          {{ TENANT_TYPE_LABEL[currentTenant.type] }}
        </el-tag>
        <span class="tenant-name">{{ currentTenant.name }}</span>
        <el-icon class="action-arrow"><ArrowDown /></el-icon>
      </button>
      <template #dropdown>
        <el-dropdown-menu>
          <template v-for="(group, type) in groupedTenants" :key="type">
            <el-dropdown-item disabled class="tenant-group-label">
              {{ TENANT_TYPE_LABEL[type as TenantType] }}
            </el-dropdown-item>
            <el-dropdown-item
              v-for="tenant in group"
              :key="tenant.id"
              :command="tenant.id"
              :class="{ 'is-active': currentTenant.id === tenant.id }"
            >
              {{ tenant.name }}
            </el-dropdown-item>
          </template>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <el-tag :type="isAdmin ? 'primary' : 'success'" size="small">
      {{ isAdmin ? "管理员" : "普通成员" }}
    </el-tag>

    <el-dropdown v-if="isAdmin" trigger="click" @command="handleUserCommand">
      <button class="user-info" type="button">
        <el-avatar :size="32" class="user-avatar">{{ userInfo.initials }}</el-avatar>
        <span class="user-name">{{ userInfo.name }}</span>
        <el-icon class="action-arrow"><ArrowDown /></el-icon>
      </button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="menu-config">菜单配置</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
    <div v-else class="user-info is-static">
      <el-avatar :size="32" class="user-avatar">{{ userInfo.initials }}</el-avatar>
      <span class="user-name">{{ userInfo.name }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { ArrowDown } from "@element-plus/icons-vue";
import { TENANT_TAG_TYPE, TENANT_TYPE_LABEL } from "@/config/tenant";
import { useNavigationStore } from "@/stores/navigation";
import { useUserStore } from "@/stores/user";
import type { TenantType } from "@/types/user";

const router = useRouter();
const navigationStore = useNavigationStore();
const userStore = useUserStore();
const { userInfo, currentTenant, tenantList, availableTenants, isAdmin } = storeToRefs(userStore);

const groupedTenants = computed(() => {
  const groups: Partial<Record<TenantType, typeof availableTenants.value>> = {};
  for (const tenant of availableTenants.value) {
    if (!groups[tenant.type]) groups[tenant.type] = [];
    groups[tenant.type]!.push(tenant);
  }
  return groups;
});

async function handleTenantSwitch(tenantId: string) {
  const tenant = tenantList.value.find((item) => item.id === tenantId);
  if (!tenant || tenant.id === currentTenant.value.id) return;
  userStore.switchTenant(tenantId);
  navigationStore.loadTenant(tenant);
  await navigationStore.navigateToDefault(router);
}

async function handleUserCommand(command: string) {
  if (command !== "menu-config") return;
  const platformTenant = tenantList.value.find((tenant) => tenant.type === "platform");
  if (platformTenant && currentTenant.value.id !== platformTenant.id) {
    userStore.switchTenant(platformTenant.id);
    navigationStore.loadTenant(platformTenant);
  }
  await router.push("/system/menu-config");
}
</script>

<style scoped>
.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-24);
  flex-shrink: 0;
  height: 100%;
}

.tenant-switch,
.user-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-6);
  height: 100%;
  padding: 0;
  color: var(--color-title);
  font: inherit;
  background: transparent;
  border: 0;
}

.tenant-switch,
.user-info:not(.is-static) {
  cursor: pointer;
}

.tenant-switch:focus-visible,
.user-info:focus-visible {
  outline: 2px solid var(--color-primary-line-light);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

.tenant-type-tag {
  cursor: inherit;
  flex-shrink: 0;
}

.tenant-name {
  max-width: 160px;
  overflow: hidden;
  color: var(--color-title);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-md);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-arrow {
  color: var(--color-title);
  font-size: var(--font-size-xs);
  flex-shrink: 0;
}

:deep(.tenant-group-label) {
  padding: var(--spacing-6) var(--spacing-16) var(--spacing-2);
  color: var(--color-secondary);
  font-size: var(--font-size-xs);
  cursor: default;
}

.user-avatar {
  --el-avatar-bg-color: var(--color-primary);
  color: var(--color-white);
  font-size: var(--font-size-xs);
  flex-shrink: 0;
}

.user-name {
  color: var(--color-title);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-md);
  white-space: nowrap;
}
</style>
