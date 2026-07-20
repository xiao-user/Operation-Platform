<script setup lang="ts">
import type { RegionalDashboardSectionId } from "../dashboard-sections";
import DashboardSectionTabs from "./dashboard/DashboardSectionTabs.vue";

defineProps<{
  code: string;
  entityCount: number;
  scopeName: string;
  coverageLabel?: string;
  activeSection: RegionalDashboardSectionId;
}>();

const emit = defineEmits<{
  select: [sectionId: RegionalDashboardSectionId];
}>();

</script>

<template>
  <DashboardSectionTabs
    class="bottom-navigation"
    variant="bottom"
    label="数据驾驶舱导航"
    :active-section="activeSection"
    @select="emit('select', $event)"
  >
    <template #description>
      <p class="sr-only">
        当前地图：{{ scopeName }}，行政区划代码 {{ code }}，共 {{ entityCount }} 个空间实体。{{ coverageLabel }}
      </p>
    </template>
  </DashboardSectionTabs>
</template>
