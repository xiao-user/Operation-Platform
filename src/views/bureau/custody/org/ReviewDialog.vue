<template>
  <el-dialog
    v-model="visible"
    title="审核"
    width="500"
    align-center
    :close-on-click-modal="false"
    class="review-dialog"
    @close="handleClose"
  >
    <!-- 审核意见 -->
    <div class="form-group">
      <div class="form-label">审核意见</div>
      <el-input
        v-model="remark"
        type="textarea"
        :rows="4"
        placeholder="请输入审核意见"
        maxlength="200"
        show-word-limit
      />
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="danger" @click="handleReject">审核不通过</el-button>
      <el-button type="primary" @click="handleApprove">审核通过</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { ElMessage } from "element-plus";

const visible = defineModel<boolean>("visible", { required: true });

const emit = defineEmits<{
  approve: [remark: string];
  reject: [remark: string];
}>();

const remark = ref("");

function handleClose() {
  remark.value = "";
  visible.value = false;
}

function handleApprove() {
  emit("approve", remark.value);
  ElMessage.success("审核通过");
  remark.value = "";
  visible.value = false;
}

function handleReject() {
  if (!remark.value.trim()) {
    ElMessage.warning("审核不通过时请填写审核意见");
    return;
  }
  emit("reject", remark.value);
  ElMessage.info("审核不通过");
  remark.value = "";
  visible.value = false;
}
</script>

<style scoped>
.form-group {
  margin-bottom: 0;
}

.form-label {
  font-size: 14px;
  color: var(--color-title);
  line-height: 22px;
  margin-bottom: 8px;
}
</style>

<style>
.review-dialog.el-dialog {
  border-radius: 8px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

.review-dialog .el-dialog__header {
  padding: 16px 24px;
  margin-right: 0;
  flex-shrink: 0;
}

.review-dialog .el-dialog__header .el-dialog__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-title);
  line-height: 24px;
}

.review-dialog .el-dialog__body {
  padding: 16px 24px;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.review-dialog .el-dialog__footer {
  padding: 10px 24px 24px;
  flex-shrink: 0;
}
</style>
