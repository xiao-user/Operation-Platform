<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import CloudOrb from "./CloudOrb.vue";

type AiOrbState = "listening" | "speaking";

const ORB_STATE_DURATION_MS = 4_000;

const props = defineProps<{
  href?: string;
}>();

const orbState = ref<AiOrbState>("listening");
let orbStateTimer: number | undefined;

function handleClick(event: MouseEvent) {
  if (!props.href) event.preventDefault();
}

onMounted(() => {
  orbStateTimer = window.setInterval(() => {
    orbState.value = orbState.value === "listening" ? "speaking" : "listening";
  }, ORB_STATE_DURATION_MS);
});

onBeforeUnmount(() => {
  if (orbStateTimer !== undefined) window.clearInterval(orbStateTimer);
});
</script>

<template>
  <a
    class="ai-data-assistant-entry"
    :href="href ?? '#'"
    target="_blank"
    rel="noopener noreferrer"
    :aria-disabled="href ? undefined : 'true'"
    aria-label="AI数据助手，新标签打开"
    data-node-id="2054:2781"
    @click="handleClick"
  >
    <CloudOrb
      :state="orbState"
      :size="40"
      :diameter-ratio="0.8"
      data-node-id="2054:2805"
    />
    <span data-node-id="2054:2799">AI数据助手</span>
  </a>
</template>

<style scoped>
.ai-data-assistant-entry {
  position: absolute;
  z-index: calc(var(--dt-z-hud) + 1);
  bottom: var(--dt-ai-entry-bottom);
  left: var(--dt-map-hud-left);
  display: inline-flex;
  width: var(--dt-ai-entry-width);
  height: var(--dt-ai-entry-height);
  overflow: hidden;
  border: var(--dt-border-width) solid rgb(255 255 255 / 8%);
  border-radius: 100px;
  padding: var(--dt-space-2) var(--dt-space-4) var(--dt-space-2) var(--dt-space-2);
  background: rgb(255 255 255 / 5%);
  box-shadow: 0 12px 32px rgb(0 0 0 / 16%);
  color: var(--dt-color-text-strong);
  text-decoration: none;
  align-items: center;
  justify-content: center;
  gap: var(--dt-space-2);
  pointer-events: auto;
  backdrop-filter: blur(var(--dt-ai-entry-blur));
  transition:
    background var(--dt-transition-fast),
    box-shadow var(--dt-transition-fast),
    transform var(--dt-transition-fast);
}

.ai-data-assistant-entry :deep(.cloud-orb) {
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
}

.ai-data-assistant-entry span {
  flex: 0 0 auto;
  font-family: "Alimama ShuHeiTi", var(--dt-font-family);
  font-size: var(--dt-font-size-md);
  line-height: var(--dt-line-height-sm);
  font-weight: var(--dt-font-weight-bold);
  white-space: nowrap;
}

.ai-data-assistant-entry:hover {
  background: rgb(255 255 255 / 8%);
  box-shadow: 0 14px 36px rgb(0 0 0 / 22%), 0 0 18px color-mix(in srgb, var(--hud-primary) 10%, transparent);
  transform: translateY(-1px);
}

.ai-data-assistant-entry:active {
  transform: translateY(0);
}

@media (max-width: 1180px) {
  .ai-data-assistant-entry { left: var(--dt-space-6); }
}
</style>
