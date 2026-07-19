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

    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="save">保存设置</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import type {
  WorkbenchWidgetDefinition,
  WorkbenchWidgetItem,
  WorkbenchWidgetSettings,
} from "@/features/workbench/types";
import { cloneWorkbenchSettings } from "@/features/workbench/workbench-layout";

const props = defineProps<{
  item: WorkbenchWidgetItem | null;
  definition: WorkbenchWidgetDefinition | null;
}>();

const emit = defineEmits<{
  save: [settings: WorkbenchWidgetSettings];
}>();
const visible = defineModel<boolean>({ required: true });
const draft = ref<WorkbenchWidgetSettings>({ kind: "none" });

watch(
  () => [visible.value, props.item?.widgetKey] as const,
  ([isVisible]) => {
    if (!isVisible || !props.item) return;
    draft.value = cloneWorkbenchSettings(props.item.settings);
  },
  { immediate: true },
);

function save() {
  emit("save", cloneWorkbenchSettings(draft.value));
  visible.value = false;
}
</script>
