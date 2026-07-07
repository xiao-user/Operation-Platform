<template>
  <el-drawer v-model="visible" :title="drawerTitle" size="920px" destroy-on-close>
    <div class="member-drawer">
      <el-alert
        v-if="recoveryNotice"
        :title="recoveryNotice"
        type="warning"
        show-icon
        :closable="false"
      />

      <section class="member-toolbar">
        <el-input v-model="keyword" clearable placeholder="搜索姓名、账号或手机号" />
        <el-select v-model="statusFilter" placeholder="全部状态">
          <el-option label="全部状态" value="" />
          <el-option label="启用" value="enabled" />
          <el-option label="停用" value="disabled" />
        </el-select>
        <el-select v-model="roleFilter" clearable placeholder="全部角色">
          <el-option
            v-for="role in roleOptions"
            :key="role.id"
            :label="role.name"
            :value="role.id"
          />
        </el-select>
        <el-button type="primary" :icon="Plus" @click="openCreate">新增成员</el-button>
      </section>

      <el-table :data="filteredMembers" row-key="id" class="member-table">
        <el-table-column label="成员" min-width="150">
          <template #default="{ row }">
            <div class="member-cell">
              <el-avatar :size="32">{{ row.initials }}</el-avatar>
              <div>
                <strong>{{ row.name }}</strong>
                <span>{{ row.title || "暂无职务" }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="account" label="账号" min-width="150" />
        <el-table-column prop="phone" label="手机号" min-width="140" />
        <el-table-column label="角色" min-width="220">
          <template #default="{ row }">
            <div class="role-tags">
              <el-tag
                v-for="roleId in row.roleIds"
                :key="roleId"
                size="small"
                effect="plain"
                :type="roleId === ADMIN_ROLE_ID ? 'primary' : 'info'"
              >
                {{ memberStore.roleLabel(roleId) }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-switch
              :model-value="row.enabled"
              @change="(value: boolean) => handleEnabledChange(row.id, value)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="130" align="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleRemove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </el-drawer>

  <el-dialog v-model="dialogVisible" :title="editingMember ? '编辑成员' : '新增成员'" width="560px">
    <el-form label-width="96px">
      <el-form-item label="姓名" required>
        <el-input v-model="draft.name" maxlength="20" placeholder="请输入成员姓名" />
      </el-form-item>
      <el-form-item label="账号" required>
        <el-input v-model="draft.account" maxlength="32" placeholder="用于本地 demo 的账号标识" />
      </el-form-item>
      <el-form-item label="手机号">
        <el-input v-model="draft.phone" maxlength="20" placeholder="请输入手机号" />
      </el-form-item>
      <el-form-item label="职务">
        <el-input v-model="draft.title" maxlength="24" placeholder="例如：教务主任、审核员" />
      </el-form-item>
      <el-form-item label="角色" required>
        <el-select v-model="draft.roleIds" multiple collapse-tags placeholder="请选择角色">
          <el-option
            v-for="role in roleOptions"
            :key="role.id"
            :label="role.name"
            :value="role.id"
            :disabled="!role.enabled"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="启用状态">
        <el-switch v-model="draft.enabled" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus } from "@element-plus/icons-vue";
import { ADMIN_ROLE_ID } from "@/features/access-control/types";
import type { TenantMemberInput, TenantMemberRecord } from "@/features/tenant-members/types";
import { useNavigationStore } from "@/stores/navigation";
import { useTenantMemberStore } from "@/stores/tenant-members";
import type { TenantInfo } from "@/types/user";

const props = defineProps<{
  modelValue: boolean;
  tenant: TenantInfo | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const router = useRouter();
const navigationStore = useNavigationStore();
const memberStore = useTenantMemberStore();
const { members, roleOptions, recoveryNotice } = storeToRefs(memberStore);

const keyword = ref("");
const statusFilter = ref<"" | "enabled" | "disabled">("");
const roleFilter = ref("");
const dialogVisible = ref(false);
const editingMemberId = ref<string | null>(null);
const draft = reactive<TenantMemberInput>({
  name: "",
  account: "",
  phone: "",
  title: "",
  enabled: true,
  roleIds: [],
});

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
});
const drawerTitle = computed(() =>
  props.tenant ? `${props.tenant.name} · 成员管理` : "成员管理",
);
const editingMember = computed(() =>
  editingMemberId.value
    ? members.value.find((member) => member.id === editingMemberId.value) ?? null
    : null,
);
const filteredMembers = computed(() =>
  members.value.filter((member) => {
    const text = `${member.name} ${member.account} ${member.phone}`.toLowerCase();
    const matchesKeyword = keyword.value ? text.includes(keyword.value.trim().toLowerCase()) : true;
    const matchesStatus =
      !statusFilter.value ||
      (statusFilter.value === "enabled" ? member.enabled : !member.enabled);
    const matchesRole = roleFilter.value ? member.roleIds.includes(roleFilter.value) : true;
    return matchesKeyword && matchesStatus && matchesRole;
  }),
);

watch(
  () => [props.modelValue, props.tenant?.id] as const,
  ([open]) => {
    if (open && props.tenant) memberStore.load(props.tenant);
  },
  { immediate: true },
);

function resetDraft(member?: TenantMemberRecord) {
  draft.name = member?.name ?? "";
  draft.account = member?.account ?? "";
  draft.phone = member?.phone ?? "";
  draft.title = member?.title ?? "";
  draft.enabled = member?.enabled ?? true;
  draft.roleIds = member ? [...member.roleIds] : [];
}

function openCreate() {
  editingMemberId.value = null;
  resetDraft();
  dialogVisible.value = true;
}

function openEdit(member: TenantMemberRecord) {
  editingMemberId.value = member.id;
  resetDraft(member);
  dialogVisible.value = true;
}

async function validateCurrentRouteAfterMemberChange() {
  await navigationStore.ensureValidCurrentRoute(router);
}

async function handleSave() {
  try {
    if (editingMemberId.value) memberStore.updateMember(editingMemberId.value, draft);
    else memberStore.createMember(draft);
    dialogVisible.value = false;
    await validateCurrentRouteAfterMemberChange();
    ElMessage.success("成员已保存");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "成员保存失败");
  }
}

async function handleEnabledChange(memberId: string, enabled: boolean) {
  try {
    memberStore.setMemberEnabled(memberId, enabled);
    await validateCurrentRouteAfterMemberChange();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "成员状态更新失败");
  }
}

async function handleRemove(member: TenantMemberRecord) {
  try {
    await ElMessageBox.confirm(`确认删除成员「${member.name}」？`, "删除成员", {
      type: "warning",
      confirmButtonText: "删除",
      cancelButtonText: "取消",
    });
  } catch {
    return;
  }
  try {
    memberStore.removeMember(member.id);
    await validateCurrentRouteAfterMemberChange();
    ElMessage.success("成员已删除");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "成员删除失败");
  }
}
</script>

<style scoped>
.member-drawer {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-16);
}

.member-toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 128px 160px auto;
  gap: var(--spacing-12);
  align-items: center;
}

.member-table {
  width: 100%;
}

.member-cell {
  display: flex;
  align-items: center;
  gap: var(--spacing-10);
}

.member-cell strong {
  display: block;
  color: var(--color-title);
  font-size: var(--font-size-sm);
}

.member-cell span {
  color: var(--color-secondary);
  font-size: var(--font-size-xs);
}

.role-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-4);
}

@media (max-width: 767px) {
  .member-toolbar {
    grid-template-columns: 1fr;
  }
}
</style>
