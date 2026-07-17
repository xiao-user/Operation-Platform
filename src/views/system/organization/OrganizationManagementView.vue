<template>
  <div class="platform-admin-page">
    <section class="filter-card">
      <div class="filter-item">
        <span>组织类型</span>
        <el-select v-model="typeFilter" clearable placeholder="全部类型">
          <el-option
            v-for="option in TENANT_TYPE_OPTIONS"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </div>
      <div class="filter-item">
        <span>组织名称</span>
        <el-input v-model="keyword" clearable placeholder="搜索组织名称" />
      </div>
      <div class="filter-actions">
        <el-button
          v-if="operationPlatformPersistenceCapabilities.localDataExport"
          :icon="Download"
          @click="handleExportLocalData"
        >
          导出本地数据
        </el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate">新增组织</el-button>
      </div>
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
          <strong>组织管理</strong>
          <span class="record-count">共 {{ filteredTenants.length }} 个组织</span>
        </div>
      </div>

      <el-table :data="filteredTenants" row-key="id">
        <el-table-column label="组织名称" min-width="220">
          <template #default="{ row }">
            <div class="primary-cell">
              <strong>{{ row.name }}</strong>
              <span>{{ row.shortName }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="tenantTagType(row.type)" effect="plain">
              {{ tenantTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="id" label="组织 ID" min-width="220" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-switch
              :model-value="row.enabled !== false"
              :disabled="row.type === 'platform'"
              @change="(value: boolean) => handleEnabledChange(row.id, value)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="210" align="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openMembers(row)">成员</el-button>
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button
              link
              type="danger"
              :disabled="row.type === 'platform'"
              @click="handleRemove(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑组织' : '新增组织'" width="520px">
      <el-form label-width="96px">
        <el-form-item label="组织类型" required>
          <el-select v-model="draft.type" :disabled="Boolean(editingId)">
            <el-option
              v-for="option in TENANT_TYPE_OPTIONS.filter((option) => option.value !== 'platform')"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="组织名称" required>
          <el-input v-model="draft.name" maxlength="30" placeholder="请输入组织名称" />
        </el-form-item>
        <el-form-item label="简称" required>
          <el-input v-model="draft.shortName" maxlength="16" placeholder="用于窄空间展示" />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="draft.enabled" :disabled="editingTenant?.type === 'platform'" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <TenantMemberDrawer v-model="memberDrawerVisible" :tenant="memberTenant" />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { storeToRefs } from "pinia";
import { ElMessage, ElMessageBox } from "element-plus";
import { Download, Plus } from "@element-plus/icons-vue";
import { TENANT_TAG_TYPE, TENANT_TYPE_LABEL, TENANT_TYPE_OPTIONS } from "@/config/tenant";
import {
  createLocalStorageExportSnapshot,
  downloadLocalStorageExportSnapshot,
} from "@/features/data-migration/local-storage-export";
import { useTenantAdminStore, type TenantDraft } from "@/stores/tenant-admin";
import TenantMemberDrawer from "@/views/system/organization/TenantMemberDrawer.vue";
import type { TenantInfo, TenantType } from "@/types/user";
import { operationPlatformPersistenceCapabilities } from "@/features/persistence/runtime-operation-platform-persistence";

const tenantAdminStore = useTenantAdminStore();
const { tenants, recoveryNotice } = storeToRefs(tenantAdminStore);

const keyword = ref("");
const typeFilter = ref<TenantType | "">("");
const dialogVisible = ref(false);
const editingId = ref<string | null>(null);
const memberDrawerVisible = ref(false);
const memberTenant = ref<TenantInfo | null>(null);
const draft = reactive<TenantDraft>({
  name: "",
  shortName: "",
  type: "school",
  enabled: true,
});

const editingTenant = computed(() =>
  editingId.value ? tenants.value.find((tenant) => tenant.id === editingId.value) ?? null : null,
);

const filteredTenants = computed(() =>
  tenants.value.filter((tenant) => {
    const matchesType = typeFilter.value ? tenant.type === typeFilter.value : true;
    const matchesKeyword = keyword.value
      ? tenant.name.includes(keyword.value) || tenant.shortName.includes(keyword.value)
      : true;
    return matchesType && matchesKeyword;
  }),
);

function assignDraft(tenant?: TenantInfo) {
  draft.name = tenant?.name ?? "";
  draft.shortName = tenant?.shortName ?? "";
  draft.type = tenant?.type === "platform" ? "platform" : tenant?.type ?? "school";
  draft.enabled = tenant?.enabled !== false;
}

function openCreate() {
  editingId.value = null;
  assignDraft();
  dialogVisible.value = true;
}

function openEdit(tenant: TenantInfo) {
  editingId.value = tenant.id;
  assignDraft(tenant);
  dialogVisible.value = true;
}

function openMembers(tenant: TenantInfo) {
  memberTenant.value = { ...tenant };
  memberDrawerVisible.value = true;
}

function validateDraft() {
  if (!draft.name.trim()) return "请输入组织名称";
  if (!draft.shortName.trim()) return "请输入组织简称";
  return "";
}

function tenantTagType(type: TenantType) {
  return TENANT_TAG_TYPE[type];
}

function tenantTypeLabel(type: TenantType) {
  return TENANT_TYPE_LABEL[type];
}

async function handleSave() {
  const error = validateDraft();
  if (error) {
    ElMessage.warning(error);
    return;
  }

  try {
    if (editingId.value) {
      await tenantAdminStore.update(editingId.value, draft);
    } else {
      await tenantAdminStore.create(draft);
    }
    dialogVisible.value = false;
    ElMessage.success("组织已保存");
  } catch (saveError) {
    ElMessage.error(saveError instanceof Error ? saveError.message : "组织保存失败");
  }
}

function handleExportLocalData() {
  const snapshot = createLocalStorageExportSnapshot(window.localStorage);
  downloadLocalStorageExportSnapshot(snapshot);
  ElMessage.success(`已导出 ${Object.keys(snapshot.entries).length} 项本地数据`);
}

async function handleEnabledChange(tenantId: string, enabled: boolean) {
  try {
    await tenantAdminStore.setEnabled(tenantId, enabled);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "组织状态更新失败");
  }
}

async function handleRemove(tenant: TenantInfo) {
  if (tenant.type === "platform") return;
  try {
    await ElMessageBox.confirm(`确认删除「${tenant.name}」？删除后该组织及其配置将被删除。`, "删除组织", {
      type: "warning",
      confirmButtonText: "删除",
      cancelButtonText: "取消",
    });
  } catch {
    return;
  }
  try {
    await tenantAdminStore.remove(tenant.id);
    ElMessage.success("组织已删除");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "组织删除失败");
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
  min-width: 180px;
  color: var(--color-secondary);
  font-size: var(--font-size-sm);
}

.filter-actions {
  display: flex;
  gap: var(--spacing-8);
  margin-left: auto;
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
