<template>
  <el-select
    v-model="model"
    :aria-label="ariaLabel"
    :clearable="clearable"
    :disabled="disabled"
    filterable
    :placeholder="placeholder"
  >
    <el-option
      v-for="option in menuIconOptions"
      :key="option.key"
      :label="option.label"
      :value="option.key"
    >
      <span class="icon-option">
        <component :is="option.component" class="icon-option-svg" />
        <span class="icon-option-name">{{ option.label }}</span>
        <span class="icon-option-key">{{ option.key }}</span>
      </span>
    </el-option>
  </el-select>
</template>

<script setup lang="ts">
import { menuIconOptions } from "@/components/menu-icon-options";
import type { MenuIconKey } from "@/types/navigation";

withDefaults(
  defineProps<{
    placeholder?: string;
    ariaLabel?: string;
    disabled?: boolean;
    clearable?: boolean;
  }>(),
  {
    placeholder: "请选择图标",
    ariaLabel: "菜单图标",
    disabled: false,
    clearable: true,
  },
);

const model = defineModel<MenuIconKey | null>({ required: true });
</script>

<style scoped>
.icon-option {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-8);
  min-width: 0;
  width: 100%;
}

.icon-option-svg {
  width: 16px;
  height: 16px;
  color: var(--color-title);
  flex-shrink: 0;
}

.icon-option-name {
  min-width: 0;
  overflow: hidden;
  color: var(--color-title);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-option-key {
  margin-left: auto;
  color: var(--color-secondary);
  font-size: var(--font-size-xs);
  flex-shrink: 0;
}
</style>
