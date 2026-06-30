<template>
  <el-dialog
    v-model="visible"
    title="批量提醒"
    width="500"
    align-center
    :close-on-click-modal="false"
    class="batch-remind-dialog"
    @close="handleClose"
  >
    <!-- 蓝色提示条 -->
    <div class="info-banner">
      <el-icon class="info-icon"><InfoFilled /></el-icon>
      <div class="info-text">
        系统将按以下设置进行筛选，并将文案推送至机构公众号。<br />
        注：仅筛选审核通过并已在库的机构。
      </div>
    </div>

    <!-- 系统注册信息过期时间选择 -->
    <div class="form-group">
      <div class="form-label">
        <span class="required">*</span>
        系统注册信息过期时间选择
      </div>
      <el-radio-group v-model="form.expireRange">
        <el-radio-button v-for="option in EXPIRE_OPTIONS" :key="option.value" :value="option.value">
          {{ option.label }}
        </el-radio-button>
      </el-radio-group>
    </div>

    <!-- 推送文案预览 -->
    <div class="form-group">
      <div class="form-label">推送文案预览</div>
      <div class="preview-box">
        <span>系统注册信息</span>
        <span class="highlight-tag">{{ currentExpireLabel }}</span>
        <span>过期，请及时登录系统更新。</span>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSend">发送</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive } from "vue";
import { InfoFilled } from "@element-plus/icons-vue";
import { ElMessageBox } from "element-plus";

const visible = defineModel<boolean>("visible", { required: true });

const emit = defineEmits<{
  send: [payload: { expireRange: ExpireRange }];
  openSettings: [];
}>();

type ExpireRange = "expired" | "1m" | "3m" | "6m";

const EXPIRE_OPTIONS: { label: string; value: ExpireRange }[] = [
  { label: "已过期", value: "expired" },
  { label: "一个月后", value: "1m" },
  { label: "三个月后", value: "3m" },
  { label: "六个月后", value: "6m" },
];

const form = reactive({
  expireRange: "expired" as ExpireRange,
});

const EXPIRE_PREVIEW_LABEL: Record<ExpireRange, string> = {
  expired: "已",
  "1m": "一个月内将",
  "3m": "三个月内将",
  "6m": "六个月内将",
};

const currentExpireLabel = computed(() => EXPIRE_PREVIEW_LABEL[form.expireRange]);

function handleClose() {
  visible.value = false;
}

function handleSend() {
  ElMessageBox.confirm("消息无法撤回，是否确认发送？", "提示", {
    confirmButtonText: "确认发送",
    cancelButtonText: "取消",
    type: "warning",
    confirmButtonClass: "el-button--danger",
  })
    .then(() => {
      emit("send", { expireRange: form.expireRange });
      visible.value = false;

      // 发送成功后提示开启机构编辑权限
      ElMessageBox.confirm("请开启对应机构的信息编辑权限。", "提示", {
        confirmButtonText: "去开启",
        cancelButtonText: "知道了",
        type: "warning",
      })
        .then(() => {
          emit("openSettings");
        })
        .catch(() => {
          // 点击"知道了"，不做操作
        });
    })
    .catch(() => {
      // 取消发送
    });
}
</script>

<style scoped>
/* 蓝色信息提示条 */
.info-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: var(--color-primary-light);
  border-radius: 8px;
  padding: 13px 16px;
  margin-bottom: 16px;
}

.info-icon {
  color: var(--color-primary);
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 1px;
}

.info-text {
  flex: 1;
  font-size: 14px;
  color: var(--color-primary);
  line-height: 22px;
}

/* 表单字段组 */
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

/* 文案预览区 */
.preview-box {
  display: flex;
  align-items: center;
  gap: 3px;
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border-strong);
  border-radius: 8px;
  padding: 13px 16px;
  font-size: 14px;
  color: var(--color-body);
  line-height: 22px;
}

.highlight-tag {
  display: inline-flex;
  align-items: center;
  background: var(--color-primary-light);
  color: var(--color-primary);
  padding: 0 8px;
  border-radius: 4px;
  line-height: 22px;
}
</style>

<style>
/* el-dialog 样式覆盖 — 完全按设计稿 */
.batch-remind-dialog.el-dialog {
  border-radius: 8px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

.batch-remind-dialog .el-dialog__header {
  padding: 16px 24px;
  margin-right: 0;
  flex-shrink: 0;
}

.batch-remind-dialog .el-dialog__header .el-dialog__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-title);
  line-height: 24px;
}

.batch-remind-dialog .el-dialog__body {
  padding: 16px 24px;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.batch-remind-dialog .el-dialog__footer {
  padding: 10px 24px 24px;
  flex-shrink: 0;
}
</style>
