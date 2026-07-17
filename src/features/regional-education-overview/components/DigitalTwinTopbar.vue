<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import brandMark from "@/assets/figma/regional-education-overview/brand-mark.svg";
import chevronBottomIcon from "@/assets/figma/regional-education-overview/chevron-bottom.svg";
import thermostatIcon from "@/assets/figma/regional-education-overview/thermostat.svg";
import userOutlineIcon from "@/assets/figma/regional-education-overview/user-outline.svg";
import weatherCloudIcon from "@/assets/figma/regional-education-overview/weather-cloud.svg";
import type { DigitalTwinMapTheme } from "../map-themes";
import MapThemeSwitcher from "./MapThemeSwitcher.vue";

interface UserRoleOption {
  id: string;
  name: string;
}

const props = defineProps<{
  tenantName: string;
  userName: string;
  activeRoleId?: string;
  roles: readonly UserRoleOption[];
  formattedDate: string;
  formattedTime: string;
  themes: readonly DigitalTwinMapTheme[];
  activeThemeId: DigitalTwinMapTheme["id"];
}>();

const emit = defineEmits<{
  themeSelect: [themeId: DigitalTwinMapTheme["id"]];
  roleSelect: [roleId: string];
  changePassword: [];
  signOut: [];
  exit: [];
}>();

const userMenuRoot = ref<HTMLElement>();
const userMenuOpen = ref(false);

const productName = computed(() => {
  const districtName = props.tenantName.replace(/教育局$/, "");
  return `${districtName}智慧教育生态服务平台`;
});

const primaryNavigation = [
  "区域态势",
  "学业质量",
  "教师发展",
  "学生画像",
  "办学条件",
  "教育效能",
] as const;

function toggleUserMenu() {
  userMenuOpen.value = !userMenuOpen.value;
}

function selectRole(roleId: string) {
  userMenuOpen.value = false;
  emit("roleSelect", roleId);
}

function exitPage() {
  userMenuOpen.value = false;
  emit("exit");
}

function emitUserAction(action: "changePassword" | "signOut") {
  userMenuOpen.value = false;
  if (action === "changePassword") emit("changePassword");
  else emit("signOut");
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!userMenuRoot.value?.contains(event.target as Node)) userMenuOpen.value = false;
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") userMenuOpen.value = false;
}

onMounted(() => {
  document.addEventListener("pointerdown", handleDocumentPointerDown);
  document.addEventListener("keydown", handleDocumentKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", handleDocumentPointerDown);
  document.removeEventListener("keydown", handleDocumentKeydown);
});
</script>

<template>
  <header class="page-topbar">
    <div class="brand-lockup">
      <img :src="brandMark" alt="" aria-hidden="true">
      <strong>{{ productName }}</strong>
    </div>

    <nav class="primary-navigation" aria-label="驾驶舱主导航">
      <button
        v-for="(item, index) in primaryNavigation"
        :key="item"
        type="button"
        :class="{ 'is-active': index === 0 }"
        :aria-current="index === 0 ? 'page' : undefined"
        :disabled="index !== 0"
      >
        {{ item }}
      </button>
    </nav>

    <div class="system-context">
      <MapThemeSwitcher
        :themes="themes"
        :active-theme-id="activeThemeId"
        @select="emit('themeSelect', $event)"
      />
      <span class="environment-item weather-item">
        <img :src="weatherCloudIcon" alt="" aria-hidden="true">
        多云
      </span>
      <span class="environment-item weather-item">
        <img :src="thermostatIcon" alt="" aria-hidden="true">
        23℃
      </span>
      <i class="context-divider" aria-hidden="true" />
      <time :datetime="`${formattedDate}T${formattedTime}`">{{ formattedDate }} {{ formattedTime }}</time>
      <div ref="userMenuRoot" class="user-menu-root">
        <button
          type="button"
          class="environment-item user-item"
          :aria-label="`用户 ${userName}`"
          aria-haspopup="menu"
          :aria-expanded="userMenuOpen"
          @click="toggleUserMenu"
        >
          <img :src="userOutlineIcon" alt="" aria-hidden="true">
          <span>{{ userName }}</span>
          <img
            class="user-chevron"
            :class="{ 'is-open': userMenuOpen }"
            :src="chevronBottomIcon"
            alt=""
            aria-hidden="true"
          >
        </button>

        <div v-if="userMenuOpen" class="user-menu" role="menu" aria-label="用户与角色">
          <p>当前角色</p>
          <button
            v-for="role in roles"
            :key="role.id"
            type="button"
            role="menuitemradio"
            :aria-checked="role.id === activeRoleId"
            :class="{ 'is-active': role.id === activeRoleId }"
            @click="selectRole(role.id)"
          >
            <i aria-hidden="true" />
            {{ role.name }}
          </button>
          <div class="user-menu-divider" aria-hidden="true" />
          <button type="button" role="menuitem" @click="emitUserAction('changePassword')">
            修改密码
          </button>
          <button type="button" role="menuitem" @click="emitUserAction('signOut')">
            退出登录
          </button>
          <button type="button" role="menuitem" class="exit-action" @click="exitPage">
            退出大屏
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.page-topbar {
  position: relative;
  z-index: var(--dt-z-hud);
  display: grid;
  width: 100%;
  height: var(--dt-topbar-height);
  grid-template-columns: minmax(360px, 1fr) auto minmax(500px, 1fr);
  border-bottom: var(--dt-border-width) solid var(--dt-color-line);
  padding: 0 var(--dt-screen-gutter);
  background: var(--dt-color-panel);
  backdrop-filter: blur(var(--dt-panel-blur));
  align-items: center;
}

.brand-lockup {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--dt-space-2);
}

.brand-lockup img {
  width: var(--dt-icon-size-md);
  height: var(--dt-icon-size-md);
  flex: 0 0 var(--dt-icon-size-md);
}

.brand-lockup strong {
  overflow: hidden;
  color: var(--dt-color-text);
  font-size: var(--dt-font-size-md);
  line-height: var(--dt-line-height-md);
  font-weight: var(--dt-font-weight-regular);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.primary-navigation {
  display: grid;
  height: 100%;
  grid-template-columns: repeat(6, 112px);
  transform: translateX(-56px);
}

.primary-navigation button {
  position: relative;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--dt-color-text-muted);
  font-size: var(--dt-font-size-sm);
  line-height: var(--dt-line-height-sm);
  font-weight: var(--dt-font-weight-light);
}

.primary-navigation button:disabled {
  cursor: default;
}

.primary-navigation button.is-active {
  color: var(--dt-color-text);
}

.primary-navigation button.is-active::after {
  position: absolute;
  right: 44px;
  bottom: -1px;
  left: 44px;
  height: 2px;
  background: var(--dt-color-accent);
  content: "";
}

.system-context {
  display: flex;
  min-width: 0;
  justify-content: flex-end;
  color: var(--dt-color-text-secondary);
  font-size: var(--dt-font-size-sm);
  line-height: var(--dt-line-height-sm);
  align-items: center;
  gap: var(--dt-space-4);
}

.environment-item {
  display: flex;
  align-items: center;
  gap: var(--dt-space-2);
  white-space: nowrap;
}

button.environment-item {
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.environment-item img {
  width: var(--dt-icon-size-md);
  height: var(--dt-icon-size-md);
}

.user-item .user-chevron {
  width: var(--dt-icon-size-xs);
  height: var(--dt-icon-size-xs);
  transition: transform var(--dt-transition-fast);
}

.user-item .user-chevron.is-open {
  transform: rotate(180deg);
}

.user-item:focus-visible {
  border-radius: var(--dt-radius-xs);
  outline: var(--dt-border-width) solid var(--dt-color-accent);
  outline-offset: var(--dt-space-1);
}

.user-menu-root {
  position: relative;
  flex: 0 0 auto;
}

.user-menu {
  position: absolute;
  z-index: calc(var(--dt-z-hud) + 2);
  top: calc(100% + var(--dt-space-4));
  right: 0;
  display: grid;
  width: 168px;
  border: var(--dt-border-width) solid var(--dt-color-line);
  border-radius: var(--dt-radius-xs);
  padding: var(--dt-space-2);
  background: var(--dt-color-panel);
  box-shadow: var(--dt-panel-shadow);
  backdrop-filter: blur(var(--dt-panel-blur));
}

.user-menu p {
  margin: 0;
  padding: var(--dt-space-2) var(--dt-space-3);
  color: var(--dt-color-text-muted);
  font-size: var(--dt-font-size-xs);
}

.user-menu button {
  display: flex;
  min-height: 34px;
  border: 0;
  border-radius: var(--dt-radius-xs);
  padding: 0 var(--dt-space-3);
  background: transparent;
  color: var(--dt-color-text-secondary);
  font: inherit;
  text-align: left;
  cursor: pointer;
  align-items: center;
  gap: var(--dt-space-2);
}

.user-menu button:hover,
.user-menu button:focus-visible,
.user-menu button.is-active {
  background: var(--dt-color-accent-soft);
  color: var(--dt-color-text-strong);
  outline: 0;
}

.user-menu button i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: transparent;
  flex: 0 0 6px;
}

.user-menu button.is-active i {
  background: var(--dt-color-accent);
  box-shadow: 0 0 var(--dt-space-2) var(--dt-color-accent);
}

.user-menu-divider {
  height: var(--dt-border-width);
  margin: var(--dt-space-2) var(--dt-space-3);
  background: var(--dt-color-line);
}

.user-menu .exit-action {
  color: var(--dt-color-text-secondary);
}

.context-divider {
  width: 1px;
  height: var(--dt-icon-size-md);
  background: var(--dt-color-line);
}

.system-context time {
  width: 138px;
  flex: 0 0 138px;
  color: var(--dt-color-text-secondary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

@media (max-width: 1540px) {
  .page-topbar { grid-template-columns: minmax(300px, 1fr) auto minmax(390px, 1fr); }
  .primary-navigation { grid-template-columns: repeat(6, 88px); }
  .primary-navigation button.is-active::after { right: 32px; left: 32px; }
  .system-context { gap: var(--dt-space-3); }
}

@media (max-width: 1420px) {
  .weather-item { display: none; }
}

@media (max-width: 1260px) {
  .page-topbar { grid-template-columns: 310px 1fr auto; }
  .primary-navigation { grid-template-columns: repeat(3, 96px); transform: none; }
  .primary-navigation button:nth-child(n + 4) { display: none; }
}
</style>
