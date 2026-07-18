<template>
  <div
    class="history-item"
    :class="{ active, editing: isEditing, 'menu-open': menuOpen }"
    @click="emit('select')"
    @dblclick.stop="startRename"
  >
    <span v-if="!isEditing" class="history-item-copy" :title="title">{{ title }}</span>
    <input
      v-else
      ref="inputElement"
      v-model.trim="draftTitle"
      class="history-item-input"
      type="text"
      maxlength="120"
      @click.stop
      @blur="commitRename"
      @keydown.enter="handleRenameEnter"
      @keydown.esc.prevent="cancelRename"
    />
    <div ref="actionElement" class="history-item-action">
      <button
        type="button"
        class="history-item-more"
        aria-label="更多操作"
        :aria-expanded="menuOpen"
        @click.stop="menuOpen = !menuOpen"
      >
        <Ellipsis aria-hidden="true" />
      </button>
      <div v-if="menuOpen" class="history-item-menu" role="menu">
        <button type="button" role="menuitem" @click.stop="startRename">
          <el-icon><EditPen /></el-icon><span>重命名</span>
        </button>
        <button type="button" class="danger" role="menuitem" @click.stop="handleDelete">
          <el-icon><Delete /></el-icon><span>删除</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Ellipsis } from "@lucide/vue";
import { Delete, EditPen } from "@element-plus/icons-vue";

const props = defineProps<{ title: string; active: boolean }>();
const emit = defineEmits<{ select: []; rename: [title: string]; delete: [] }>();
const inputElement = ref<HTMLInputElement | null>(null);
const actionElement = ref<HTMLElement | null>(null);
const draftTitle = ref(props.title);
const isEditing = ref(false);
const menuOpen = ref(false);

watch(() => props.title, (title) => {
  if (!isEditing.value) draftTitle.value = title;
});

function startRename() {
  menuOpen.value = false;
  draftTitle.value = props.title;
  isEditing.value = true;
  void nextTick(() => {
    inputElement.value?.focus();
    inputElement.value?.select();
  });
}

function commitRename() {
  if (!isEditing.value) return;
  const title = draftTitle.value.trim() || props.title;
  isEditing.value = false;
  if (title !== props.title) emit("rename", title);
}

function handleRenameEnter(event: KeyboardEvent) {
  if (event.isComposing) return;
  event.preventDefault();
  commitRename();
}

function cancelRename() {
  isEditing.value = false;
  draftTitle.value = props.title;
}

function handleDelete() {
  menuOpen.value = false;
  emit("delete");
}

function handleDocumentClick(event: MouseEvent) {
  if (!actionElement.value?.contains(event.target as Node)) menuOpen.value = false;
}

onMounted(() => document.addEventListener("click", handleDocumentClick));
onBeforeUnmount(() => document.removeEventListener("click", handleDocumentClick));
</script>

<style scoped>
.history-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  width: 100%;
  min-height: 40px;
  padding: var(--spacing-8);
  background: transparent;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: background-color 180ms ease;
}

.history-item:hover,
.history-item.active,
.history-item.menu-open,
.history-item.editing {
  background: var(--color-white);
}

.history-item-copy {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--color-title);
  font-size: var(--font-size-md);
  line-height: var(--line-height-md);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-item-input {
  flex: 1;
  min-width: 0;
  height: 22px;
  padding: 0 var(--spacing-4);
  color: var(--color-title);
  font: inherit;
  background: var(--color-primary-line-light);
  border: 1px solid var(--color-primary);
  outline: 0;
}

.history-item-action {
  position: relative;
  display: flex;
  align-items: center;
  height: 24px;
  flex-shrink: 0;
}

.history-item-more {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 0;
  height: 24px;
  padding: 0;
  overflow: hidden;
  background: transparent;
  border: 0;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: width 180ms ease, background-color 160ms ease;
}

.history-item:hover .history-item-more,
.history-item.menu-open .history-item-more {
  width: 24px;
}

.history-item-more:hover {
  background: var(--color-bg-soft);
}

.history-item-more svg {
  width: 16px;
  height: 16px;
}

.history-item-menu {
  position: absolute;
  top: 28px;
  right: 0;
  z-index: 3;
  width: 120px;
  padding: var(--spacing-4);
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-m);
}

.history-item-menu button {
  display: flex;
  align-items: center;
  gap: var(--spacing-8);
  width: 100%;
  height: 32px;
  padding: 0 var(--spacing-8);
  color: var(--color-body);
  font: inherit;
  background: transparent;
  border: 0;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.history-item-menu button:hover {
  background: var(--color-bg-muted);
}

.history-item-menu button.danger {
  color: var(--color-error-dark-text);
}
</style>
