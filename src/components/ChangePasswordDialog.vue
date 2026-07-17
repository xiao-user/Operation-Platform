<template>
  <el-dialog
    v-model="visible"
    title="修改密码"
    width="460px"
    append-to-body
    destroy-on-close
    @closed="resetForm"
  >
    <el-form label-position="top" @submit.prevent="handleSubmit">
      <el-form-item label="当前密码" required>
        <el-input
          v-model="currentPassword"
          type="password"
          show-password
          autocomplete="current-password"
          placeholder="请输入当前密码"
        />
      </el-form-item>
      <el-form-item label="新密码" required>
        <el-input
          v-model="newPassword"
          type="password"
          show-password
          autocomplete="new-password"
          placeholder="请输入至少 6 位新密码"
          @keyup.enter="handleSubmit"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="changingPassword" @click="handleSubmit">
        保存新密码
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { ElMessage } from "element-plus";
import { useAuthStore } from "@/stores/auth";

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const authStore = useAuthStore();
const { changingPassword } = storeToRefs(authStore);
const currentPassword = ref("");
const newPassword = ref("");

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
});

function resetForm() {
  currentPassword.value = "";
  newPassword.value = "";
}

async function handleSubmit() {
  if (!currentPassword.value || !newPassword.value) {
    ElMessage.warning("请输入当前密码和新密码");
    return;
  }
  if (newPassword.value.length < 6) {
    ElMessage.warning("新密码至少需要 6 位");
    return;
  }
  if (newPassword.value === currentPassword.value) {
    ElMessage.warning("新密码不能与当前密码相同");
    return;
  }

  try {
    await authStore.changePassword(currentPassword.value, newPassword.value);
    visible.value = false;
    ElMessage.success("密码修改成功");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "密码修改失败");
  }
}
</script>
