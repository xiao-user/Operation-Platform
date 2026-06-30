<template>
  <div class="page-wrapper">
    <!-- 筛选栏 -->
    <PageFilterBar @search="handleSearch">
      <div class="form-item">
        <span class="form-label">审核状态：</span>
        <el-select v-model="filterForm.reviewStatus" placeholder="请选择" clearable>
          <el-option label="全部" value="" />
          <el-option label="待审核" value="pending" />
          <el-option label="审核通过" value="approved" />
          <el-option label="审核不通过" value="rejected" />
        </el-select>
      </div>
      <div class="form-item">
        <span class="form-label">机构名称：</span>
        <el-input
          v-model="filterForm.orgName"
          placeholder="请输入机构名称"
          :prefix-icon="Search"
          clearable
        />
      </div>
      <div class="form-item">
        <span class="form-label">学期：</span>
        <el-select v-model="filterForm.semester" placeholder="请选择" clearable>
          <el-option
            v-for="s in SEMESTER_OPTIONS"
            :key="s.value"
            :label="s.label"
            :value="s.value"
          />
        </el-select>
      </div>
      <div class="form-item">
        <span class="form-label">在库状态：</span>
        <el-select v-model="filterForm.inLibrary" placeholder="请选择" clearable>
          <el-option label="全部" value="" />
          <el-option label="已在库" value="in" />
          <el-option label="未入库" value="out" />
        </el-select>
      </div>
    </PageFilterBar>

    <!-- 主体区 -->
    <div class="page-body">
      <!-- 工具栏 -->
      <div class="toolbar">
        <span class="toolbar-title">审核列表</span>
        <div class="toolbar-right">
          <el-button @click="handleBatchRemind">批量提醒设置</el-button>
          <el-button @click="handleDownloadAbnormal">下载异常机构信息</el-button>
          <el-button type="primary" :icon="Edit" @click="handleEditSettings">编辑设置</el-button>
        </div>
      </div>

      <!-- 表格 -->
      <div class="table-wrapper">
        <el-table v-loading="loading" :data="tableData" stripe border height="100%">
          <el-table-column label="序号" width="60" align="center">
            <template #default="{ $index }">
              {{
                String((pagination.currentPage - 1) * pagination.pageSize + $index + 1).padStart(
                  2,
                  "0",
                )
              }}
            </template>
          </el-table-column>
          <el-table-column prop="orgNo" label="机构编号" width="160" show-overflow-tooltip />
          <el-table-column prop="orgName" label="机构名称" min-width="200" show-overflow-tooltip />
          <el-table-column label="审核状态" width="130">
            <template #default="{ row }">
              <span class="status-dot-item">
                <span
                  class="status-dot"
                  :style="{
                    background: REVIEW_STATUS_MAP[row.reviewStatus as ReviewStatus]?.color,
                  }"
                />
                {{ REVIEW_STATUS_MAP[row.reviewStatus as ReviewStatus]?.label }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
          <el-table-column label="在库状态" width="110" align="center">
            <template #default="{ row }">
              <StatusTag :color="row.inLibrary === 'in' ? 'green' : 'blue'">
                {{ row.inLibrary === "in" ? "已在库" : "未入库" }}
              </StatusTag>
            </template>
          </el-table-column>
          <el-table-column prop="contact" label="联系人" width="90" show-overflow-tooltip />
          <el-table-column prop="phone" label="手机号码" width="140" show-overflow-tooltip />
          <el-table-column prop="address" label="机构地址" min-width="180" show-overflow-tooltip />
          <el-table-column label="操作" fixed="right" min-width="160">
            <template #default="{ row }">
              <span class="action-link" @click="handleViewDetail(row)">查看详情</span>
              <span
                v-if="row.reviewStatus === 'pending'"
                class="action-link action-approve"
                @click="openReviewDialog(row)"
                >审核</span
              >
              <span
                v-if="row.reviewStatus === 'rejected'"
                class="action-link"
                @click="openReviewDialog(row)"
                >重新审核</span
              >
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页 -->
      <div class="pagination-bar">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 批量提醒弹窗 -->
    <BatchRemindDialog
      v-model:visible="batchRemindVisible"
      @send="handleBatchRemindSend"
      @open-settings="handleOpenSettings"
    />

    <!-- 下载异常机构信息弹窗 -->
    <DownloadAbnormalDialog v-model:visible="downloadAbnormalVisible" />

    <!-- 编辑设置弹窗 -->
    <EditSettingsDialog v-model:visible="editSettingsVisible" />

    <!-- 审核弹窗 -->
    <ReviewDialog
      v-model:visible="reviewDialogVisible"
      @approve="handleReviewApprove"
      @reject="handleReviewReject"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { Search, Edit } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import PageFilterBar from "@/components/PageFilterBar.vue";
import StatusTag from "@/components/StatusTag.vue";
import BatchRemindDialog from "./BatchRemindDialog.vue";
import ReviewDialog from "./ReviewDialog.vue";
import DownloadAbnormalDialog from "./DownloadAbnormalDialog.vue";
import EditSettingsDialog from "./EditSettingsDialog.vue";
import {
  fetchOrgReviewList,
  updateOrgReviewStatus,
  SEMESTER_OPTIONS,
  REVIEW_STATUS_MAP,
  type OrgReviewRow,
  type OrgReviewFilter,
  type ReviewStatus,
} from "@/mock/bureau/custody/orgReview";

// ==========================================
// 状态
// ==========================================
const router = useRouter();
const loading = ref(false);
const tableData = ref<OrgReviewRow[]>([]);

const filterForm = reactive<OrgReviewFilter>({
  reviewStatus: "",
  orgName: "",
  semester: "2025-2026-1",
  inLibrary: "",
});

const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0,
});

// 批量提醒弹窗可见状态
const batchRemindVisible = ref(false);

// 审核弹窗
const reviewDialogVisible = ref(false);
const currentReviewRow = ref<OrgReviewRow | null>(null);

// 下载异常机构信息弹窗
const downloadAbnormalVisible = ref(false);

// 编辑设置弹窗
const editSettingsVisible = ref(false);

// ==========================================
// 数据加载
// ==========================================
async function loadData() {
  loading.value = true;
  try {
    const { list, total } = await fetchOrgReviewList(
      { ...filterForm },
      pagination.currentPage,
      pagination.pageSize,
    );
    tableData.value = list;
    pagination.total = total;
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);

// 筛选条件变化时自动重新查询
watch(
  () => ({ ...filterForm }),
  () => {
    pagination.currentPage = 1;
    loadData();
  },
);

// ==========================================
// 事件处理
// ==========================================
function handleSearch() {
  pagination.currentPage = 1;
  loadData();
}

function handleSizeChange(size: number) {
  pagination.pageSize = size;
  pagination.currentPage = 1;
  loadData();
}

function handlePageChange(page: number) {
  pagination.currentPage = page;
  loadData();
}

function handleBatchRemind() {
  batchRemindVisible.value = true;
}

function handleBatchRemindSend(payload: { expireRange: string }) {
  ElMessage.success("批量提醒已发送，筛选条件：" + payload.expireRange);
}

function handleOpenSettings() {
  editSettingsVisible.value = true;
}

function handleDownloadAbnormal() {
  downloadAbnormalVisible.value = true;
}

function handleEditSettings() {
  editSettingsVisible.value = true;
}

function handleViewDetail(row: OrgReviewRow) {
  router.push("/bureau/custody/org/review/" + row.id);
}

function openReviewDialog(row: OrgReviewRow) {
  currentReviewRow.value = row;
  reviewDialogVisible.value = true;
}

async function handleReviewApprove(remark: string) {
  if (currentReviewRow.value) {
    await updateOrgReviewStatus(currentReviewRow.value.id, "approved", remark || undefined);
    await loadData();
  }
  currentReviewRow.value = null;
}

async function handleReviewReject(remark: string) {
  if (currentReviewRow.value) {
    await updateOrgReviewStatus(currentReviewRow.value.id, "rejected", remark);
    await loadData();
  }
  currentReviewRow.value = null;
}
</script>

<style scoped>
.page-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg);
}

.page-body {
  flex: 1;
  overflow: hidden;
  padding: var(--spacing-24);
  background: var(--color-white);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-16);
}

/* 筛选栏 form-item：固定宽度 280px，flex-wrap 自动换行 */
.form-item {
  display: flex;
  align-items: center;
  height: 32px;
  width: 280px;
  flex-shrink: 0;
}

.form-label {
  font-size: var(--font-size-md);
  color: var(--color-title);
  line-height: var(--line-height-md);
  white-space: nowrap;
  flex-shrink: 0;
}

.form-item :deep(.el-select),
.form-item :deep(.el-input) {
  flex: 1;
  min-width: 0;
  --el-input-height: 32px;
}

/* 工具栏 */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.toolbar-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-title);
  line-height: 24px;
}

.toolbar-right {
  display: flex;
  align-items: center;
}

/* 表格 */
.table-wrapper {
  flex: 1;
  overflow: hidden;
}

/* 单元格内容 */
.status-dot-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-8);
  white-space: nowrap;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* 操作列 */
.action-link {
  font-size: var(--font-size-md);
  color: var(--color-primary);
  cursor: pointer;
  white-space: nowrap;
}

.action-link + .action-link {
  margin-left: var(--spacing-12);
}

.action-link:hover {
  color: var(--color-primary-hover);
}
.action-approve {
  color: var(--color-success);
}
.action-approve:hover {
  color: var(--color-success-dark-text);
}

/* 分页 */
.pagination-bar {
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}
</style>
