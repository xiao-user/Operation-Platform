<template>
  <header class="app-header">
    <div class="header-brand">
      <div class="brand-logo">
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 2L3 6V10C3 13.9 6.1 17.5 10 18.5C13.9 17.5 17 13.9 17 10V6L10 2Z"
            fill="var(--color-primary)"
            opacity="0.15"
          />
          <path
            d="M8 10L9.5 11.5L12.5 8.5"
            stroke="var(--color-primary)"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M10 3.5L4 7V10.5C4 13.7 6.6 16.7 10 17.5C13.4 16.7 16 13.7 16 10.5V7L10 3.5Z"
            stroke="var(--color-primary)"
            stroke-width="1"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <span class="brand-name">{{ currentTenant.shortName }}</span>
    </div>

    <div class="header-shell">
      <nav class="header-nav">
        <div
          v-for="tab in moduleNodes"
          :key="tab.id"
          class="nav-tab"
          :class="{ active: activeModuleId === tab.id }"
          @click="handleTabClick(tab)"
        >
          <span class="nav-tab-label">{{ tab.name }}</span>
          <div class="nav-tab-indicator" />
        </div>
      </nav>

      <div class="header-right">
        <!-- 租户切换 -->
        <el-dropdown @command="handleTenantSwitch">
          <div class="tenant-switch">
            <el-tag
              :type="TENANT_TAG_TYPE[currentTenant.type]"
              size="small"
              class="tenant-type-tag"
            >
              {{ TENANT_TYPE_LABEL[currentTenant.type] }}
            </el-tag>
            <span class="tenant-name">{{ currentTenant.name }}</span>
            <el-icon class="tenant-arrow"><ArrowDown /></el-icon>
          </div>
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

        <button class="notification-btn" type="button" @click="handleNotification">
          <el-icon><Bell /></el-icon>
        </button>

        <!-- 角色切换 -->
        <el-dropdown @command="handleRoleCommand">
          <div class="role-switch">
            <el-tag :type="currentRole === 'admin' ? 'primary' : 'success'" size="small">
              {{ ROLE_LABEL[currentRole] }}
            </el-tag>
            <el-icon class="role-arrow"><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="option in ROLE_OPTIONS"
                :key="option.value"
                :command="option.value"
                :class="{ 'is-active': currentRole === option.value }"
              >
                {{ option.label }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <!-- 用户菜单 -->
        <el-dropdown @command="handleUserCommand">
          <div class="user-info">
            <el-avatar :size="32" class="user-avatar">{{ userInfo.initials }}</el-avatar>
            <span class="user-name">{{ userInfo.name }}</span>
            <el-icon class="user-arrow"><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-if="isAdmin" command="menu-config">菜单配置</el-dropdown-item>
              <el-dropdown-item command="profile">个人信息</el-dropdown-item>
              <el-dropdown-item command="password">修改密码</el-dropdown-item>
              <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { Bell, ArrowDown } from "@element-plus/icons-vue";
import { ROLE_OPTIONS, ROLE_LABEL } from "@/config/user";
import { useNavigationStore } from "@/stores/navigation";
import { useUserStore } from "@/stores/user";
import type { MenuTreeNode } from "@/features/menu-config/types";
import type { UserRole, TenantType } from "@/types/user";

const router = useRouter();
const navigationStore = useNavigationStore();
const userStore = useUserStore();

const { activeModuleId, moduleNodes } = storeToRefs(navigationStore);
const { role: currentRole, userInfo, currentTenant, tenantList, isAdmin } = storeToRefs(userStore);

// 租户类型标签与颜色映射
const TENANT_TYPE_LABEL: Record<TenantType, string> = {
  school: "学校",
  bureau: "教育局",
  org: "机构",
};

const TENANT_TAG_TYPE: Record<TenantType, "info" | "warning" | "success"> = {
  school: "info",
  bureau: "warning",
  org: "success",
};

// 按类型分组租户，用于下拉分组展示
const groupedTenants = computed(() => {
  const groups: Partial<Record<TenantType, typeof tenantList.value>> = {};
  for (const tenant of tenantList.value) {
    if (!groups[tenant.type]) groups[tenant.type] = [];
    groups[tenant.type]!.push(tenant);
  }
  return groups;
});

function handleTabClick(tab: MenuTreeNode) {
  navigationStore.navigateToMenu(tab.id, router);
}

async function handleTenantSwitch(tenantId: string) {
  const tenant = tenantList.value.find((t) => t.id === tenantId);
  if (!tenant || tenant.id === currentTenant.value.id) return;
  userStore.switchTenant(tenantId);
  navigationStore.loadTenant(tenant);
  const firstModule = navigationStore.moduleNodes[0];
  if (firstModule) await navigationStore.navigateToMenu(firstModule.id, router);
}

function handleNotification() {
  // TODO: 通知面板
}

function handleRoleCommand(role: UserRole) {
  userStore.setRole(role);
  void navigationStore.ensureValidCurrentRoute(router);
}

function handleUserCommand(command: string) {
  if (command === "menu-config") {
    router.push("/system/menu-config");
    return;
  }
  if (command === "logout") {
    // TODO: 退出登录
  }
}
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  height: var(--header-height);
  background: var(--color-white);
  border-bottom: 1px solid var(--color-border);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: var(--spacing-12);
  height: 100%;
  padding: var(--spacing-12) var(--spacing-24);
  width: var(--sidebar-width);
  flex-shrink: 0;
  border-right: 1px solid var(--color-border);
  overflow: hidden;
}

.brand-logo {
  width: 32px;
  height: 32px;
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.brand-name {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-title);
  line-height: var(--line-height-md);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-shell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 var(--spacing-16);
  gap: var(--spacing-64);
}

.header-nav {
  display: flex;
  align-items: center;
  flex: 1;
  height: 100%;
  gap: var(--spacing-32);
  padding: 0 var(--spacing-16);
  overflow-x: auto;
  scrollbar-width: none;
}
.header-nav::-webkit-scrollbar {
  display: none;
}

.nav-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  cursor: pointer;
  flex-shrink: 0;
  justify-content: space-between;
}

.nav-tab-label {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-regular);
  color: var(--color-title);
  line-height: var(--line-height-lg);
  padding: var(--spacing-12) 0 var(--spacing-10);
  white-space: nowrap;
  transition: color 0.2s;
}
.nav-tab:hover .nav-tab-label {
  color: var(--color-primary);
}
.nav-tab.active .nav-tab-label {
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
}

.nav-tab-indicator {
  height: 2px;
  width: 100%;
  background-color: transparent;
}
.nav-tab.active .nav-tab-indicator {
  background-color: var(--color-primary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-24);
  flex-shrink: 0;
  height: 100%;
}

/* 租户切换 */
.tenant-switch {
  display: flex;
  align-items: center;
  gap: var(--spacing-6);
  cursor: pointer;
  outline: none;
  border: none;
}

.tenant-type-tag {
  cursor: pointer;
  flex-shrink: 0;
}

.tenant-name {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-title);
  line-height: var(--line-height-md);
  white-space: nowrap;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tenant-arrow {
  font-size: var(--font-size-xs);
  color: var(--color-title);
  flex-shrink: 0;
}

:deep(.tenant-group-label) {
  font-size: var(--font-size-xs);
  color: var(--color-secondary);
  cursor: default;
  padding: var(--spacing-6) var(--spacing-16) var(--spacing-2);
}

/* 通知按钮 */
.notification-btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  color: var(--color-body);
  cursor: pointer;
}
.notification-btn:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

/* 角色切换 */
.role-switch {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  cursor: pointer;
  outline: none;
  border: none;
}

.role-arrow,
.user-arrow {
  font-size: var(--font-size-xs);
  color: var(--color-title);
}

/* 用户信息 */
.user-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-6);
  cursor: pointer;
  height: 100%;
  outline: none;
  border: none;
}

.user-avatar {
  background-color: var(--color-primary) !important;
  color: var(--color-white);
  font-size: var(--font-size-xs);
  flex-shrink: 0;
}

.user-name {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-title);
  line-height: var(--line-height-md);
  white-space: nowrap;
}
</style>
