<script setup lang="ts">
import { gsap } from "gsap";
import { onBeforeUnmount, onMounted, ref } from "vue";
import type { StyleValue } from "vue";
import ChangePasswordDialog from "@/components/ChangePasswordDialog.vue";
import AiDataAssistantEntry from "@/features/digital-twin/components/AiDataAssistantEntry.vue";
import DigitalTwinTopbar from "@/features/digital-twin/components/DigitalTwinTopbar.vue";
import { digitalTwinMotion } from "@/features/digital-twin/motion";
import type {
  DigitalTwinMapTheme,
  DigitalTwinMapThemeId,
} from "@/features/digital-twin/map-themes";
import "@/styles/digital-twin-design-system.css";

withDefaults(defineProps<{
  tenantName: string;
  userName: string;
  activeRoleId?: string;
  roles: readonly { id: string; name: string }[];
  formattedDate: string;
  formattedTime: string;
  themes: readonly DigitalTwinMapTheme[];
  activeThemeId: DigitalTwinMapThemeId;
  themeStyle: StyleValue;
  productTitle?: string;
  variant?: "regional-education" | "smart-sports";
  hasNavigation?: boolean;
  busy?: boolean;
}>(), {
  productTitle: "",
  variant: "regional-education",
  hasNavigation: false,
  busy: false,
});

const emit = defineEmits<{
  themeSelect: [themeId: DigitalTwinMapThemeId];
  roleSelect: [roleId: string];
  signOut: [];
  exit: [];
}>();

const passwordDialogVisible = defineModel<boolean>("passwordDialogVisible", { required: true });
const pageRoot = ref<HTMLElement>();
let entranceMedia: ReturnType<typeof gsap.matchMedia> | undefined;

onMounted(() => {
  if (!pageRoot.value || typeof window.matchMedia !== "function") return;
  entranceMedia = gsap.matchMedia();
  entranceMedia.add(
    {
      allowMotion: "(prefers-reduced-motion: no-preference)",
      reduceMotion: "(prefers-reduced-motion: reduce)",
    },
    (context) => {
      if (context.conditions?.reduceMotion || !pageRoot.value) return;
      const targets = Array.from(pageRoot.value.querySelectorAll<HTMLElement>([
        ".page-topbar",
        ".left-panel",
        ".spatial-trail",
        ".right-panel",
        ".sports-summary",
        ".sports-ranking",
        ".sports-goal-card",
        ".sports-trend-card",
        ".map-camera-control",
        ".bottom-navigation",
      ].join(",")));
      const entranceTween = gsap.from(targets, {
        autoAlpha: 0,
        x: (_, target) => {
          if (target.matches(".left-panel, .map-camera-control")) return -24;
          if (target.matches(".right-panel, .spatial-trail, .sports-ranking")) return 24;
          if (target.matches(".sports-summary")) return -24;
          return 0;
        },
        y: (_, target) => {
          if (target.matches(".page-topbar")) return -16;
          if (target.matches(".bottom-navigation, .sports-goal-card, .sports-trend-card")) {
            return 18;
          }
          return 0;
        },
        duration: digitalTwinMotion.entranceDuration,
        stagger: digitalTwinMotion.entranceStagger,
        ease: digitalTwinMotion.entranceEase,
        clearProps: "transform,opacity,visibility",
      });
      return () => entranceTween.kill();
    },
    pageRoot.value,
  );
});

onBeforeUnmount(() => {
  entranceMedia?.revert();
});
</script>

<template>
  <main
    ref="pageRoot"
    class="digital-twin-shell regional-digital-twin"
    :class="{ 'smart-sports-dashboard': variant === 'smart-sports' }"
    :style="themeStyle"
  >
    <div class="dashboard-viewport" :aria-busy="busy">
      <slot />
    </div>

    <DigitalTwinTopbar
      :tenant-name="tenantName"
      :user-name="userName"
      :active-role-id="activeRoleId"
      :roles="roles"
      :formatted-date="formattedDate"
      :formatted-time="formattedTime"
      :themes="themes"
      :active-theme-id="activeThemeId"
      :has-navigation="hasNavigation"
      :variant="variant"
      :product-title="productTitle"
      @theme-select="emit('themeSelect', $event)"
      @role-select="emit('roleSelect', $event)"
      @change-password="passwordDialogVisible = true"
      @sign-out="emit('signOut')"
      @exit="emit('exit')"
    >
      <template v-if="hasNavigation" #navigation>
        <slot name="navigation" />
      </template>
    </DigitalTwinTopbar>

    <ChangePasswordDialog v-model="passwordDialogVisible" />
    <AiDataAssistantEntry />
    <slot name="footer" />
  </main>
</template>

<style scoped>
.digital-twin-shell {
  position: relative;
  width: 100vw;
  height: 100vh;
  min-width: var(--dt-min-viewport-width);
  min-height: var(--dt-min-viewport-height);
  overflow: hidden;
  color: var(--dt-color-text);
  background: var(--page-background);
  font-family: var(--dt-font-family);
  font-weight: var(--dt-font-weight-light);
  transition: color var(--dt-transition-theme), background var(--dt-transition-theme);
}

.smart-sports-dashboard {
  --dt-map-control-bottom: calc(160px + var(--dt-space-8) + var(--dt-space-4));
  --dt-ai-entry-bottom: calc(160px + var(--dt-space-8) + var(--dt-space-4));
  --dt-ai-entry-right: calc(
    var(--dt-right-panel-width) + var(--dt-right-panel-right) + var(--dt-space-6)
  );
}

.dashboard-viewport {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
</style>
