<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import CloudOrb from "./CloudOrb.vue";

type AiOrbState = "listening" | "speaking";

const ORB_STATE_DURATION_MS = 4_000;
const DRAG_ACTIVATION_DISTANCE = 4;

const props = defineProps<{
  href?: string;
}>();

const orbState = ref<AiOrbState>("listening");
const entryRoot = ref<HTMLAnchorElement>();
let orbStateTimer: number | undefined;
let activePointerId: number | undefined;
let dragStartClientX = 0;
let dragStartClientY = 0;
let dragStartOffsetX = 0;
let dragStartOffsetY = 0;
let dragOffsetX = 0;
let dragOffsetY = 0;
let dragMinX = 0;
let dragMaxX = 0;
let dragMinY = 0;
let dragMaxY = 0;
let dragActivated = false;
let suppressNextClick = false;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function dragBoundaryPadding(entry: HTMLElement) {
  return Number.parseFloat(getComputedStyle(entry).getPropertyValue("--dt-space-2")) || 8;
}

function applyDragOffset(x: number, y: number) {
  const entry = entryRoot.value;
  if (!entry) return;
  dragOffsetX = x;
  dragOffsetY = y;
  entry.style.setProperty("--ai-entry-drag-x", `${x}px`);
  entry.style.setProperty("--ai-entry-drag-y", `${y}px`);
}

function resolveDragBounds() {
  const entry = entryRoot.value;
  const container = entry?.parentElement;
  if (!entry || !container) return;
  const entryRect = entry.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const padding = dragBoundaryPadding(entry);
  const baseLeft = entryRect.left - dragOffsetX;
  const baseTop = entryRect.top - dragOffsetY;
  dragMinX = containerRect.left + padding - baseLeft;
  dragMaxX = containerRect.right - padding - entryRect.width - baseLeft;
  dragMinY = containerRect.top + padding - baseTop;
  dragMaxY = containerRect.bottom - padding - entryRect.height - baseTop;
}

function constrainToViewport() {
  const entry = entryRoot.value;
  const container = entry?.parentElement;
  if (!entry || !container) return;
  const entryRect = entry.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const padding = dragBoundaryPadding(entry);
  let correctionX = 0;
  let correctionY = 0;
  if (entryRect.left < containerRect.left + padding) {
    correctionX = containerRect.left + padding - entryRect.left;
  } else if (entryRect.right > containerRect.right - padding) {
    correctionX = containerRect.right - padding - entryRect.right;
  }
  if (entryRect.top < containerRect.top + padding) {
    correctionY = containerRect.top + padding - entryRect.top;
  } else if (entryRect.bottom > containerRect.bottom - padding) {
    correctionY = containerRect.bottom - padding - entryRect.bottom;
  }
  if (correctionX !== 0 || correctionY !== 0) {
    applyDragOffset(dragOffsetX + correctionX, dragOffsetY + correctionY);
  }
}

function handleClick(event: MouseEvent) {
  if (suppressNextClick || !props.href) event.preventDefault();
  suppressNextClick = false;
}

function handlePointerDown(event: PointerEvent) {
  const entry = entryRoot.value;
  if (!entry || event.button !== 0 || activePointerId !== undefined) return;
  activePointerId = event.pointerId;
  dragStartClientX = event.clientX;
  dragStartClientY = event.clientY;
  dragStartOffsetX = dragOffsetX;
  dragStartOffsetY = dragOffsetY;
  dragActivated = false;
  resolveDragBounds();
  entry.setPointerCapture?.(event.pointerId);
  entry.classList.add("is-dragging");
}

function handlePointerMove(event: PointerEvent) {
  if (event.pointerId !== activePointerId) return;
  const deltaX = event.clientX - dragStartClientX;
  const deltaY = event.clientY - dragStartClientY;
  if (!dragActivated && Math.hypot(deltaX, deltaY) >= DRAG_ACTIVATION_DISTANCE) {
    dragActivated = true;
  }
  if (!dragActivated) return;
  event.preventDefault();
  applyDragOffset(
    clamp(dragStartOffsetX + deltaX, dragMinX, dragMaxX),
    clamp(dragStartOffsetY + deltaY, dragMinY, dragMaxY),
  );
}

function finishDragging(event?: PointerEvent) {
  if (event && event.pointerId !== activePointerId) return;
  const entry = entryRoot.value;
  if (dragActivated) suppressNextClick = true;
  if (entry && activePointerId !== undefined && entry.hasPointerCapture?.(activePointerId)) {
    entry.releasePointerCapture(activePointerId);
  }
  entry?.classList.remove("is-dragging");
  activePointerId = undefined;
  dragActivated = false;
}

onMounted(() => {
  orbStateTimer = window.setInterval(() => {
    orbState.value = orbState.value === "listening" ? "speaking" : "listening";
  }, ORB_STATE_DURATION_MS);
  window.addEventListener("resize", constrainToViewport);
});

onBeforeUnmount(() => {
  if (orbStateTimer !== undefined) window.clearInterval(orbStateTimer);
  window.removeEventListener("resize", constrainToViewport);
});
</script>

<template>
  <a
    ref="entryRoot"
    class="ai-data-assistant-entry"
    :href="href ?? '#'"
    target="_blank"
    rel="noopener noreferrer"
    :aria-disabled="href ? undefined : 'true'"
    aria-label="AI数据助手，新标签打开"
    aria-describedby="ai-data-assistant-drag-hint"
    data-node-id="2054:2781"
    @click="handleClick"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="finishDragging"
    @pointercancel="finishDragging"
    @lostpointercapture="finishDragging"
  >
    <CloudOrb
      :state="orbState"
      :size="40"
      :diameter-ratio="0.8"
      data-node-id="2054:2805"
    />
    <span data-node-id="2054:2799">AI数据助手</span>
    <span id="ai-data-assistant-drag-hint" class="sr-only">可拖动调整入口位置</span>
  </a>
</template>

<style scoped>
.ai-data-assistant-entry {
  position: absolute;
  z-index: calc(var(--dt-z-hud) + 1);
  bottom: var(--dt-ai-entry-bottom);
  right: var(--dt-screen-gutter);
  display: inline-flex;
  width: max-content;
  max-width: calc(100% - var(--dt-space-4));
  height: var(--dt-ai-entry-height);
  overflow: hidden;
  border: var(--dt-border-width) solid color-mix(in srgb, var(--normal--white--100) 8%, transparent);
  border-radius: 100px;
  padding: var(--dt-space-2) var(--dt-space-4) var(--dt-space-2) var(--dt-space-2);
  background: var(--normal--white--5);
  box-shadow: 0 12px 32px color-mix(in srgb, var(--normal--black--100) 16%, transparent);
  color: var(--dt-color-text-strong);
  text-decoration: none;
  align-items: center;
  justify-content: center;
  gap: var(--dt-space-2);
  pointer-events: auto;
  cursor: grab;
  touch-action: none;
  user-select: none;
  backdrop-filter: blur(var(--dt-ai-entry-blur));
  transform: translate3d(
    var(--ai-entry-drag-x, 0),
    var(--ai-entry-drag-y, 0),
    0
  );
  transition:
    background var(--dt-transition-fast),
    box-shadow var(--dt-transition-fast);
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
  background: color-mix(in srgb, var(--normal--white--100) 8%, transparent);
  box-shadow: 0 14px 36px color-mix(in srgb, var(--normal--black--100) 22%, transparent), 0 0 18px color-mix(in srgb, var(--hud-primary) 10%, transparent);
}

.ai-data-assistant-entry.is-dragging {
  cursor: grabbing;
  box-shadow: 0 16px 42px color-mix(in srgb, var(--normal--black--100) 28%, transparent), 0 0 20px color-mix(in srgb, var(--hud-primary) 14%, transparent);
  will-change: transform;
}
</style>
