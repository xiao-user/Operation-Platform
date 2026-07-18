<template>
  <el-select-v2
    v-model="model"
    :aria-label="ariaLabel"
    :clearable="clearable"
    :disabled="disabled"
    filterable
    :options="menuIconOptions"
    :props="optionProps"
    :placeholder="placeholder"
  >
    <template #default="{ item: option }">
      <span class="icon-option">
        <component :is="menuIconComponent(option.key)" class="icon-option-svg" />
        <span class="icon-option-name">{{ option.label }}</span>
      </span>
    </template>
  </el-select-v2>
</template>

<script setup lang="ts">
import { menuIconComponent, menuIconOptions } from "@/components/menu-icon-options";
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
const optionProps = { label: "label", value: "key" } as const;
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

</style>
