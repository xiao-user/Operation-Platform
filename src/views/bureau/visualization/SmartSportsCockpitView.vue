<script setup lang="ts">
import TenantRegionalDashboardView from "./TenantRegionalDashboardView.vue";
</script>

<template>
  <!--
    直接复用完整区域教育大屏，确保 DOM、地图引擎、主题、动效和 HUD
    与现有视觉基线一致；仅通过 MapDataSource 注入智慧体育行政区层级。
  -->
  <TenantRegionalDashboardView mode="smart-sports" />
</template>
