<template>
  <el-dialog
    v-model="visible"
    title="编辑设置"
    width="700"
    align-center
    :close-on-click-modal="false"
    class="edit-settings-dialog"
    @close="handleClose"
  >
    <!-- 提示条 -->
    <!-- 编辑有效期 -->
    <div class="date-row">
      <span class="date-label">
        编辑有效期：
        <el-tooltip
          content="审核不通过状态的机构不受该设置影响，一直拥有编辑权限。"
          placement="top"
        >
          <el-icon class="date-info-icon"><InfoFilled /></el-icon>
        </el-tooltip>
      </span>
      <el-date-picker
        v-model="form.dateRange"
        type="daterange"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        range-separator="至"
        style="flex: 1"
      />
    </div>

    <!-- 穿梭框式机构选择 -->
    <div class="transfer-box">
      <!-- 左侧：可选列表 -->
      <div class="transfer-left">
        <div class="transfer-left-header">
          <el-input v-model="searchText" placeholder="请输入" clearable size="small">
            <template #append>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-checkbox
            v-model="isAllSelected"
            :indeterminate="isIndeterminate"
            class="select-all-btn"
            @change="handleSelectAll"
          >
            全选
          </el-checkbox>
        </div>
        <div class="transfer-left-body">
          <div
            v-for="org in filteredOrgList"
            :key="org.id"
            class="transfer-item"
            :class="{ 'is-selected': selectedIds.has(org.id) }"
          >
            <el-checkbox
              :model-value="selectedIds.has(org.id)"
              @change="(val: boolean) => toggleSelect(org, val)"
            >
              {{ org.name }}
            </el-checkbox>
          </div>
          <div v-if="filteredOrgList.length === 0" class="transfer-empty">暂无数据</div>
        </div>
      </div>

      <!-- 右侧：已选列表 -->
      <div class="transfer-right">
        <div class="transfer-right-header">
          <span>已选机构：{{ selectedList.length }}</span>
          <span class="clear-btn" @click="handleClearAll">清空</span>
        </div>
        <div class="transfer-right-body">
          <div v-for="org in selectedList" :key="org.id" class="transfer-item-right">
            <span class="item-name">{{ org.name }}</span>
            <el-icon class="item-remove" @click="removeSelected(org.id)"><Close /></el-icon>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleConfirm">确定 ({{ selectedList.length }})</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from "vue";
import { InfoFilled, Search, Close } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";

const visible = defineModel<boolean>("visible", { required: true });

const emit = defineEmits<{
  confirm: [payload: { dateRange: [Date, Date] | null; orgIds: string[] }];
}>();

// 虚拟机构数据
interface OrgItem {
  id: string;
  name: string;
}

const MOCK_ORG_LIST: OrgItem[] = [
  { id: "1", name: "机构名称1" },
  { id: "2", name: "机构名称2" },
  { id: "3", name: "机构名称3" },
  { id: "4", name: "机构名称4" },
  { id: "5", name: "机构名称5" },
  { id: "6", name: "机构名称6" },
  { id: "7", name: "机构名称7" },
];

const form = reactive<{ dateRange: [Date, Date] | null }>({
  dateRange: null,
});

const searchText = ref("");
const selectedIds = ref<Set<string>>(new Set(["1", "2", "3"]));

const filteredOrgList = computed(() => {
  if (!searchText.value) return MOCK_ORG_LIST;
  return MOCK_ORG_LIST.filter((o) => o.name.includes(searchText.value));
});

const selectedList = computed(() => MOCK_ORG_LIST.filter((o) => selectedIds.value.has(o.id)));

const isAllSelected = computed(
  () =>
    filteredOrgList.value.length > 0 &&
    filteredOrgList.value.every((o) => selectedIds.value.has(o.id)),
);

const isIndeterminate = computed(
  () => !isAllSelected.value && filteredOrgList.value.some((o) => selectedIds.value.has(o.id)),
);

function toggleSelect(org: OrgItem, val: boolean) {
  const newSet = new Set(selectedIds.value);
  if (val) {
    newSet.add(org.id);
  } else {
    newSet.delete(org.id);
  }
  selectedIds.value = newSet;
}

function handleSelectAll(val: boolean | string | number) {
  const newSet = new Set(selectedIds.value);
  for (const org of filteredOrgList.value) {
    if (val) {
      newSet.add(org.id);
    } else {
      newSet.delete(org.id);
    }
  }
  selectedIds.value = newSet;
}

function removeSelected(id: string) {
  const newSet = new Set(selectedIds.value);
  newSet.delete(id);
  selectedIds.value = newSet;
}

function handleClearAll() {
  selectedIds.value = new Set();
}

function handleClose() {
  visible.value = false;
}

function handleConfirm() {
  if (selectedList.value.length === 0) {
    ElMessage.warning("请至少选择一个机构");
    return;
  }
  emit("confirm", {
    dateRange: form.dateRange,
    orgIds: [...selectedIds.value],
  });
  ElMessage.success("设置已保存");
  visible.value = false;
}
</script>

<style scoped>
/* 日期行 */
.date-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.date-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: var(--color-title);
  white-space: nowrap;
  flex-shrink: 0;
}

.date-info-icon {
  color: var(--color-secondary);
  cursor: pointer;
}

/* 穿梭框 */
.transfer-box {
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  height: 400px;
  overflow: hidden;
}

.transfer-left,
.transfer-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.transfer-left {
  border-right: 1px solid var(--color-border);
}

.transfer-left-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 16px 8px;
  flex-shrink: 0;
}

.select-all-btn {
  flex-shrink: 0;
}

.transfer-left-body,
.transfer-right-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 8px;
}

.transfer-item {
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
}

.transfer-item:hover,
.transfer-item.is-selected {
  background: var(--color-bg-subtle);
}

.transfer-right-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 8px;
  font-size: 14px;
  color: var(--color-title);
  flex-shrink: 0;
}

.clear-btn {
  color: var(--color-primary);
  cursor: pointer;
  font-size: 14px;
}

.clear-btn:hover {
  color: var(--color-primary-hover);
}

.transfer-item-right {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  color: var(--color-title);
}

.transfer-item-right:nth-child(odd) {
  background: var(--color-bg-subtle);
}

.item-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-remove {
  color: var(--color-secondary);
  cursor: pointer;
  flex-shrink: 0;
}

.item-remove:hover {
  color: var(--color-error);
}

.transfer-empty {
  padding: 24px;
  text-align: center;
  color: var(--color-placeholder);
  font-size: 14px;
}
</style>

<style>
.edit-settings-dialog.el-dialog {
  border-radius: 8px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

.edit-settings-dialog .el-dialog__header {
  padding: 16px 24px;
  margin-right: 0;
  flex-shrink: 0;
}

.edit-settings-dialog .el-dialog__header .el-dialog__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-title);
  line-height: 24px;
}

.edit-settings-dialog .el-dialog__body {
  padding: 16px 24px;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.edit-settings-dialog .el-dialog__footer {
  padding: 10px 24px 24px;
  flex-shrink: 0;
}
</style>
