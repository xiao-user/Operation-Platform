<template>
  <div class="assistant-markdown" v-html="renderedContent" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import "katex/dist/katex.min.css";
import "@/features/ai-assistant/styles/vue-markdown.css";
import { renderAssistantMarkdown } from "@/features/ai-assistant/markdown";

const properties = defineProps<{ content: string }>();
const renderedContent = computed(() => renderAssistantMarkdown(properties.content));
</script>
