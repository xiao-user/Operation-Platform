<template>
  <div class="menu-config-page">
    <section class="page-heading">
      <div>
        <h1>菜单配置</h1>
        <p>按租户维护顶部模块和侧边菜单，保存后当前租户导航立即生效。</p>
      </div>
      <el-button type="primary" :icon="Plus" :disabled="!selectedTenant" @click="openCreateModule">
        新增顶部模块
      </el-button>
    </section>

    <section class="filter-card">
      <div class="filter-item">
        <span>租户类型</span>
        <el-select v-model="tenantType" clearable placeholder="全部类型">
          <el-option label="学校" value="school" />
          <el-option label="教育局" value="bureau" />
          <el-option label="机构" value="org" />
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

    <section class="table-card">
      <div class="table-toolbar">
        <div>
          <strong>{{ selectedTenant?.name ?? "请选择租户" }}</strong>
          <span v-if="selectedTenant" class="record-count">共 {{ records.length }} 条菜单记录</span>
        </div>
        <el-button :icon="RefreshLeft" :disabled="!selectedTenant" @click="handleReset">
          恢复默认模板
        </el-button>
      </div>

      <el-table
        :data="filteredTree"
        row-key="id"
        default-expand-all
        :tree-props="{ children: 'children' }"
        class="menu-table"
      >
        <el-table-column prop="name" label="菜单名称" min-width="240" />
        <el-table-column label="类型" width="110">
          <template #default="{ row }">
            <MenuTypeTag :type="row.type" />
          </template>
        </el-table-column>
        <el-table-column label="关联目标" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">{{ targetLabel(row) }}</template>
        </el-table-column>
        <el-table-column label="图标" width="110">
          <template #default="{ row }">{{ row.icon ?? "—" }}</template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="80" align="center" />
        <el-table-column label="显示" width="90" align="center">
          <template #default="{ row }">
            <el-switch :model-value="row.visible" @change="handleVisibleChange(row, $event)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="210" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.type === 'module' || row.type === 'directory'"
              link
              type="primary"
              @click="openCreateChild(row)"
            >
              新增子菜单
            </el-button>
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="selectedTenant ? '暂无匹配菜单' : '请先选择租户'" />
        </template>
      </el-table>
    </section>

    <MenuEditorDrawer
      v-if="selectedTenant"
      v-model="drawerVisible"
      :tenant="selectedTenant"
      :records="records"
      :editing-record="editingRecord"
      :default-parent-id="defaultParentId"
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
import { pageRegistryByKey } from "@/config/page-registry";
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
import MenuTypeTag from "./MenuTypeTag.vue";

const menuConfigStore = useMenuConfigStore();
const userStore = useUserStore();
const navigationStore = useNavigationStore();
const router = useRouter();
const { selectedTenant, records, tree, recoveryNotice } = storeToRefs(menuConfigStore);
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

function targetLabel(row: MenuConfigRecord) {
  if (row.type === "module") return "进入首个可用子菜单";
  if (row.type === "directory") return "目录";
  if (row.type === "external") return row.externalUrl ?? "未配置";
  const page = row.pageKey ? pageRegistryByKey.get(row.pageKey) : null;
  return page ? `${page.title} · ${page.path}` : "页面不可用";
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

function handleSave(input: MenuRecordInput) {
  try {
    if (editingRecord.value) menuConfigStore.update(editingRecord.value.id, input);
    else menuConfigStore.create(input);
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

function handleVisibleChange(row: MenuConfigRecord, value: boolean | string | number) {
  try {
    menuConfigStore.setVisible(row.id, Boolean(value));
    void navigationStore.ensureValidCurrentRoute(router);
    ElMessage.success(Boolean(value) ? "菜单已显示" : "菜单已隐藏");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "状态更新失败");
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
    menuConfigStore.removeCascade(row.id);
    await navigationStore.ensureValidCurrentRoute(router);
    ElMessage.success("菜单已删除");
  } catch {
    // 用户取消时保持原数据。
  }
}

async function handleReset() {
  if (!selectedTenant.value) return;
  try {
    await ElMessageBox.confirm(
      `将覆盖“${selectedTenant.value.name}”的全部自定义菜单。`,
      "恢复默认模板",
      {
        type: "warning",
        confirmButtonText: "确认恢复",
        cancelButtonText: "取消",
      },
    );
    menuConfigStore.reset();
    await navigationStore.ensureValidCurrentRoute(router);
    ElMessage.success("已恢复默认菜单");
  } catch {
    // 用户取消时保持原数据。
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

.page-heading,
.filter-card,
.table-card {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-20) var(--spacing-24);
}

.page-heading h1 {
  margin: 0;
  color: var(--color-title);
  font-size: 20px;
  line-height: 28px;
  font-weight: var(--font-weight-semibold);
}

.page-heading p {
  margin: var(--spacing-4) 0 0;
  color: var(--color-secondary);
  font-size: var(--font-size-sm);
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

.menu-table {
  width: 100%;
}
</style>
