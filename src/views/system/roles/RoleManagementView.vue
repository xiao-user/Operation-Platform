<template>
  <div class="platform-admin-page">
    <section class="filter-card">
      <div class="filter-item">
        <span>管理组织</span>
        <el-select v-model="selectedTenantId" filterable placeholder="请选择组织">
          <el-option
            v-for="tenant in tenantList"
            :key="tenant.id"
            :label="tenant.name"
            :value="tenant.id"
          />
        </el-select>
      </div>
      <el-button type="primary" :icon="Plus" :disabled="!selectedTenant" @click="openCreate">
        新增角色
      </el-button>
      <el-button :icon="RefreshLeft" :disabled="!selectedTenant" @click="handleReset">
        恢复默认角色
      </el-button>
    </section>

    <el-alert
      v-if="recoveryNotice"
      class="page-alert"
      :title="recoveryNotice"
      type="warning"
      show-icon
      :closable="false"
    />

    <section class="table-card">
      <div class="table-toolbar">
        <div>
          <strong>{{ selectedTenant?.name ?? "请选择组织" }}</strong>
          <span class="record-count">共 {{ roles.length }} 个角色</span>
        </div>
      </div>

      <el-table :data="roles" row-key="id">
        <el-table-column label="角色名称" min-width="180">
          <template #default="{ row }">
            <div class="primary-cell">
              <strong>{{ row.name }}</strong>
              <span>{{ row.description || "暂无描述" }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="row.builtIn ? 'primary' : 'info'" effect="plain">
              {{ row.builtIn ? "内置角色" : "自定义角色" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="菜单权限" width="120">
          <template #default="{ row }">
            {{ row.id === ADMIN_ROLE_ID ? "全部" : `${row.menuIds.length} 项` }}
          </template>
        </el-table-column>
        <el-table-column label="成员数" width="100">
          <template #default="{ row }">
            {{ accessControlStore.memberCountForRole(row.id) }}
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="100" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-switch
              :model-value="row.enabled"
              :disabled="row.id === ADMIN_ROLE_ID"
              @change="(value: boolean) => handleEnabledChange(row.id, value)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button
              link
              type="danger"
              :disabled="row.builtIn"
              @click="handleRemove(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog v-model="dialogVisible" :title="editingRole ? '编辑角色' : '新增角色'" width="520px">
      <el-form label-width="96px">
        <el-form-item label="角色名称" required>
          <el-input
            v-model="draft.name"
            :disabled="editingRole?.builtIn"
            maxlength="20"
            placeholder="请输入角色名称"
          />
        </el-form-item>
        <el-form-item label="角色描述">
          <el-input
            v-model="draft.description"
            type="textarea"
            maxlength="80"
            placeholder="说明该角色适用的人群或职责"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="draft.sort" :min="0" :max="999" :step="10" />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="draft.enabled" :disabled="editingRole?.id === ADMIN_ROLE_ID" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, RefreshLeft } from "@element-plus/icons-vue";
import { ADMIN_ROLE_ID, type RoleInput, type RoleRecord } from "@/features/access-control/types";
import { useAccessControlStore } from "@/stores/access-control";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();
const accessControlStore = useAccessControlStore();
const { tenantList, currentTenant } = storeToRefs(userStore);
const { selectedTenant, roles, recoveryNotice, leafMenuIds } = storeToRefs(accessControlStore);

const selectedTenantId = ref(currentTenant.value.id);
const dialogVisible = ref(false);
const editingRoleId = ref<string | null>(null);
const draft = reactive<RoleInput>({
  name: "",
  description: "",
  enabled: true,
  sort: 100,
  menuIds: [],
});

const editingRole = computed(() =>
  editingRoleId.value ? roles.value.find((role) => role.id === editingRoleId.value) ?? null : null,
);

watch(
  selectedTenantId,
  (tenantId) => {
    const tenant = tenantList.value.find((item) => item.id === tenantId);
    if (tenant) accessControlStore.load(tenant);
  },
  { immediate: true },
);

function resetDraft(role?: RoleRecord) {
  draft.name = role?.name ?? "";
  draft.description = role?.description ?? "";
  draft.enabled = role?.enabled ?? true;
  draft.sort = role?.sort ?? ((roles.value[roles.value.length - 1]?.sort ?? 90) + 10);
  draft.menuIds = role?.menuIds ?? [];
}

function openCreate() {
  editingRoleId.value = null;
  resetDraft();
  draft.menuIds = [...leafMenuIds.value];
  dialogVisible.value = true;
}

function openEdit(role: RoleRecord) {
  editingRoleId.value = role.id;
  resetDraft(role);
  dialogVisible.value = true;
}

function validateDraft() {
  if (!editingRole.value?.builtIn && !draft.name.trim()) return "请输入角色名称";
  return "";
}

function handleSave() {
  const error = validateDraft();
  if (error) {
    ElMessage.warning(error);
    return;
  }

  try {
    if (editingRoleId.value) {
      accessControlStore.updateRole(editingRoleId.value, draft);
    } else {
      accessControlStore.createRole(draft);
    }
    dialogVisible.value = false;
    ElMessage.success("角色已保存");
  } catch (saveError) {
    ElMessage.error(saveError instanceof Error ? saveError.message : "角色保存失败");
  }
}

function handleEnabledChange(roleId: string, enabled: boolean) {
  try {
    accessControlStore.setRoleEnabled(roleId, enabled);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "角色状态更新失败");
  }
}

async function handleRemove(role: RoleRecord) {
  if (role.builtIn) return;
  try {
    await ElMessageBox.confirm(`确认删除角色「${role.name}」？`, "删除角色", {
      type: "warning",
      confirmButtonText: "删除",
      cancelButtonText: "取消",
    });
  } catch {
    return;
  }
  try {
    accessControlStore.removeRole(role.id);
    ElMessage.success("角色已删除");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "角色删除失败");
  }
}

async function handleReset() {
  try {
    await ElMessageBox.confirm("确认恢复当前组织的默认角色？自定义角色会被清空。", "恢复默认角色", {
      type: "warning",
      confirmButtonText: "恢复",
      cancelButtonText: "取消",
    });
  } catch {
    return;
  }
  try {
    accessControlStore.resetRoles();
    ElMessage.success("默认角色已恢复");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "默认角色恢复失败");
  }
}
</script>

<style scoped>
.platform-admin-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-16);
}

.filter-card,
.table-card {
  padding: var(--spacing-16);
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.filter-card {
  display: flex;
  align-items: flex-end;
  gap: var(--spacing-16);
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-8);
  min-width: 260px;
  color: var(--color-secondary);
  font-size: var(--font-size-sm);
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--spacing-16);
}

.record-count {
  margin-left: var(--spacing-12);
  color: var(--color-secondary);
  font-size: var(--font-size-sm);
}

.primary-cell {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.primary-cell span {
  color: var(--color-secondary);
  font-size: var(--font-size-sm);
}

.page-alert {
  margin: 0;
}
</style>
