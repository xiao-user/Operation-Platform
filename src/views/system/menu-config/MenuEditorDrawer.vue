<template>
  <el-drawer
    v-model="visible"
    :title="editingRecord ? '编辑菜单' : '新增菜单'"
    size="480px"
    destroy-on-close
  >
    <el-form label-position="top" class="menu-form" @submit.prevent="handleSubmit">
      <el-form-item label="菜单类型" required>
        <el-select v-model="form.type" :disabled="Boolean(editingRecord)" @change="handleTypeChange">
          <el-option
            v-for="option in typeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item v-if="form.type !== 'module'" label="上级菜单" required>
        <el-select v-model="form.parentId" placeholder="请选择上级菜单" filterable>
          <el-option
            v-for="option in parentOptions"
            :key="option.id"
            :label="option.name"
            :value="option.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="菜单名称" required>
        <el-input v-model="form.name" maxlength="30" show-word-limit placeholder="请输入菜单名称" />
      </el-form-item>

      <el-form-item label="菜单图标">
        <el-select v-model="form.icon" clearable placeholder="请选择图标">
          <el-option v-for="icon in iconOptions" :key="icon" :label="icon" :value="icon" />
        </el-select>
      </el-form-item>

      <div v-if="form.type === 'page'" data-field="page-key">
        <el-form-item label="关联页面" required>
          <el-select v-model="form.pageKey" filterable placeholder="请选择已注册页面">
            <el-option
              v-for="page in availablePages"
              :key="page.key"
              :label="`${page.title} · ${page.path}`"
              :value="page.key"
            />
          </el-select>
        </el-form-item>
      </div>

      <div v-if="form.type === 'external'" data-field="external-url">
        <el-form-item label="外部地址" required>
          <el-input v-model="form.externalUrl" placeholder="https://example.com" />
        </el-form-item>
      </div>

      <div v-if="form.type === 'external'" data-field="external-open-mode">
        <el-form-item label="打开方式" required>
          <el-radio-group v-model="form.externalOpenMode">
            <el-radio value="current">当前窗口</el-radio>
            <el-radio value="new-tab">新窗口</el-radio>
          </el-radio-group>
        </el-form-item>
      </div>

      <div class="form-grid">
        <el-form-item label="排序值" required>
          <el-input-number v-model="form.sort" :min="0" :max="9999" controls-position="right" />
        </el-form-item>
        <el-form-item label="菜单状态">
          <div class="visibility-control">
            <el-switch v-model="form.visible" />
            <span>{{ form.visible ? "显示" : "隐藏" }}</span>
          </div>
        </el-form-item>
      </div>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmit">确认保存</el-button>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { ElMessage } from "element-plus";
import { pageRegistry } from "@/config/page-registry";
import { collectDescendantIds } from "@/features/menu-config/menu-tree";
import { validateMenuRecord } from "@/features/menu-config/menu-validation";
import type {
  ExternalOpenMode,
  MenuConfigRecord,
  MenuItemType,
  MenuRecordInput,
} from "@/features/menu-config/types";
import type { MenuIconKey } from "@/types/navigation";
import type { TenantInfo } from "@/types/user";

const props = withDefaults(
  defineProps<{
    tenant: TenantInfo;
    records: MenuConfigRecord[];
    editingRecord?: MenuConfigRecord | null;
    defaultParentId?: string | null;
  }>(),
  {
    editingRecord: null,
    defaultParentId: null,
  },
);

const emit = defineEmits<{ save: [input: MenuRecordInput] }>();
const visible = defineModel<boolean>({ required: true });

const iconOptions: MenuIconKey[] = [
  "grid",
  "notebook",
  "chat",
  "calendar",
  "house",
  "money",
  "shield",
  "setting",
  "menu",
  "data",
  "document",
  "coin",
  "office",
  "user",
  "list",
];

const form = reactive<MenuRecordInput>({
  parentId: null,
  type: "module",
  name: "",
  icon: null,
  pageKey: null,
  externalUrl: null,
  externalOpenMode: null,
  sort: 10,
  visible: true,
});

const selectedParent = computed(() =>
  props.records.find((record) => record.id === form.parentId),
);
const typeOptions = computed(() => {
  if (props.editingRecord) {
    return [{ value: props.editingRecord.type, label: typeLabel(props.editingRecord.type) }];
  }
  if (!props.defaultParentId) return [{ value: "module", label: "顶部模块" }];
  const parent = props.records.find((record) => record.id === props.defaultParentId);
  const types: MenuItemType[] = parent?.type === "directory"
    ? ["page", "external"]
    : ["directory", "page", "external"];
  return types.map((type) => ({ value: type, label: typeLabel(type) }));
});
const excludedParentIds = computed(() =>
  props.editingRecord
    ? collectDescendantIds(props.records, props.editingRecord.id).add(props.editingRecord.id)
    : new Set<string>(),
);
const parentOptions = computed(() =>
  props.records.filter((record) => {
    if (excludedParentIds.value.has(record.id)) return false;
    if (form.type === "directory") return record.type === "module";
    return record.type === "module" || record.type === "directory";
  }),
);
const availablePages = computed(() => {
  const usedPageKeys = new Set(
    props.records
      .filter((record) => record.id !== props.editingRecord?.id && record.pageKey)
      .map((record) => record.pageKey),
  );
  return pageRegistry.filter(
    (page) =>
      page.selectable &&
      page.tenantTypes.includes(props.tenant.type) &&
      !usedPageKeys.has(page.key),
  );
});

watch(
  () => [visible.value, props.editingRecord?.id, props.defaultParentId] as const,
  ([isVisible]) => {
    if (isVisible) resetForm();
  },
  { immediate: true },
);

function typeLabel(type: MenuItemType) {
  return {
    module: "顶部模块",
    directory: "目录",
    page: "内部页面",
    external: "外部链接",
  }[type];
}

function resetForm() {
  const source = props.editingRecord;
  form.parentId = source?.parentId ?? props.defaultParentId;
  form.type = source?.type ?? (props.defaultParentId ? "page" : "module");
  form.name = source?.name ?? "";
  form.icon = source?.icon ?? null;
  form.pageKey = source?.pageKey ?? null;
  form.externalUrl = source?.externalUrl ?? null;
  form.externalOpenMode = source?.externalOpenMode ?? null;
  form.sort = source?.sort ?? 10;
  form.visible = source?.visible ?? true;
  handleTypeChange(form.type);
}

function handleTypeChange(type: MenuItemType) {
  if (type === "module") form.parentId = null;
  else if (!form.parentId) form.parentId = props.defaultParentId;
  if (type !== "page") form.pageKey = null;
  if (type !== "external") {
    form.externalUrl = null;
    form.externalOpenMode = null;
  } else if (!form.externalOpenMode) {
    form.externalOpenMode = "new-tab" satisfies ExternalOpenMode;
  }

  if (type === "directory" && selectedParent.value?.type === "directory") {
    form.parentId = null;
  }
}

function handleSubmit() {
  const candidate: MenuConfigRecord = {
    ...form,
    id: props.editingRecord?.id ?? "__new__",
    tenantId: props.tenant.id,
  };
  const errors = validateMenuRecord(candidate, props.records, {
    tenantType: props.tenant.type,
    pages: new Map(pageRegistry.map((page) => [page.key, page])),
  });
  if (errors.length) {
    const messages: Record<string, string> = {
      "name-required": "请输入菜单名称",
      "duplicate-sibling-name": "同级菜单名称不能重复",
      "parent-required": "请选择上级菜单",
      "directory-depth-exceeded": "目录下不能继续新增目录",
      "page-required": "请选择关联页面",
      "page-not-available": "当前租户无法使用该页面",
      "duplicate-page-key": "该页面已经绑定到其他菜单",
      "external-url-required": "请输入外部地址",
      "invalid-external-url": "外部地址必须使用 http 或 https",
      "external-open-mode-required": "请选择打开方式",
    };
    ElMessage.warning(messages[errors[0]!] ?? "菜单配置不符合规则");
    return;
  }
  emit("save", { ...form });
}
</script>

<style scoped>
.menu-form :deep(.el-select),
.menu-form :deep(.el-input-number) {
  width: 100%;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-16);
}

.visibility-control {
  display: flex;
  align-items: center;
  gap: var(--spacing-8);
  min-height: 32px;
  color: var(--color-body);
}
</style>
