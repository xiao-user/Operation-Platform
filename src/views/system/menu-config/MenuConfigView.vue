<template>
  <div class="menu-config-page">
    <section class="filter-card">
      <div class="filter-item">
        <span>租户类型</span>
        <el-select v-model="tenantType" clearable placeholder="全部类型">
          <el-option
            v-for="option in TENANT_TYPE_OPTIONS"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </div>
      <div class="filter-item tenant-filter">
        <span>租户名称</span>
        <el-select v-model="selectedTenantId" filterable placeholder="请选择租户">
          <el-option
            v-for="tenant in filteredTenants"
            :key="tenant.id"
            :label="tenant.name"
            :value="tenant.id"
          />
        </el-select>
      </div>
      <div class="filter-item">
        <span>菜单名称</span>
        <el-input v-model="keyword" :prefix-icon="Search" clearable placeholder="请输入关键词" />
      </div>
      <div class="filter-item status-filter">
        <span>显示状态</span>
        <el-select v-model="visibleFilter" clearable placeholder="全部状态">
          <el-option label="显示" :value="true" />
          <el-option label="隐藏" :value="false" />
        </el-select>
      </div>
    </section>

    <SystemEntryConfigCard
      :workbench="shellConfig.workbench"
      :disabled="!selectedTenant"
      @update="updateWorkbench"
    />

    <section class="table-card">
      <div class="table-toolbar">
        <div>
          <strong>{{ selectedTenant?.name ?? "请选择租户" }}</strong>
          <span v-if="selectedTenant" class="record-count">共 {{ records.length }} 条业务菜单记录</span>
          <span v-if="selectedTenant" class="drag-help">
            从手柄拖动；横线表示同级插入，整行高亮表示放入模块/目录
          </span>
        </div>
        <el-button-group>
          <el-button
            type="primary"
            :icon="Plus"
            :disabled="!selectedTenant"
            @click="openCreateModule"
          >
            新增一级模块
          </el-button>
          <el-button :icon="RefreshLeft" :disabled="!selectedTenant" @click="handleReset">
            恢复默认模板
          </el-button>
        </el-button-group>
      </div>
      <el-alert
        v-if="dragDisabled"
        class="drag-alert"
        title="当前筛选条件下已暂停拖拽排序；清空菜单名称和显示状态筛选后可拖拽。"
        type="info"
        show-icon
        :closable="false"
      />

      <MenuTreeTable
        :key="selectedTenant?.id"
        :tree="filteredTree"
        :records="records"
        :tenant="selectedTenant"
        :drag-disabled="dragDisabled"
        @create-child="openCreateChild"
        @edit="openEdit"
        @delete="handleDelete"
      />
    </section>

    <MenuEditorDrawer
      v-if="selectedTenant"
      v-model="drawerVisible"
      :tenant="selectedTenant"
      :records="records"
      :editing-record="editingRecord"
      :default-parent-id="defaultParentId"
      :role-options="roleOptions"
      :visible-role-ids="drawerVisibleRoleIds"
      @save="handleSave"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, RefreshLeft, Search } from "@element-plus/icons-vue";
import { TENANT_TYPE_OPTIONS } from "@/config/tenant";
import { collectDescendantIds } from "@/features/menu-config/menu-tree";
import { MenuValidationError } from "@/features/menu-config/menu-validation";
import type {
  MenuConfigRecord,
  MenuRecordInput,
  MenuTreeNode,
} from "@/features/menu-config/types";
import { useMenuConfigStore } from "@/stores/menu-config";
import { useNavigationStore } from "@/stores/navigation";
import { useUserStore } from "@/stores/user";
import type { TenantType } from "@/types/user";
import MenuEditorDrawer from "./MenuEditorDrawer.vue";
import MenuTreeTable from "./MenuTreeTable.vue";
import SystemEntryConfigCard from "./SystemEntryConfigCard.vue";

const menuConfigStore = useMenuConfigStore();
const userStore = useUserStore();
const navigationStore = useNavigationStore();
const router = useRouter();
const { selectedTenant, records, tree, shellConfig, recoveryNotice, roleOptions } = storeToRefs(menuConfigStore);
const { tenantList, currentTenant } = storeToRefs(userStore);

const tenantType = ref<TenantType | "">("");
const selectedTenantId = ref(currentTenant.value.id);
const keyword = ref("");
const visibleFilter = ref<boolean | "">("");
const drawerVisible = ref(false);
const editingRecord = ref<MenuConfigRecord | null>(null);
const defaultParentId = ref<string | null>(null);

const filteredTenants = computed(() =>
  tenantType.value
    ? tenantList.value.filter((tenant) => tenant.type === tenantType.value)
    : tenantList.value,
);
const filteredTree = computed(() => filterTree(tree.value));
const dragDisabled = computed(() => Boolean(keyword.value.trim()) || visibleFilter.value !== "");
const drawerVisibleRoleIds = computed(() =>
  editingRecord.value
    ? menuConfigStore.roleIdsForRecord(editingRecord.value.id)
    : roleOptions.value.map((role) => role.id),
);
watch(
  selectedTenantId,
  (tenantId) => {
    const tenant = tenantList.value.find((item) => item.id === tenantId);
    if (!tenant) return;
    menuConfigStore.load(tenant);
    if (recoveryNotice.value) ElMessage.warning(recoveryNotice.value);
  },
  { immediate: true },
);

watch(tenantType, () => {
  if (!filteredTenants.value.some((tenant) => tenant.id === selectedTenantId.value)) {
    selectedTenantId.value = filteredTenants.value[0]?.id ?? "";
  }
});

function filterTree(nodes: MenuTreeNode[]): MenuTreeNode[] {
  return nodes.flatMap((node) => {
    const children = filterTree(node.children);
    const matchesName = !keyword.value || node.name.includes(keyword.value.trim());
    const matchesVisible = visibleFilter.value === "" || node.visible === visibleFilter.value;
    return matchesName && matchesVisible || children.length
      ? [{ ...node, children }]
      : [];
  });
}

function openCreateModule() {
  editingRecord.value = null;
  defaultParentId.value = null;
  drawerVisible.value = true;
}

function openCreateChild(parent: MenuConfigRecord) {
  editingRecord.value = null;
  defaultParentId.value = parent.id;
  drawerVisible.value = true;
}

function openEdit(row: MenuConfigRecord) {
  editingRecord.value = { ...row };
  defaultParentId.value = row.parentId;
  drawerVisible.value = true;
}

function handleSave(input: MenuRecordInput, visibleRoleIds: string[] = []) {
  try {
    if (editingRecord.value) {
      menuConfigStore.update(editingRecord.value.id, input, visibleRoleIds);
    } else {
      menuConfigStore.create(input, visibleRoleIds);
    }
    void navigationStore.ensureValidCurrentRoute(router);
    drawerVisible.value = false;
    ElMessage.success(editingRecord.value ? "菜单已更新" : "菜单已新增");
  } catch (error) {
    if (error instanceof MenuValidationError) {
      ElMessage.warning("菜单配置不符合规则，请检查后重试");
    } else {
      ElMessage.error(error instanceof Error ? error.message : "菜单保存失败");
    }
  }
}

function updateWorkbench(input: Parameters<typeof menuConfigStore.updateWorkbench>[0]) {
  try {
    menuConfigStore.updateWorkbench(input);
    void navigationStore.ensureValidCurrentRoute(router);
    ElMessage.success("工作台配置已更新");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "工作台配置更新失败");
  }
}

async function handleDelete(row: MenuConfigRecord) {
  const childCount = collectDescendantIds(records.value, row.id).size;
  const description = childCount
    ? `将同时删除 ${childCount} 个子菜单，删除后无法恢复。`
    : "删除后无法恢复。";
  try {
    await ElMessageBox.confirm(description, `删除“${row.name}”`, {
      type: "warning",
      confirmButtonText: "确认删除",
      cancelButtonText: "取消",
    });
  } catch {
    return;
  }

  try {
    menuConfigStore.removeCascade(row.id);
    await navigationStore.ensureValidCurrentRoute(router);
    ElMessage.success("菜单已删除");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "菜单删除失败");
  }
}

async function handleReset() {
  if (!selectedTenant.value) return;
  try {
    await ElMessageBox.confirm(
      `将覆盖“${selectedTenant.value.name}”的全部自定义菜单和系统入口配置。`,
      "恢复默认模板",
      {
        type: "warning",
        confirmButtonText: "确认恢复",
        cancelButtonText: "取消",
      },
    );
  } catch {
    return;
  }

  try {
    menuConfigStore.reset();
    await navigationStore.ensureValidCurrentRoute(router);
    ElMessage.success("已恢复默认菜单");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "默认模板恢复失败");
  }
}
</script>

<style scoped>
.menu-config-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-16);
  min-height: 100%;
}

.filter-card,
.table-card {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.filter-card {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: var(--spacing-16);
  padding: var(--spacing-16) var(--spacing-24);
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-8);
  width: 180px;
  color: var(--color-body);
  font-size: var(--font-size-sm);
}

.tenant-filter {
  width: 280px;
}

.status-filter {
  width: 140px;
}

.table-card {
  min-height: 480px;
  overflow: hidden;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-16) var(--spacing-24);
  border-bottom: 1px solid var(--color-border);
}

.table-toolbar strong {
  color: var(--color-title);
  font-weight: var(--font-weight-semibold);
}

.record-count {
  margin-left: var(--spacing-12);
  color: var(--color-secondary);
  font-size: var(--font-size-sm);
}

.drag-help {
  margin-left: var(--spacing-12);
  color: var(--color-secondary);
  font-size: var(--font-size-sm);
}

.drag-alert {
  margin: var(--spacing-12) var(--spacing-24) 0;
}

</style>
