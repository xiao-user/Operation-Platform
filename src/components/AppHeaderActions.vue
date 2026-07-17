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

    <el-dropdown
      v-if="availableRoleRecords.length > 1"
      trigger="click"
      @command="handleRoleSwitch"
    >
      <button class="role-switch" type="button" aria-label="切换当前角色">
        <el-tag class="role-tag" :type="isAdmin ? 'primary' : 'success'" size="small">
          {{ activeRoleLabel }}
        </el-tag>
        <el-icon class="action-arrow"><ArrowDown /></el-icon>
      </button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            v-for="role in availableRoleRecords"
            :key="role.id"
            :command="role.id"
            :class="{ 'is-active': activeRoleRecord?.id === role.id }"
          >
            {{ role.name }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
    <el-tag v-else class="role-tag" :type="isAdmin ? 'primary' : 'success'" size="small">
      {{ activeRoleLabel }}
    </el-tag>

    <el-dropdown trigger="click" @command="handleUserCommand">
      <button class="user-info" type="button">
        <el-avatar :size="32" class="user-avatar">{{ userInfo.initials }}</el-avatar>
        <span class="user-name">{{ userInfo.name }}</span>
        <el-icon class="action-arrow"><ArrowDown /></el-icon>
      </button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item v-if="canOpenPlatformConfig" command="menu-config">菜单配置</el-dropdown-item>
          <el-dropdown-item v-if="authStore.canChangePassword" command="change-password">
            修改密码
          </el-dropdown-item>
          <el-dropdown-item divided command="sign-out">退出登录</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <ChangePasswordDialog v-model="passwordDialogVisible" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { ElMessageBox } from "element-plus";
import { ArrowDown } from "@element-plus/icons-vue";
import ChangePasswordDialog from "@/components/ChangePasswordDialog.vue";
import { TENANT_TAG_TYPE, TENANT_TYPE_LABEL } from "@/config/tenant";
import { useNavigationStore } from "@/stores/navigation";
import { useUserStore } from "@/stores/user";
import { useWorkbenchStore } from "@/stores/workbench";
import { useAuthStore } from "@/stores/auth";
import type { TenantType } from "@/types/user";

const router = useRouter();
const navigationStore = useNavigationStore();
const userStore = useUserStore();
const workbenchStore = useWorkbenchStore();
const authStore = useAuthStore();
const passwordDialogVisible = ref(false);
const { userInfo, currentTenant, availableTenants, isAdmin } = storeToRefs(userStore);
const { activeRoleRecord, availableRoleRecords } = storeToRefs(navigationStore);

const groupedTenants = computed(() => {
  const groups: Partial<Record<TenantType, typeof availableTenants.value>> = {};
  for (const tenant of availableTenants.value) {
    if (!groups[tenant.type]) groups[tenant.type] = [];
    groups[tenant.type]!.push(tenant);
  }
  return groups;
});

const activeRoleLabel = computed(() => {
  return activeRoleRecord.value?.name ?? "暂无角色";
});

const platformAdminTenant = computed(() =>
  availableTenants.value.find(
    (tenant) => tenant.type === "platform" && userStore.hasAdminRoleForTenant(tenant.id),
  ) ?? null,
);

const canOpenPlatformConfig = computed(() => isAdmin.value && Boolean(platformAdminTenant.value));

async function handleTenantSwitch(tenantId: string) {
  const tenant = availableTenants.value.find((item) => item.id === tenantId);
  if (!tenant || tenant.id === currentTenant.value.id) return;
  if (!(await confirmDiscardWorkbenchChanges())) return;
  userStore.switchTenant(tenantId);
  navigationStore.loadTenant(tenant);
  await navigationStore.navigateToDefault(router);
}

async function handleRoleSwitch(roleId: string) {
  if (roleId === activeRoleRecord.value?.id) return;
  if (!(await confirmDiscardWorkbenchChanges())) return;
  await userStore.setActiveRoleForTenant(currentTenant.value.id, roleId);
  if (router.currentRoute.value.name === "menu-unavailable") {
    await navigationStore.navigateToDefault(router);
    return;
  }
  await navigationStore.ensureValidCurrentRoute(router);
}

async function handleUserCommand(command: string) {
  if (command === "change-password") {
    passwordDialogVisible.value = true;
    return;
  }
  if (command === "sign-out") {
    if (!(await confirmDiscardWorkbenchChanges())) return;
    await authStore.signOut();
    userStore.resetPersistence();
    await router.replace("/");
    return;
  }
  if (command !== "menu-config") return;
  if (!(await confirmDiscardWorkbenchChanges())) return;
  const platformTenant = platformAdminTenant.value;
  if (!platformTenant) return;
  if (platformTenant && currentTenant.value.id !== platformTenant.id) {
    userStore.switchTenant(platformTenant.id);
    navigationStore.loadTenant(platformTenant);
  }
  await router.push("/system/menu-config");
}

async function confirmDiscardWorkbenchChanges() {
  if (!workbenchStore.hasUnsavedChanges) return true;
  try {
    await ElMessageBox.confirm("切换后尚未保存的工作台调整将丢失。", "切换组织", {
      type: "warning",
      confirmButtonText: "放弃并切换",
      cancelButtonText: "继续调整",
    });
    workbenchStore.cancelEditing();
    return true;
  } catch {
    return false;
  }
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
.role-switch,
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
.role-switch,
.user-info:not(.is-static) {
  cursor: pointer;
}

.tenant-switch:focus-visible,
.role-switch:focus-visible,
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

@media (max-width: 767px) {
  .header-actions {
    gap: var(--spacing-8);
  }

  .role-tag,
  .role-switch,
  .user-info {
    display: none;
  }

  .tenant-name {
    max-width: 112px;
    font-size: var(--font-size-sm);
  }
}
</style>
