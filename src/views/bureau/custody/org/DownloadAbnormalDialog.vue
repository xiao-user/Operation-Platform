<template>
  <el-dialog
    v-model="visible"
    title="下载异常机构信息"
    width="500"
    align-center
    :close-on-click-modal="false"
    class="download-abnormal-dialog"
    @close="handleClose"
  >
    <div class="section-title">下载数据类型</div>

    <!-- 办学许可证/社会团体证到期时间 -->
    <div class="form-group">
      <div class="form-label">
        <span class="required">*</span>
        办学许可证/社会团体证到期时间
      </div>
      <el-radio-group v-model="form.licenseExpire">
        <el-radio-button v-for="option in EXPIRE_OPTIONS" :key="option.value" :value="option.value">
          {{ option.label }}
        </el-radio-button>
      </el-radio-group>
    </div>

    <!-- 营业执照到期时间 -->
    <div class="form-group">
      <div class="form-label">
        <span class="required">*</span>
        营业执照到期时间
      </div>
      <el-radio-group v-model="form.businessExpire">
        <el-radio-button v-for="option in EXPIRE_OPTIONS" :key="option.value" :value="option.value">
          {{ option.label }}
        </el-radio-button>
      </el-radio-group>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleDownload">下载</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive } from "vue";
import { ElMessage } from "element-plus";

const visible = defineModel<boolean>("visible", { required: true });

type ExpireRange = "expired" | "1m" | "3m" | "6m";

const EXPIRE_OPTIONS: { label: string; value: ExpireRange }[] = [
  { label: "已过期", value: "expired" },
  { label: "一个月后", value: "1m" },
  { label: "三个月后", value: "3m" },
  { label: "六个月后", value: "6m" },
];

const form = reactive({
  licenseExpire: "expired" as ExpireRange,
  businessExpire: "expired" as ExpireRange,
});

function handleClose() {
  visible.value = false;
}

function handleDownload() {
  ElMessage.success(
    "开始下载，筛选条件：办学许可证-" + form.licenseExpire + "，营业执照-" + form.businessExpire,
  );
  visible.value = false;
}
</script>

<style scoped>
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-title);
  line-height: 22px;
  margin-bottom: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: var(--color-title);
  line-height: 22px;
  margin-bottom: 8px;
}

.required {
  color: var(--color-error);
}
</style>

<style>
.download-abnormal-dialog.el-dialog {
  border-radius: 8px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

.download-abnormal-dialog .el-dialog__header {
  padding: 16px 24px;
  margin-right: 0;
  flex-shrink: 0;
}

.download-abnormal-dialog .el-dialog__header .el-dialog__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-title);
  line-height: 24px;
}

.download-abnormal-dialog .el-dialog__body {
  padding: 16px 24px;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.download-abnormal-dialog .el-dialog__footer {
  padding: 10px 24px 24px;
  flex-shrink: 0;
}
</style>
