<template>
  <aside class="ai-assistant" :class="{ expanded: assistantStore.isExpanded }" aria-label="AI 运营助手">
    <section
      v-if="assistantStore.isExpanded && assistantStore.isHistoryRailVisible"
      class="assistant-history-rail"
      aria-label="历史会话列表"
    >
      <div class="history-rail-header">
        <div class="assistant-title history-rail-title">
          <img class="assistant-avatar" :src="assistantAvatar" alt="" />
          <span>AI 运营助手</span>
        </div>
        <button
          type="button"
          class="history-rail-indicator"
          aria-label="隐藏历史对话栏"
          title="隐藏历史对话栏"
          @click="assistantStore.toggleHistoryRail"
        >
          <PanelLeftClose aria-hidden="true" />
        </button>
      </div>

      <button type="button" class="history-new-chat" @click="assistantStore.newConversation">
        <Plus aria-hidden="true" />
        <span>新建对话</span>
      </button>
      <div class="history-plaza">
        <Bot aria-hidden="true" />
        <span>智能体广场</span>
      </div>
      <div class="history-rail-scroll">
        <div v-if="assistantStore.historyLoading" class="history-loading">
          <el-icon class="is-rotating"><Loading /></el-icon>
          <span>正在加载历史会话</span>
        </div>
        <p v-else-if="!assistantStore.sessions.length" class="history-empty">暂无历史会话</p>
        <section v-for="group in historyGroups" :key="group.key" class="history-group">
          <p class="history-group-label">{{ group.label }}</p>
          <div class="history-group-list">
            <AiHistorySessionItem
              v-for="session in group.items"
              :key="session.id"
              :title="session.title"
              :active="session.id === assistantStore.activeSessionId"
              @select="assistantStore.switchSession(session.id)"
              @rename="assistantStore.renameSession(session.id, $event)"
              @delete="assistantStore.deleteSession(session.id)"
            />
          </div>
        </section>
      </div>
    </section>

    <section
      class="assistant-workspace"
      :class="{
        'assistant-workspace--expanded': assistantStore.isExpanded,
        'assistant-workspace--solo': assistantStore.isExpanded && !assistantStore.isHistoryRailVisible,
      }"
    >
      <header class="assistant-header" :style="{ backgroundImage: `url(${headerBackground})` }">
        <div v-if="!assistantStore.isExpanded || !assistantStore.isHistoryRailVisible" class="assistant-title">
          <img class="assistant-avatar" :src="assistantAvatar" alt="" />
          <span>AI 运营助手</span>
        </div>
        <div v-else class="assistant-header-spacer" />

        <div class="assistant-tools" :class="{ 'assistant-tools--expanded': assistantStore.isExpanded }">
          <el-dropdown
            v-if="!assistantStore.isExpanded"
            trigger="click"
            placement="bottom-end"
            popper-class="assistant-history-dropdown"
          >
            <button class="assistant-icon-btn" type="button" aria-label="历史对话" title="历史对话">
              <History aria-hidden="true" />
            </button>
            <template #dropdown>
              <div class="assistant-history-dropdown-panel">
                <p v-if="assistantStore.historyLoading" class="assistant-history-dropdown-state">
                  正在加载历史会话
                </p>
                <p v-else-if="!assistantStore.sessions.length" class="assistant-history-dropdown-state">
                  暂无历史会话
                </p>
                <button
                  v-for="session in assistantStore.sessions"
                  :key="session.id"
                  type="button"
                  class="assistant-history-dropdown-item"
                  :class="{ active: session.id === assistantStore.activeSessionId }"
                  @click="assistantStore.switchSession(session.id)"
                >
                  {{ session.title }}
                </button>
              </div>
            </template>
          </el-dropdown>
          <button
            v-else
            class="assistant-icon-btn"
            :class="{ active: assistantStore.isHistoryRailVisible }"
            type="button"
            :aria-label="assistantStore.isHistoryRailVisible ? '隐藏历史对话栏' : '显示历史对话栏'"
            @click="assistantStore.toggleHistoryRail"
          >
            <History aria-hidden="true" />
          </button>
          <button
            class="assistant-icon-btn"
            :class="{ active: assistantStore.isExpanded }"
            type="button"
            :aria-label="assistantStore.isExpanded ? '退出全屏' : '展开助手'"
            @click="assistantStore.toggleExpanded"
          >
            <Minimize2 v-if="assistantStore.isExpanded" aria-hidden="true" />
            <Maximize2 v-else aria-hidden="true" />
          </button>
          <button class="assistant-icon-btn" type="button" aria-label="关闭助手" @click="assistantStore.close">
            <X aria-hidden="true" />
          </button>
        </div>
      </header>

      <main
        ref="mainElement"
        v-loading="assistantStore.messageLoading"
        class="assistant-main"
        :class="{ 'assistant-main--expanded': assistantStore.isExpanded }"
        element-loading-text="加载对话"
      >
        <section v-if="!assistantStore.hasConversation" class="assistant-empty">
          <div class="assistant-section">
            <p class="section-kicker">我能帮您做</p>
            <button
              v-for="skill in skills"
              :key="skill.title"
              type="button"
              class="skill-card"
              :class="{ featured: skill.featured }"
              @click="fillInput(skill.prompt)"
            >
              <span class="skill-icon"><img :src="skill.icon" alt="" /></span>
              <span class="skill-copy">
                <strong>{{ skill.title }}</strong>
                <small>{{ skill.description }}</small>
              </span>
              <span v-if="skill.featured" class="skill-visual" aria-hidden="true">
                <img :src="skillBanner" alt="" />
              </span>
            </button>
          </div>

          <div class="assistant-section">
            <p class="section-kicker">您是否想问</p>
            <div class="question-list">
              <div v-if="assistantStore.contextLoading" class="question-state">
                <el-icon class="is-rotating"><Loading /></el-icon>
                <p>正在基于当前页面生成推荐问题...</p>
              </div>
              <div v-else class="question-item-stack">
                <button
                  v-for="question in suggestedQuestions"
                  :key="question"
                  type="button"
                  class="question-item"
                  @click="fillInput(question)"
                >
                  <span>{{ question }}</span>
                  <el-icon><ArrowRight /></el-icon>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section v-else class="assistant-conversation">
          <p class="message-time">{{ conversationTime }}</p>
          <div v-if="assistantStore.errorMessage" class="assistant-error" role="alert">
            {{ assistantStore.errorMessage }}
          </div>
          <div class="message-list">
            <div v-for="message in assistantStore.messages" :key="message.id" class="message-entry">
              <div class="message-row" :class="message.role">
                <div v-if="message.role === 'user'" class="message-bubble">{{ message.content }}</div>
                <div v-else class="assistant-message-block">
                  <div v-if="message.status === 'pending' && !message.content" class="assistant-message-pending">
                    <el-icon class="is-rotating"><Loading /></el-icon>
                    <span>正在思考</span>
                  </div>
                  <div
                    v-else
                    class="assistant-message-content"
                    :class="{ failed: message.status === 'failed' }"
                  >
                    <AiMarkdownContent :content="message.content" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer class="assistant-footer" :class="{ 'assistant-footer--expanded': assistantStore.isExpanded }">
        <div class="quick-actions">
          <button
            v-for="capability in capabilities"
            :key="capability.id"
            type="button"
            class="quick-action"
            :class="{ active: selectedCapabilityId === capability.id }"
            @click="selectCapability(capability.id)"
          >
            <component :is="capability.icon" aria-hidden="true" />
            {{ capability.label }}
          </button>
          <button class="quick-action icon-only" type="button" aria-label="新建对话" @click="assistantStore.newConversation">
            <el-icon><Plus /></el-icon>
          </button>
        </div>

        <div class="assistant-input-shell" :class="{ 'has-topic': activeCapability }">
          <div class="assistant-input-shell-inner">
            <div class="input-topic" :class="{ active: activeCapability }" :aria-hidden="!activeCapability">
              <span class="topic-chip">
                <span class="topic-mode">使用</span>
                <component v-if="activeCapability" :is="activeCapability.icon" aria-hidden="true" />
                <span>{{ activeCapability?.label }}</span>
              </span>
              <button type="button" aria-label="取消选择能力" @click="selectedCapabilityId = ''">
                <el-icon><Close /></el-icon>
              </button>
            </div>
            <div class="input-editor">
              <textarea
                ref="inputElement"
                v-model="inputText"
                class="assistant-input"
                rows="1"
                placeholder="您可以使用“产品+问题”描述问题～"
                aria-label="向 AI 运营助手提问"
                maxlength="10000"
                @input="resizeInput"
                :disabled="assistantStore.sending"
                @keydown.enter.exact="handleEnter"
              />
              <div class="input-actions">
                <button
                  type="button"
                  aria-label="发送问题"
                  :disabled="!inputText.trim() || assistantStore.sending"
                  @click="send"
                >
                  <Send aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div v-if="assistantStore.isExpanded" class="assistant-disclaimer assistant-disclaimer--split">
          <span>所有内容均由 AI 生成仅供参考</span><i /><span>重要信息请仔细核查</span>
        </div>
        <p v-else class="assistant-disclaimer">回复内容由 AI 生成，仅供参考</p>
      </footer>
    </section>
  </aside>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import {
  Bot,
  ChartNoAxesCombined,
  History,
  Lightbulb,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  Plus,
  Send,
  X,
} from "@lucide/vue";
import { ArrowRight, Close, Loading } from "@element-plus/icons-vue";
import assistantAvatar from "@/assets/ai-assistant/avatar.png";
import headerBackground from "@/assets/ai-assistant/header-bg.png";
import skillBanner from "@/assets/ai-assistant/skill-banner.png";
import skillEditIcon from "@/assets/ai-assistant/skill-edit-icon.svg";
import skillImagineIcon from "@/assets/ai-assistant/skill-imagine-icon.svg";
import AiHistorySessionItem from "@/features/ai-assistant/components/AiHistorySessionItem.vue";
import { collectAssistantPageContext } from "@/features/ai-assistant/page-context";
import { useAiAssistantStore } from "@/stores/ai-assistant";
import { useNavigationStore } from "@/stores/navigation";
import { useUserStore } from "@/stores/user";

const route = useRoute();
const loadAiMarkdownContent = () => import("@/features/ai-assistant/components/AiMarkdownContent.vue");
const AiMarkdownContent = defineAsyncComponent(loadAiMarkdownContent);
void loadAiMarkdownContent();
const assistantStore = useAiAssistantStore();
const navigationStore = useNavigationStore();
const userStore = useUserStore();
const { activeMenuTrail, activeModuleNode } = storeToRefs(navigationStore);
const { currentTenant, userInfo } = storeToRefs(userStore);
const inputText = ref("");
const selectedCapabilityId = ref("");
const inputElement = ref<HTMLTextAreaElement | null>(null);
const mainElement = ref<HTMLElement | null>(null);
let contextRequestId = 0;

const skills = [
  {
    title: "总结当前页面",
    description: "基于当前页面上下文提炼重点",
    prompt: "总结当前页面的重点信息",
    icon: skillImagineIcon,
    featured: true,
  },
  {
    title: "生成运营建议",
    description: "结合业务场景给出下一步操作",
    prompt: "根据当前页面生成下一步运营建议",
    icon: skillEditIcon,
    featured: false,
  },
];
const capabilities = [
  { id: "page-analysis", label: "页面分析", icon: ChartNoAxesCombined },
  { id: "operation-advice", label: "运营建议", icon: Lightbulb },
];
const activeCapability = computed(() =>
  capabilities.find((capability) => capability.id === selectedCapabilityId.value) ?? null,
);
const pageTitle = computed(() => assistantStore.pageContext?.page.title ?? "当前页面");
const suggestedQuestions = computed(() => [
  `总结“${pageTitle.value}”的重点信息`,
  "当前页面有哪些需要关注的异常？",
  "根据当前数据，下一步应该处理什么？",
  "当前页面的数据之间有什么关联？",
  "给出一份基于当前页面的运营建议",
]);
const historyGroups = computed(() => [{ key: "today", label: "今天", items: assistantStore.sessions }]);
const conversationTime = computed(() => assistantStore.activeSession
  ? new Date(assistantStore.activeSession.createdAt).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    })
  : "");

watch(
  () => [assistantStore.isOpen, route.fullPath, currentTenant.value.id, userInfo.value.id],
  ([isOpen]) => {
    if (!isOpen || !currentTenant.value.id || !userInfo.value.id) return;
    void assistantStore.initialize({
      tenantId: currentTenant.value.id,
      userId: userInfo.value.id,
    });
    void refreshPageContext();
  },
  { immediate: true },
);

watch(
  () => assistantStore.messages[assistantStore.messages.length - 1]?.content,
  () => void nextTick(() => {
    if (mainElement.value) mainElement.value.scrollTop = mainElement.value.scrollHeight;
  }),
);

async function refreshPageContext() {
  const requestId = ++contextRequestId;
  assistantStore.contextLoading = true;
  assistantStore.setPageContext(null);
  await nextTick();
  try {
    const context = await collectAssistantPageContext({
      route,
      tenant: currentTenant.value,
      moduleName: activeModuleNode.value?.name ?? "工作台",
      navigationTrail: activeMenuTrail.value.map((item) => item.name),
    });
    if (requestId === contextRequestId) assistantStore.setPageContext(context);
  } catch {
    if (requestId === contextRequestId) assistantStore.setPageContext(null);
  } finally {
    if (requestId === contextRequestId) assistantStore.contextLoading = false;
  }
}

function fillInput(value: string) {
  inputText.value = value;
  void nextTick(() => {
    resizeInput();
    inputElement.value?.focus();
  });
}

function selectCapability(capabilityId: string) {
  selectedCapabilityId.value = selectedCapabilityId.value === capabilityId ? "" : capabilityId;
}

async function send() {
  const message = inputText.value.trim();
  if (!message) return;
  inputText.value = "";
  resizeInput();
  const sent = await assistantStore.sendMessage(message, activeCapability.value?.label ?? null);
  if (!sent) inputText.value = message;
  void nextTick(() => mainElement.value?.scrollTo({ top: mainElement.value.scrollHeight }));
}

function handleEnter(event: KeyboardEvent) {
  if (event.isComposing) return;
  event.preventDefault();
  void send();
}

function resizeInput() {
  if (!inputElement.value) return;
  inputElement.value.style.height = "80px";
  inputElement.value.style.height = `${Math.min(180, Math.max(80, inputElement.value.scrollHeight))}px`;
}

onBeforeUnmount(() => {
  contextRequestId += 1;
  assistantStore.contextLoading = false;
  assistantStore.setPageContext(null);
});

</script>

<style scoped>
.ai-assistant {
  --assistant-content-max-width: 800px;
  display: flex;
  flex: 0 0 419px;
  flex-direction: column;
  width: 419px;
  height: 100%;
  overflow: hidden;
  background: var(--color-white);
  border-left: 1px solid var(--color-border);
}

.ai-assistant.expanded {
  position: absolute;
  inset: 0;
  z-index: 40;
  width: auto;
  flex: none;
  flex-direction: row;
  background: color-mix(in srgb, var(--color-bg-page) 84%, transparent);
  border-left: 0;
  backdrop-filter: blur(28px);
}

.assistant-history-rail {
  display: flex;
  width: 280px;
  min-width: 0;
  min-height: 0;
  padding: var(--spacing-16) var(--spacing-12) var(--spacing-12);
  flex: 0 0 280px;
  flex-direction: column;
}

.history-rail-header,
.assistant-header,
.assistant-title,
.assistant-tools,
.history-new-chat,
.history-plaza,
.quick-actions,
.quick-action,
.input-topic,
.topic-chip,
.input-actions {
  display: flex;
  align-items: center;
}

.history-rail-header {
  justify-content: space-between;
  min-height: 32px;
  margin-bottom: 18px;
}

.history-rail-title { flex: 1; }

.history-rail-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.history-rail-indicator svg,
.history-plaza svg { width: 16px; height: 16px; }

.history-new-chat {
  justify-content: center;
  gap: var(--spacing-6);
  height: 28px;
  margin-bottom: var(--spacing-12);
  color: var(--color-primary-dark-text);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  background: var(--color-primary-light);
  border: 0;
  border-radius: 6px;
  cursor: pointer;
}

.history-new-chat svg { width: 14px; height: 14px; }

.history-plaza {
  gap: var(--spacing-6);
  height: 32px;
  padding: 0 var(--spacing-10);
  font-size: var(--font-size-sm);
}

.history-rail-scroll {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  margin-top: var(--spacing-12);
  overflow-y: auto;
}

.history-loading,
.history-empty {
  display: flex;
  align-items: center;
  gap: var(--spacing-6);
  padding: var(--spacing-8);
  color: var(--color-secondary);
  font-size: var(--font-size-xs);
}

.history-group { margin-bottom: var(--spacing-16); }
.history-group-label { padding: 0 var(--spacing-4); color: var(--color-secondary); font-size: var(--font-size-xs); }
.history-group-list { display: flex; flex-direction: column; gap: var(--spacing-4); margin-top: var(--spacing-8); }

.assistant-workspace {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--color-white);
}

.assistant-workspace--expanded {
  border-radius: 12px 0 0 12px;
  box-shadow: 0 0 0 1px var(--color-border);
}
.assistant-workspace--solo { border-radius: 0; }

.assistant-header {
  position: relative;
  justify-content: space-between;
  height: 64px;
  padding: 0 var(--spacing-16);
  flex-shrink: 0;
  background-color: var(--color-white);
  background-position: center;
  background-repeat: no-repeat;
  background-size: 100% 100%;
}

.assistant-title {
  gap: var(--spacing-6);
  height: 32px;
  flex: 1;
  min-width: 0;
  color: var(--color-title);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
}

.assistant-avatar { width: 32px; height: 32px; flex-shrink: 0; border-radius: 50%; }
.assistant-header-spacer { flex: 1; }
.assistant-tools { gap: var(--spacing-8); height: 20px; flex-shrink: 0; }

.assistant-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  color: var(--color-body);
  background: transparent;
  border: 0;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.assistant-icon-btn svg { width: 16px; height: 16px; stroke-width: 1.8; }
.assistant-icon-btn:hover,
.assistant-icon-btn.active { color: var(--color-primary); background: var(--color-primary-light); }

.assistant-history-dropdown-panel { width: 240px; max-height: 304px; padding: var(--spacing-8) 0; overflow-y: auto; background: var(--color-white); box-shadow: var(--shadow-m); }
.assistant-history-dropdown-item { display: block; width: 100%; padding: 7px var(--spacing-20); overflow: hidden; color: var(--color-title); font: inherit; text-align: left; text-overflow: ellipsis; white-space: nowrap; background: var(--color-white); border: 0; cursor: pointer; }
.assistant-history-dropdown-item:hover,
.assistant-history-dropdown-item.active { background: var(--color-bg-muted); }
.assistant-history-dropdown-state { padding: var(--spacing-12) var(--spacing-16); color: var(--color-secondary); font-size: var(--font-size-xs); }
:global(.assistant-history-dropdown.el-popper) { padding: 0; border: 0; border-radius: var(--radius-md); box-shadow: var(--shadow-m); }
:global(.assistant-history-dropdown.el-popper .el-popper__arrow) { display: none; }

.assistant-main {
  flex: 1;
  min-height: 0;
  padding: 48px var(--spacing-8) var(--spacing-16);
  overflow-y: auto;
  background: var(--color-white);
}
.assistant-main--expanded { padding: 56px 0 var(--spacing-16); }

.assistant-empty { display: flex; align-items: center; flex-direction: column; gap: 40px; padding: 0 var(--spacing-20) var(--spacing-24); }
.assistant-main--expanded .assistant-empty { gap: 36px; padding-bottom: var(--spacing-32); }
.assistant-section { width: 100%; max-width: var(--assistant-content-max-width); }
.section-kicker { margin-bottom: var(--spacing-8); color: var(--color-body); font-size: var(--font-size-xs); }

.skill-card {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 66px;
  margin-bottom: var(--spacing-8);
  padding: 0 var(--spacing-20) 0 var(--spacing-16);
  overflow: hidden;
  text-align: left;
  background: var(--color-bg-muted);
  border: 1px solid transparent;
  border-radius: var(--radius-lg);
  cursor: pointer;
}

.skill-card.featured { background: linear-gradient(96deg, var(--color-white), var(--color-primary-light), var(--color-white)); }
.skill-card:hover { border-color: var(--color-primary-line-light); }
.skill-icon { display: inline-flex; width: 20px; height: 20px; margin-right: var(--spacing-14); flex: 0 0 20px; }
.skill-icon img { width: 100%; height: 100%; }
.skill-copy { position: relative; z-index: 1; display: flex; flex-direction: column; gap: var(--spacing-2); min-width: 0; }
.skill-copy strong { color: var(--color-title); font-size: var(--font-size-md); font-weight: var(--font-weight-semibold); }
.skill-copy small { color: var(--color-secondary); font-size: var(--font-size-xs); }
.skill-card.featured .skill-copy strong { color: var(--color-primary-dark-text); }
.skill-visual { position: absolute; right: var(--spacing-10); bottom: 0; display: inline-flex; align-items: flex-end; height: 100%; pointer-events: none; }
.skill-visual img { width: 132px; }

.question-list { display: flex; flex-direction: column; gap: var(--spacing-12); width: 100%; min-height: 116px; padding: 21px var(--spacing-16); background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
.question-item-stack { display: flex; flex-direction: column; gap: var(--spacing-12); }
.question-item { display: flex; align-items: center; justify-content: space-between; width: 100%; height: 21px; padding: 0; color: var(--color-title); font-size: var(--font-size-md); font-weight: var(--font-weight-semibold); text-align: left; background: transparent; border: 0; cursor: pointer; }
.question-item span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.question-item .el-icon { width: 12px; color: var(--color-secondary); }
.question-item:hover { color: var(--color-primary); }
.question-state { display: flex; flex: 1; flex-direction: column; align-items: center; justify-content: center; gap: var(--spacing-12); color: var(--color-secondary); font-size: var(--font-size-xs); text-align: center; }

.assistant-conversation { width: 100%; max-width: var(--assistant-content-max-width); margin: 0 auto; padding: 0 var(--spacing-8) var(--spacing-24); }
.message-time { margin-bottom: var(--spacing-16); color: var(--color-secondary); font-size: var(--font-size-xs); text-align: center; }
.message-row { display: flex; width: 100%; }
.message-row.user { justify-content: flex-end; padding: 0 var(--spacing-6) var(--spacing-16) var(--spacing-32); }
.message-row.assistant { justify-content: flex-start; padding: 0 var(--spacing-32) var(--spacing-16) 0; }
.message-bubble { max-width: 260px; padding: var(--spacing-12) var(--spacing-16); color: var(--color-title); font-size: var(--font-size-sm); line-height: var(--line-height-md); background: var(--color-primary-light); border-radius: var(--radius-lg) 0 var(--radius-lg) var(--radius-lg); }
.assistant-message-block { max-width: min(100%, 520px); }
.assistant-message-content { position: relative; color: var(--color-title); }
.assistant-message-content.failed { color: var(--color-error-dark-text); }
.assistant-message-pending { display: inline-flex; align-items: center; gap: var(--spacing-6); color: var(--color-secondary); font-size: var(--font-size-sm); }
.assistant-error { margin-bottom: var(--spacing-12); padding: var(--spacing-8) var(--spacing-12); color: var(--color-error-dark-text); font-size: var(--font-size-xs); background: var(--color-error-light); border-radius: var(--radius-md); }

.assistant-footer { display: flex; align-items: center; flex-direction: column; width: 100%; padding: 0 var(--spacing-20) var(--spacing-12); flex-shrink: 0; background: var(--color-white); }
.quick-actions { gap: var(--spacing-8); width: 100%; max-width: var(--assistant-content-max-width); height: 52px; }
.quick-action { justify-content: center; gap: var(--spacing-4); height: 28px; padding: 0 9px; color: var(--color-body); font-size: var(--font-size-sm); background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-md); cursor: pointer; }
.quick-action:hover,
.quick-action.active { color: var(--color-primary); background: var(--color-primary-light); border-color: var(--color-primary-line); }
.quick-action.icon-only { width: 28px; padding: 0; margin-left: auto; opacity: 0.7; }
.quick-action > svg,
.topic-chip > svg { width: 14px; height: 14px; flex: 0 0 14px; stroke-width: 1.8; }

.assistant-input-shell { width: 100%; max-width: var(--assistant-content-max-width); padding: 2px; overflow: hidden; background: linear-gradient(33deg, var(--color-primary-line), var(--color-primary), var(--color-primary-hover)); border-radius: var(--radius-lg); transition: box-shadow 280ms ease; }
.assistant-input-shell.has-topic { box-shadow: 0 8px 20px color-mix(in srgb, var(--color-primary) 12%, transparent); }
.assistant-input-shell-inner,
.input-editor { display: flex; flex-direction: column; }
.input-topic { justify-content: space-between; height: 0; padding: 0 var(--spacing-4); overflow: hidden; color: var(--color-white); opacity: 0; visibility: hidden; transition: opacity 220ms ease, height 320ms ease, padding 320ms ease; }
.input-topic.active { height: 32px; padding: var(--spacing-4); opacity: 1; visibility: visible; }
.topic-chip { gap: var(--spacing-4); font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); }
.topic-mode { padding: 0 var(--spacing-6); font-size: 11px; font-weight: var(--font-weight-medium); background: color-mix(in srgb, var(--color-white) 18%, transparent); border-radius: var(--radius-full); }
.input-topic button { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; padding: 0; color: var(--color-white); background: transparent; border: 0; cursor: pointer; }
.input-editor { overflow: hidden; background: var(--color-white); border-radius: 6px; }
.assistant-input { display: block; width: 100%; min-height: 80px; height: 80px; max-height: 180px; padding: var(--spacing-10) var(--spacing-12); overflow: hidden; color: var(--color-title); font-family: inherit; font-size: var(--font-size-xs); line-height: var(--line-height-xs); resize: none; background: var(--color-white); border: 0; outline: 0; }
.assistant-input::placeholder { color: var(--color-secondary); }
.input-actions { justify-content: flex-end; padding: 0 var(--spacing-8) var(--spacing-8); }
.input-actions button { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; padding: 0; color: var(--color-primary); background: transparent; border: 0; cursor: pointer; }
.input-actions button svg { width: 16px; height: 16px; stroke-width: 1.8; }
.input-actions button:disabled { color: var(--color-placeholder); cursor: not-allowed; }
.assistant-disclaimer { margin-top: var(--spacing-12); color: var(--color-secondary); font-size: var(--font-size-xs); line-height: 12px; }
.assistant-disclaimer--split { display: inline-flex; align-items: center; gap: var(--spacing-10); }
.assistant-disclaimer--split i { width: 1px; height: 10px; background: var(--color-border-deep); }

.is-rotating { animation: assistant-loading 1s linear infinite; }
@keyframes assistant-loading { to { transform: rotate(360deg); } }

@media (max-width: 1100px) {
  .ai-assistant:not(.expanded) { width: min(419px, 42vw); flex-basis: min(419px, 42vw); }
  .assistant-history-rail { width: 240px; flex-basis: 240px; }
}

@media (max-width: 767px) {
  .ai-assistant:not(.expanded) { width: 100vw; flex-basis: 100vw; }
  .ai-assistant.expanded { width: 100%; }
  .ai-assistant.expanded .assistant-history-rail { display: none; }
  .assistant-main { padding-top: var(--spacing-24); }
  .assistant-empty { gap: var(--spacing-24); padding-inline: var(--spacing-16); }
  .assistant-footer { padding-inline: var(--spacing-16); }
  .assistant-history-rail { width: 220px; flex-basis: 220px; padding-inline: var(--spacing-10); }
}

@media (prefers-reduced-motion: reduce) {
  .is-rotating { animation: none; }
}
</style>
