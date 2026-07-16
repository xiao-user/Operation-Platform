<script setup lang="ts">
import type { DigitalTwinMapTheme } from "../map-themes";

defineProps<{
  themes: readonly DigitalTwinMapTheme[];
  activeThemeId: DigitalTwinMapTheme["id"];
}>();

const emit = defineEmits<{
  select: [themeId: DigitalTwinMapTheme["id"]];
}>();
</script>

<template>
  <div class="theme-switcher" aria-label="地图主题">
    <button
      v-for="theme in themes"
      :key="theme.id"
      type="button"
      :class="{ 'is-active': theme.id === activeThemeId }"
      :style="{ '--theme-swatch': theme.primary }"
      :aria-label="`切换至${theme.name}`"
      :aria-pressed="theme.id === activeThemeId"
      :title="`${theme.name} · ${theme.description}`"
      @click="emit('select', theme.id)"
    >
      <i />
    </button>
  </div>
</template>

<style scoped>
.theme-switcher {
  display: flex;
  padding-right: var(--dt-space-1);
  align-items: center;
  gap: var(--dt-space-2);
}

button {
  --theme-swatch: var(--dt-color-accent);
  display: grid;
  width: var(--dt-theme-swatch-size);
  height: var(--dt-theme-swatch-size);
  border: 1px solid transparent;
  border-radius: 50%;
  padding: 0;
  background: transparent;
  cursor: pointer;
  transition: border-color var(--dt-transition-fast), background var(--dt-transition-fast);
  place-items: center;
}

button i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--theme-swatch);
  box-shadow: 0 0 var(--dt-space-2) color-mix(in srgb, var(--theme-swatch) 58%, transparent);
}

button:hover,
button.is-active {
  border-color: color-mix(in srgb, var(--theme-swatch) 70%, transparent);
  background: color-mix(in srgb, var(--theme-swatch) 10%, transparent);
}
</style>
