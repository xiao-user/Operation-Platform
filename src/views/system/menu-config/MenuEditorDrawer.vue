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
        <MenuIconSelect v-model="form.icon" />
      </el-form-item>

      <div v-if="form.type === 'page'" data-field="page-key">
        <el-form-item label="关联页面" required>
          <el-select v-model="form.pageKey" filterable placeholder="请选择已注册页面">
            <el-option
              v-for="page in availablePages"
              :key="page.key"
              :label="pageResourceOptionLabel(page)"
              :value="page.key"
            />
          </el-select>
          <p class="field-help">
            菜单只绑定页面资源，不删除页面；没有真实页面时默认使用“功能开发中缺省页”。
          </p>
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
import {
  DEVELOPING_PAGE_KEY,
  listSelectablePageResources,
  pageRegistry,
  pageResourceOptionLabel,
} from "@/config/page-registry";
import MenuIconSelect from "@/components/MenuIconSelect.vue";
import { collectDescendantIds } from "@/features/menu-config/menu-tree";
import {
  MAX_DIRECTORY_LEVEL,
  MAX_MENU_DEPTH,
  validateMenuRecord,
} from "@/features/menu-config/menu-validation";
import type {
  ExternalOpenMode,
  MenuConfigRecord,
  MenuItemType,
  MenuRecordInput,
} from "@/features/menu-config/types";
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
const recordsById = computed(() => new Map(props.records.map((record) => [record.id, record])));
const typeOptions = computed(() => {
  if (props.editingRecord) {
    return [{
      value: props.editingRecord.type,
      label: typeLabel(props.editingRecord.type, form.parentId),
    }];
  }
  if (!props.defaultParentId) return [{ value: "module", label: "一级模块" }];
  return allowedChildTypes(props.defaultParentId).map((type) => ({
    value: type,
    label: typeLabel(type, props.defaultParentId),
  }));
});
const excludedParentIds = computed(() =>
  props.editingRecord
    ? collectDescendantIds(props.records, props.editingRecord.id).add(props.editingRecord.id)
    : new Set<string>(),
);
const parentOptions = computed(() =>
  props.records.filter((record) => {
    if (excludedParentIds.value.has(record.id)) return false;
    return canUseParent(form.type, record.id);
  }),
);
const availablePages = computed(() => {
  return listSelectablePageResources({
    tenantType: props.tenant.type,
    records: props.records,
    editingRecordId: props.editingRecord?.id ?? null,
  });
});
const defaultPageKey = computed(
  () =>
    availablePages.value.find((page) => page.key === DEVELOPING_PAGE_KEY)?.key ??
    availablePages.value[0]?.key ??
    null,
);

watch(
  () => [visible.value, props.editingRecord?.id, props.defaultParentId] as const,
  ([isVisible]) => {
    if (isVisible) resetForm();
  },
  { immediate: true },
);

function typeLabel(type: MenuItemType, parentId: string | null) {
  if (type === "module") return "一级模块";
  if (type === "page") return "内部页面";
  const parent = parentId ? recordsById.value.get(parentId) : undefined;
  const actualLevel = parent ? recordLevel(parent) + 1 : 2;
  const level = type === "directory"
    ? Math.min(MAX_DIRECTORY_LEVEL, Math.max(2, actualLevel))
    : MAX_MENU_DEPTH;
  const levelLabel = ["", "一级", "二级", "三级", "四级"][level];
  const labels: Record<Exclude<MenuItemType, "module">, string> = {
    directory: "目录",
    page: "页面",
    external: "外链",
  };
  return `${levelLabel}${labels[type]}`;
}

function recordLevel(record: MenuConfigRecord) {
  let level = 1;
  let current: MenuConfigRecord | undefined = record;
  const visited = new Set<string>();

  while (current?.parentId) {
    if (visited.has(current.id)) return Number.POSITIVE_INFINITY;
    visited.add(current.id);
    current = recordsById.value.get(current.parentId);
    if (!current) return Number.POSITIVE_INFINITY;
    level += 1;
  }

  return level;
}

function maxDescendantRelativeDepth(recordId: string) {
  const childrenByParent = new Map<string, string[]>();
  for (const record of props.records) {
    if (!record.parentId) continue;
    const children = childrenByParent.get(record.parentId) ?? [];
    children.push(record.id);
    childrenByParent.set(record.parentId, children);
  }

  let maxDepth = 0;
  const visit = (parentId: string, depth: number) => {
    for (const childId of childrenByParent.get(parentId) ?? []) {
      maxDepth = Math.max(maxDepth, depth + 1);
      visit(childId, depth + 1);
    }
  };
  visit(recordId, 0);
  return maxDepth;
}

function canUseParent(type: MenuItemType, parentId: string | null) {
  if (type === "module") return parentId === null;
  if (!parentId) return false;

  const parent = recordsById.value.get(parentId);
  if (!parent || (parent.type !== "module" && parent.type !== "directory")) return false;

  const level = recordLevel(parent) + 1;
  const descendantDepth = props.editingRecord
    ? maxDescendantRelativeDepth(props.editingRecord.id)
    : 0;

  if (level + descendantDepth > MAX_MENU_DEPTH) return false;
  if (type === "directory" && level > MAX_DIRECTORY_LEVEL) return false;
  return true;
}

function allowedChildTypes(parentId: string | null): MenuItemType[] {
  if (!parentId) return ["module"];
  return (["directory", "page", "external"] as MenuItemType[]).filter((type) =>
    canUseParent(type, parentId),
  );
}

function defaultChildType(parentId: string | null): MenuItemType {
  const types = allowedChildTypes(parentId);
  return types.includes("page") ? "page" : types[0] ?? "page";
}

function firstAllowedParentId(type: MenuItemType) {
  if (type === "module") return null;
  if (props.defaultParentId && canUseParent(type, props.defaultParentId)) {
    return props.defaultParentId;
  }
  return parentOptions.value[0]?.id ?? null;
}

function resetForm() {
  const source = props.editingRecord;
  form.parentId = source?.parentId ?? props.defaultParentId;
  form.type = source?.type ?? (
    props.defaultParentId ? defaultChildType(props.defaultParentId) : "module"
  );
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
  else if (!form.parentId || !canUseParent(type, form.parentId)) {
    form.parentId = firstAllowedParentId(type);
  }
  if (type === "page") {
    if (!form.pageKey || !availablePages.value.some((page) => page.key === form.pageKey)) {
      form.pageKey = defaultPageKey.value;
    }
  } else {
    form.pageKey = null;
  }
  if (type !== "external") {
    form.externalUrl = null;
    form.externalOpenMode = null;
  } else if (!form.externalOpenMode) {
    form.externalOpenMode = "new-tab" satisfies ExternalOpenMode;
  }

  if (type !== "module" && selectedParent.value && !canUseParent(type, selectedParent.value.id)) {
    form.parentId = firstAllowedParentId(type);
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
      "directory-depth-exceeded": "目录最多支持到第三级，第四级请配置页面或外链",
      "menu-depth-exceeded": "菜单最多支持四级",
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

.field-help {
  margin: var(--spacing-6) 0 0;
  color: var(--color-secondary);
  font-size: var(--font-size-xs);
  line-height: var(--line-height-xs);
}
</style>
