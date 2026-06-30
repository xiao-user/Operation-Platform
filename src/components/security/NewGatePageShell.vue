<template>
  <div class="page-wrapper">
    <div class="page-tabs-bar">
      <div class="tabs-group">
        <div
          v-for="tab in subTabs"
          :key="tab.key"
          class="tab-item"
          :class="{ active: activeTab === tab.key }"
          @click="handleTabClick(tab.path)"
        >
          <span class="tab-label">{{ tab.label }}</span>
          <div v-if="activeTab === tab.key" class="tab-indicator" />
        </div>
      </div>

      <div class="tabs-right-slot">
        <el-icon v-if="showInfoIcon" class="info-icon"><InfoFilled /></el-icon>
        <span class="switch-label">新版门禁模式开关</span>
        <span class="switch-colon">:</span>
        <el-switch v-model="newGateMode" />
      </div>
    </div>

    <div class="page-content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { InfoFilled } from '@element-plus/icons-vue'
import { pageSubTabs } from '@/config/navigation'

interface Props {
  activeTab: string
  showInfoIcon?: boolean
}

withDefaults(defineProps<Props>(), {
  showInfoIcon: false,
})

const router = useRouter()
const newGateMode = ref(true)
const subTabs = pageSubTabs['new-gate']

function handleTabClick(path: string) {
  router.push(path)
}
</script>

<style scoped>
.page-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg);
}

.page-tabs-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 var(--spacing-16);
  background: var(--color-white);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.tabs-group {
  display: flex;
  align-items: flex-end;
  gap: var(--spacing-24);
  height: 100%;
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  cursor: pointer;
  padding-top: var(--spacing-12);
  position: relative;
}

.tab-label {
  font-size: var(--font-size-lg);
  color: var(--color-title);
  line-height: var(--line-height-lg);
}

.tab-item.active .tab-label {
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-primary);
}

.tabs-right-slot {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  flex-shrink: 0;
}

.info-icon {
  cursor: pointer;
  color: var(--color-secondary);
  margin-right: var(--spacing-4);
  font-size: var(--font-size-md);
}

.switch-label,
.switch-colon {
  font-size: var(--font-size-sm);
  color: var(--color-body);
}

.switch-colon {
  margin-right: var(--spacing-4);
}

.page-content {
  flex: 1;
  min-height: 0;
}
</style>
