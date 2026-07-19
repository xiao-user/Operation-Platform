<template>
  <el-dialog v-model="visible" :title="`${definition?.title ?? '组件'}设置`" width="520px">
    <el-form v-if="item && definition" label-position="top">
      <el-form-item v-if="draft.kind === 'trend'" label="数据范围">
        <el-radio-group v-model="draft.range">
          <el-radio-button value="7d">近 7 天</el-radio-button>
          <el-radio-button value="30d">近 30 天</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item v-else-if="draft.kind === 'list'" label="显示数量">
        <el-radio-group v-model="draft.limit">
          <el-radio-button :value="5">5 条</el-radio-button>
          <el-radio-button :value="10">10 条</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item v-else-if="draft.kind === 'quick-links'" label="快捷入口">
        <el-radio-group v-model="quickLinkMode" class="quick-link-mode">
          <el-radio-button value="auto">自动展示</el-radio-button>
          <el-radio-button value="custom">手动选择</el-radio-button>
        </el-radio-group>
        <el-checkbox-group
          v-if="quickLinkMode === 'custom'"
          v-model="selectedMenuIds"
          class="quick-link-options"
        >
          <el-checkbox
            v-for="link in quickLinks"
            :key="link.id"
            :value="link.id"
            :disabled="selectedMenuIds.length >= 8 && !selectedMenuIds.includes(link.id)"
          >
            {{ link.name }}
          </el-checkbox>
        </el-checkbox-group>
        <p class="settings-help">
          自动展示会始终使用当前角色有权访问的前 8 个菜单；手动选择最多保留 8 个已授权菜单。
        </p>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="save">保存设置</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type {
  WorkbenchQuickLinkData,
  WorkbenchWidgetDefinition,
  WorkbenchWidgetItem,
  WorkbenchWidgetSettings,
} from "@/features/workbench/types";
import { cloneWorkbenchSettings } from "@/features/workbench/workbench-layout";

const props = defineProps<{
  item: WorkbenchWidgetItem | null;
  definition: WorkbenchWidgetDefinition | null;
  quickLinks: WorkbenchQuickLinkData[];
}>();

const emit = defineEmits<{
  save: [settings: WorkbenchWidgetSettings];
}>();
const visible = defineModel<boolean>({ required: true });
const draft = ref<WorkbenchWidgetSettings>({ kind: "none" });
const selectedMenuIds = ref<string[]>([]);
const quickLinkMode = ref<"auto" | "custom">("auto");

const availableLinkIds = computed(() => new Set(props.quickLinks.map((link) => link.id)));

watch(
  () => [visible.value, props.item?.widgetKey] as const,
  ([isVisible]) => {
    if (!isVisible || !props.item) return;
    draft.value = cloneWorkbenchSettings(props.item.settings);
    if (props.item.settings.kind === "quick-links") {
      quickLinkMode.value = props.item.settings.menuIds === null ? "auto" : "custom";
      selectedMenuIds.value = props.item.settings.menuIds?.filter((id) => availableLinkIds.value.has(id)) ??
        props.quickLinks.slice(0, 8).map((link) => link.id);
    } else {
      quickLinkMode.value = "auto";
      selectedMenuIds.value = [];
    }
  },
  { immediate: true },
);

function save() {
  if (draft.value.kind === "quick-links") {
    emit("save", {
      kind: "quick-links",
      menuIds: quickLinkMode.value === "auto" ? null : [...selectedMenuIds.value],
    });
  } else {
    emit("save", cloneWorkbenchSettings(draft.value));
  }
  visible.value = false;
}
</script>

<style scoped>
.quick-link-mode {
  margin-bottom: var(--spacing-12);
}

.quick-link-options {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-8) var(--spacing-16);
}

.settings-help {
  margin: var(--spacing-8) 0 0;
  color: var(--color-secondary);
  font-size: var(--font-size-sm);
}
</style>
