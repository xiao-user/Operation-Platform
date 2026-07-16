<script setup lang="ts">
import { gsap } from "gsap";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import chevronBottomIcon from "@/assets/figma/regional-education-overview/chevron-bottom.svg";
import entityEmblemDecoration from "@/assets/figma/regional-education-overview/entity-emblem-decoration.svg";
import { educationLocationTypeMeta } from "../education-locations";
import type { EducationLocation } from "../types";
import AnimatedNumber from "./AnimatedNumber.vue";

const props = defineProps<{
  location?: EducationLocation;
  scopeName: string;
  formattedDate: string;
  locations: readonly EducationLocation[];
}>();

const emit = defineEmits<{
  locationSelect: [location: EducationLocation];
  schoolNavigate: [location: EducationLocation];
}>();

const selectedTypeMeta = computed(() => props.location
  ? educationLocationTypeMeta[props.location.type]
  : undefined);
const sourceLabel = computed(() => props.location?.source === "OpenStreetMap"
  ? "OpenStreetMap"
  : "公开地址近似");
const entityCode = computed(() => props.location?.sourceId
  ? `OSM-${props.location.sourceId.padStart(4, "0")}`
  : props.location?.id ?? "--");
const entityKindLabel = computed(() => props.location?.type === "bureau" ? "管理机构" : "学校");
const entityUnit = computed(() => props.location?.type === "bureau" ? "个" : "所");
const notificationTarget = computed(() => props.location?.type === "bureau"
  ? `${props.scopeName}全部学校`
  : props.location?.name ?? props.scopeName);
const activeProfileTab = ref<"collaboration" | "school-notice">("collaboration");
const profileRoot = ref<HTMLElement>();
let profileAnimationContext: gsap.Context | undefined;
const collaborationNotices = computed(() => [
  {
    id: "material-submission",
    title: "材料报送提醒",
    content: `${props.scopeName}本周材料报送窗口已开放，请按教育局协同办公要求核对附件与联系人信息。`,
  },
  {
    id: "contact-maintenance",
    title: "协同联系人维护",
    content: `请核对${props.location?.name ?? props.scopeName}的协同联系人与值班信息，确保教育局通知能够及时送达。`,
  },
  {
    id: "workflow-status",
    title: "流程处理说明",
    content: "协同事项提交后将进入教育局审核流程，处理状态与退回意见可在协同办公服务中持续查看。",
  },
]);
const schoolNotices = computed(() => [
  {
    id: "school-profile",
    title: "学校基础信息核验",
    content: `请核对${notificationTarget.value}的机构名称、办学类型、所属镇街与服务联系人，发现差异后通过学校服务入口反馈。`,
  },
  {
    id: "map-calibration",
    title: "地图点位校准通知",
    content: `当前点位来源为${sourceLabel.value}，正式业务使用前需结合教育局权威台账完成坐标与隶属关系校准。`,
  },
  {
    id: "service-activation",
    title: "学校服务接入提醒",
    content: `${notificationTarget.value}可通过平台接收教育局通知、提交材料并反馈校务服务问题。`,
  },
]);
const visibleSchools = computed(() => props.locations.filter((location) => location.type !== "bureau"));
const schoolScroller = ref<HTMLElement>();
const schoolScrollInterval = 4_000;
const schoolScrollPauseReasons = new Set<string>();
let schoolScrollTimer: number | undefined;
let motionQuery: MediaQueryList | undefined;

function stopSchoolRotation() {
  if (schoolScrollTimer !== undefined) window.clearInterval(schoolScrollTimer);
  schoolScrollTimer = undefined;
}

function scrollToNextSchool() {
  const scroller = schoolScroller.value;
  if (!scroller || scroller.scrollHeight <= scroller.clientHeight + 1) return;
  const rows = Array.from(scroller.querySelectorAll<HTMLElement>(".school-list-item"));
  if (rows.length < 2) return;
  const nextIndex = rows.findIndex((row) => row.offsetTop > scroller.scrollTop + 2);
  scroller.scrollTo({
    top: nextIndex < 0 ? 0 : rows[nextIndex]?.offsetTop ?? 0,
    behavior: "smooth",
  });
}

function startSchoolRotation() {
  stopSchoolRotation();
  if (
    motionQuery?.matches
    || schoolScrollPauseReasons.size > 0
    || visibleSchools.value.length < 2
  ) return;
  schoolScrollTimer = window.setInterval(scrollToNextSchool, schoolScrollInterval);
}

function pauseSchoolRotation(reason: string) {
  schoolScrollPauseReasons.add(reason);
  stopSchoolRotation();
}

function resumeSchoolRotation(reason: string) {
  schoolScrollPauseReasons.delete(reason);
  startSchoolRotation();
}

function handleMotionPreferenceChange() {
  startSchoolRotation();
}

function selectSchool(school: EducationLocation) {
  emit("locationSelect", school);
  emit("schoolNavigate", school);
}

function stopAccordionAnimations() {
  const root = profileRoot.value;
  if (!root) return;
  const targets = root.querySelectorAll<HTMLElement>(
    ".accordion-content, .accordion-list summary img",
  );
  gsap.killTweensOf(targets);
}

function toggleAccordion(event: MouseEvent) {
  const summary = event.currentTarget as HTMLElement;
  const details = summary.closest("details");
  const content = details?.querySelector<HTMLElement>(".accordion-content");
  const icon = summary.querySelector<HTMLImageElement>("img");
  if (!details || !content || !icon) return;

  const shouldOpen = !details.open;
  gsap.killTweensOf([content, icon]);

  if (motionQuery?.matches) {
    details.open = shouldOpen;
    gsap.set(content, { clearProps: "height,overflow,opacity,visibility" });
    gsap.set(icon, { rotation: shouldOpen ? 180 : 0 });
    return;
  }

  profileAnimationContext?.add(() => {
    gsap.to(icon, {
      rotation: shouldOpen ? 180 : 0,
      duration: 0.22,
      ease: "power2.out",
      overwrite: true,
    });

    if (shouldOpen) {
      details.open = true;
      const expandedHeight = content.scrollHeight;
      gsap.fromTo(
        content,
        { height: 0, autoAlpha: 0, overflow: "hidden" },
        {
          height: expandedHeight,
          autoAlpha: 1,
          duration: 0.28,
          ease: "power3.out",
          overwrite: true,
          onComplete: () => {
            gsap.set(content, { clearProps: "height,overflow,opacity,visibility" });
          },
        },
      );
      return;
    }

    gsap.set(content, { height: content.getBoundingClientRect().height, overflow: "hidden" });
    gsap.to(content, {
      height: 0,
      autoAlpha: 0,
      duration: 0.24,
      ease: "power2.inOut",
      overwrite: true,
      onComplete: () => {
        details.open = false;
        gsap.set(content, { clearProps: "height,overflow,opacity,visibility" });
      },
    });
  });
}

watch(
  () => [props.scopeName, visibleSchools.value.map((school) => school.id).join("|")],
  async () => {
    await nextTick();
    schoolScroller.value?.scrollTo({ top: 0, behavior: "auto" });
    startSchoolRotation();
  },
  { flush: "post" },
);

watch(
  () => props.location?.id,
  async (locationId) => {
    if (!locationId) return;
    await nextTick();
    const scroller = schoolScroller.value;
    const activeRow = Array.from(
      scroller?.querySelectorAll<HTMLElement>(".school-list-item") ?? [],
    ).find((row) => row.dataset.schoolId === locationId);
    if (!scroller || !activeRow) return;
    const rowTop = activeRow.offsetTop;
    const rowBottom = rowTop + activeRow.offsetHeight;
    if (rowTop < scroller.scrollTop || rowBottom > scroller.scrollTop + scroller.clientHeight) {
      scroller.scrollTo({ top: rowTop, behavior: motionQuery?.matches ? "auto" : "smooth" });
    }
  },
  { flush: "post" },
);

watch(activeProfileTab, stopAccordionAnimations, { flush: "sync" });

onMounted(() => {
  motionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  motionQuery?.addEventListener("change", handleMotionPreferenceChange);
  if (profileRoot.value) {
    profileAnimationContext = gsap.context(() => undefined, profileRoot.value);
  }
  startSchoolRotation();
});

onBeforeUnmount(() => {
  stopSchoolRotation();
  stopAccordionAnimations();
  profileAnimationContext?.revert();
  motionQuery?.removeEventListener("change", handleMotionPreferenceChange);
});
</script>

<template>
  <div ref="profileRoot" class="right-hud">
    <section class="spatial-trail" aria-label="当前范围学校">
      <header class="school-list-header">
        <div><strong>{{ scopeName }}</strong><span>学校定位</span></div>
        <span><AnimatedNumber :value="visibleSchools.length" /> 所</span>
      </header>
      <div
        ref="schoolScroller"
        class="school-list"
        tabindex="0"
        aria-label="学校列表，可滚动浏览并选择学校"
        @pointerenter="pauseSchoolRotation('pointer')"
        @pointerleave="resumeSchoolRotation('pointer')"
        @focusin="pauseSchoolRotation('focus')"
        @focusout="resumeSchoolRotation('focus')"
      >
        <button
          v-for="school in visibleSchools"
          :key="school.id"
          type="button"
          class="school-list-item"
          :class="{ 'is-active': school.id === location?.id }"
          :data-school-id="school.id"
          :aria-label="`切换至${school.name}`"
          :aria-current="school.id === location?.id ? 'true' : undefined"
          @click="selectSchool(school)"
        >
          <span>{{ school.name }}</span>
          <small>{{ educationLocationTypeMeta[school.type].label }}</small>
        </button>
        <p v-if="visibleSchools.length === 0" class="school-list-empty">当前范围暂无学校点位</p>
      </div>
    </section>

    <aside class="right-panel" aria-label="当前教育机构详情">
      <template v-if="location && selectedTypeMeta">
        <div class="profile-content">
          <h2>{{ location.name }}</h2>

          <div class="profile-meta">
            <dl>
              <div><dt>所属区域</dt><dd>{{ scopeName }}</dd></div>
              <div><dt>机构类型</dt><dd>{{ selectedTypeMeta.label }}</dd></div>
            </dl>
            <div class="entity-emblem" aria-hidden="true">
              <img :src="entityEmblemDecoration" alt="">
              <span>{{ selectedTypeMeta.shortLabel }}</span>
            </div>
          </div>

          <div class="entity-metric">
            <strong><AnimatedNumber :value="1" /></strong><span>{{ entityUnit }}</span><p>已接入{{ entityKindLabel }}</p>
          </div>

          <div class="profile-tabs" role="tablist" aria-label="机构详情分类">
            <button
              type="button"
              :class="{ 'is-active': activeProfileTab === 'collaboration' }"
              role="tab"
              :aria-selected="activeProfileTab === 'collaboration'"
              aria-controls="collaboration-panel"
              @click="activeProfileTab = 'collaboration'"
            >协同办公</button>
            <button
              type="button"
              :class="{ 'is-active': activeProfileTab === 'school-notice' }"
              role="tab"
              :aria-selected="activeProfileTab === 'school-notice'"
              aria-controls="school-notice-panel"
              @click="activeProfileTab = 'school-notice'"
            >通知信息</button>
          </div>

          <section
            v-if="activeProfileTab === 'collaboration'"
            id="collaboration-panel"
            class="detail-card"
            role="tabpanel"
            aria-label="协同办公"
          >
            <dl class="detail-grid">
              <div><dt>协同主体</dt><dd>{{ location.name }}</dd></div>
              <div><dt>机构编码</dt><dd>{{ entityCode }}</dd></div>
              <div><dt>所属区域</dt><dd>{{ scopeName }}</dd></div>
              <div><dt>接入状态</dt><dd><mark>在线</mark></dd></div>
            </dl>

            <dl class="detail-grid secondary-grid">
              <div><dt>材料报送</dt><dd>已开放</dd></div>
              <div><dt>流程审核</dt><dd>教育局审核</dd></div>
              <div><dt>消息接收</dt><dd>正常</dd></div>
              <div><dt>数据更新</dt><dd>{{ formattedDate }}</dd></div>
            </dl>

            <div class="accordion-list">
              <details
                v-for="(notice, index) in collaborationNotices"
                :key="notice.id"
                :open="index === 0"
              >
                <summary @click.prevent="toggleAccordion">{{ notice.title }}<img :src="chevronBottomIcon" alt="" aria-hidden="true"></summary>
                <div class="accordion-content"><p>{{ notice.content }}</p></div>
              </details>
            </div>
          </section>

          <section
            v-else
            id="school-notice-panel"
            class="detail-card"
            role="tabpanel"
            aria-label="通知信息"
          >
            <dl class="detail-grid">
              <div><dt>通知对象</dt><dd>{{ notificationTarget }}</dd></div>
              <div><dt>通知类型</dt><dd>学校服务</dd></div>
              <div><dt>所属区域</dt><dd>{{ scopeName }}</dd></div>
              <div><dt>发布状态</dt><dd><mark>可发送</mark></dd></div>
            </dl>

            <dl class="detail-grid secondary-grid">
              <div><dt>发送渠道</dt><dd>平台消息</dd></div>
              <div><dt>回执要求</dt><dd>需要确认</dd></div>
              <div><dt>数据来源</dt><dd>{{ sourceLabel }}</dd></div>
              <div><dt>数据更新</dt><dd>{{ formattedDate }}</dd></div>
            </dl>

            <div class="accordion-list">
              <details
                v-for="(notice, index) in schoolNotices"
                :key="notice.id"
                :open="index === 0"
              >
                <summary @click.prevent="toggleAccordion">{{ notice.title }}<img :src="chevronBottomIcon" alt="" aria-hidden="true"></summary>
                <div class="accordion-content"><p>{{ notice.content }}</p></div>
              </details>
            </div>
          </section>
        </div>

      </template>

      <div v-else class="empty-profile">
        <h2>{{ scopeName }}</h2>
        <p>当前镇街暂无公开学校点位，仍可查看行政边界。</p>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.right-hud {
  position: absolute;
  top: calc(var(--dt-right-panel-top) - var(--dt-topbar-height));
  right: var(--dt-right-panel-right);
  bottom: var(--dt-right-panel-bottom);
  width: calc(var(--dt-right-panel-width) + var(--dt-trail-gap) + var(--dt-trail-width));
  pointer-events: none;
}

.right-panel {
  position: absolute;
  inset: 0 0 0 auto;
  width: var(--dt-right-panel-width);
  display: flex;
  overflow: hidden;
  background: transparent;
  color: var(--dt-color-text);
  scrollbar-width: none;
  pointer-events: auto;
  flex-direction: column;
}

.right-panel::-webkit-scrollbar {
  display: none;
}

.right-panel h2 {
  margin: 0;
  color: var(--dt-color-text-strong);
  font-size: var(--dt-font-size-lg);
  line-height: var(--dt-line-height-lg);
  font-weight: var(--dt-font-weight-bold);
}

.profile-content {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
}

.profile-meta {
  display: flex;
  min-height: 72px;
  margin-top: 28px;
  justify-content: space-between;
  align-items: center;
  gap: var(--dt-space-4);
}

.profile-meta dl,
.detail-grid {
  margin: 0;
}

.profile-meta dl {
  display: grid;
  min-width: 0;
  flex: 1 1 auto;
  gap: var(--dt-space-2);
}

.profile-meta dl div,
.detail-grid div {
  display: grid;
  grid-template-columns: minmax(56px, max-content) minmax(0, 1fr);
  column-gap: var(--dt-space-3);
}

.profile-meta dt,
.profile-meta dd,
.detail-grid dt,
.detail-grid dd {
  margin: 0;
  font-size: var(--dt-font-size-sm);
  line-height: var(--dt-line-height-sm);
  font-weight: var(--dt-font-weight-light);
}

.profile-meta dt,
.detail-grid dt {
  width: auto;
  min-width: 56px;
  color: var(--dt-color-text-muted);
}

.profile-meta dd,
.detail-grid dd {
  width: 100%;
  overflow: hidden;
  color: var(--dt-color-text-strong);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entity-emblem {
  position: relative;
  display: grid;
  width: 72px;
  height: 72px;
  color: var(--dt-color-text);
  align-self: center;
  place-items: center;
}

.entity-emblem img {
  position: absolute;
  inset: 0;
  width: 72px;
  height: 72px;
}

.entity-emblem span {
  position: relative;
  z-index: 1;
  font-size: var(--dt-font-size-lg);
  line-height: var(--dt-line-height-lg);
  font-weight: var(--dt-font-weight-bold);
}

.entity-metric {
  display: flex;
  margin-top: 13px;
  align-items: baseline;
}

.entity-metric strong {
  color: var(--dt-color-text-strong);
  font-size: var(--dt-font-size-metric);
  line-height: var(--dt-line-height-metric);
  font-weight: var(--dt-font-weight-medium);
  font-variant-numeric: tabular-nums;
}

.entity-metric > span {
  margin-left: var(--dt-space-1);
  color: var(--dt-color-text-strong);
  font-size: var(--dt-font-size-sm);
}

.entity-metric p {
  margin: 0 0 0 var(--dt-space-8);
  color: var(--dt-color-text-strong);
  font-size: var(--dt-font-size-sm);
  line-height: var(--dt-line-height-sm);
}

.profile-tabs {
  display: flex;
  height: 34px;
  flex: 0 0 34px;
  margin-top: var(--dt-space-4);
  border-bottom: var(--dt-border-width) solid var(--dt-color-line);
  align-items: flex-start;
  gap: var(--dt-space-4);
}

.profile-tabs button {
  position: relative;
  border: 0;
  padding: 0 0 var(--dt-space-3);
  background: transparent;
  color: var(--dt-color-text-muted);
  font-size: var(--dt-font-size-md);
  line-height: var(--dt-line-height-md);
  font-weight: var(--dt-font-weight-light);
  cursor: pointer;
}

.profile-tabs button.is-active {
  color: var(--dt-color-text);
}

.profile-tabs button.is-active::after {
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 1px;
  background: var(--dt-color-text);
  content: "";
}

.profile-tabs button:focus-visible {
  outline: var(--dt-border-width) solid var(--dt-color-accent);
  outline-offset: var(--dt-space-1);
}

.detail-card {
  min-height: 0;
  overflow: auto;
  flex: 1 1 auto;
  margin-top: var(--dt-space-4);
  border: 0;
  border-radius: var(--dt-radius-sm);
  padding: var(--dt-space-6);
  background: var(--dt-detail-card-background);
  backdrop-filter: blur(var(--dt-detail-card-blur));
  -webkit-backdrop-filter: blur(var(--dt-detail-card-blur));
  scrollbar-width: none;
}

.detail-card::-webkit-scrollbar {
  display: none;
}

.detail-grid {
  display: grid;
  gap: var(--dt-space-2);
}

.detail-grid div {
  grid-template-columns: var(--dt-profile-label-column) minmax(0, 1fr);
}

.detail-grid mark {
  display: inline-flex;
  min-width: 38px;
  height: 20px;
  border-radius: 3px;
  padding: 0 var(--dt-space-2);
  background: var(--dt-color-accent);
  color: var(--dt-color-text-strong);
  font-size: var(--dt-font-size-xs);
  line-height: 20px;
  justify-content: center;
}

.secondary-grid {
  margin-top: var(--dt-space-6);
  border-top: var(--dt-border-width) solid var(--dt-color-line);
  padding-top: var(--dt-space-6);
}

.accordion-list {
  display: grid;
  margin-top: var(--dt-space-6);
}

.accordion-list details {
  border-bottom: var(--dt-border-width) solid var(--dt-color-line);
}

.accordion-list summary {
  display: flex;
  min-height: 54px;
  color: var(--dt-color-text-strong);
  font-size: var(--dt-font-size-sm);
  line-height: var(--dt-line-height-sm);
  list-style: none;
  cursor: pointer;
  align-items: center;
  justify-content: space-between;
}

.accordion-list summary::-webkit-details-marker {
  display: none;
}

.accordion-list summary img {
  width: var(--dt-icon-size-sm);
  height: var(--dt-icon-size-sm);
  transition: transform var(--dt-transition-fast);
}

.accordion-list details[open] summary img {
  transform: rotate(180deg);
}

.accordion-content {
  overflow: hidden;
}

.accordion-content p {
  margin: -1px 0 var(--dt-space-3);
  padding: var(--dt-space-3);
  background: var(--dt-color-panel-soft);
  color: var(--dt-color-text-muted);
  font-size: var(--dt-font-size-xs);
  line-height: var(--dt-line-height-md);
}

.spatial-trail {
  position: absolute;
  right: calc(var(--dt-right-panel-width) + var(--dt-trail-gap));
  bottom: 72px;
  width: var(--dt-trail-width);
  color: var(--dt-color-text-secondary);
  pointer-events: auto;
}

.spatial-trail::after {
  position: absolute;
  z-index: 0;
  top: 52px;
  right: 2px;
  bottom: 0;
  width: 1px;
  background: var(--dt-color-line);
  content: "";
  pointer-events: none;
}

.school-list-header {
  display: grid;
  min-height: 44px;
  padding-right: var(--dt-space-4);
  text-align: right;
  justify-items: end;
  gap: 2px;
}

.school-list-header > div {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.school-list-header strong {
  overflow: hidden;
  color: var(--dt-color-accent);
  font-size: var(--dt-font-size-sm);
  line-height: var(--dt-line-height-sm);
  font-weight: var(--dt-font-weight-light);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.school-list-header div span,
.school-list-header > span {
  color: var(--dt-color-text-muted);
  font-size: var(--dt-font-size-xs);
  line-height: var(--dt-line-height-xs);
}

.school-list-header > span {
  flex: 0 0 auto;
}

.school-list {
  position: relative;
  z-index: 1;
  overflow-y: auto;
  max-height: 240px;
  overscroll-behavior: contain;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
}

.school-list::-webkit-scrollbar {
  display: none;
}

.school-list:focus-visible {
  outline: var(--dt-border-width) solid var(--dt-color-accent);
  outline-offset: var(--dt-space-1);
}

.school-list-item {
  position: relative;
  display: grid;
  width: 100%;
  height: 48px;
  border: 0;
  padding: var(--dt-space-1) var(--dt-space-4) var(--dt-space-1) 0;
  background: transparent;
  color: var(--dt-color-text-secondary);
  font: inherit;
  text-align: right;
  cursor: pointer;
  scroll-snap-align: start;
  justify-items: end;
  align-content: center;
  gap: 2px;
}

.school-list-item::after {
  position: absolute;
  z-index: 1;
  top: 50%;
  right: 0;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--dt-color-text-muted);
  content: "";
  transform: translate(50%, -50%);
}

.school-list-item:hover {
  color: var(--dt-color-accent);
}

.school-list-item:focus-visible {
  outline: var(--dt-border-width) solid var(--dt-color-accent);
  outline-offset: calc(-1 * var(--dt-space-1));
}

.school-list-item.is-active {
  color: var(--dt-color-text);
}

.school-list-item:hover::after {
  background: var(--dt-color-accent);
}

.school-list-item.is-active::after {
  background: var(--dt-color-text);
}

.school-list-item span,
.school-list-item small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.school-list-item span {
  font-size: var(--dt-font-size-xs);
  line-height: var(--dt-line-height-xs);
}

.school-list-item small {
  color: var(--dt-color-text-muted);
  font-size: 10px;
  line-height: 12px;
}

.school-list-empty {
  margin: 0;
  padding: var(--dt-space-4) var(--dt-space-4) var(--dt-space-4) 0;
  color: var(--dt-color-text-muted);
  font-size: var(--dt-font-size-xs);
  line-height: var(--dt-line-height-sm);
  text-align: right;
}

.empty-profile {
  border: var(--dt-border-width) solid var(--dt-color-line);
  padding: var(--dt-space-6);
  background: var(--dt-color-panel-soft);
}

.empty-profile p {
  margin: var(--dt-space-4) 0 0;
  color: var(--dt-color-text-secondary);
  font-size: var(--dt-font-size-sm);
  line-height: var(--dt-line-height-md);
}

@media (max-width: 1180px) {
  .spatial-trail { display: none; }
  .right-hud { width: var(--dt-right-panel-width); }
}

@media (max-height: 900px) {
  .profile-meta { margin-top: var(--dt-space-4); }
  .entity-metric { margin-top: var(--dt-space-2); }
  .profile-tabs { margin-top: var(--dt-space-2); }
  .detail-card { margin-top: var(--dt-space-3); padding: var(--dt-space-4); }
  .secondary-grid { margin-top: var(--dt-space-4); padding-top: var(--dt-space-4); }
  .accordion-list { margin-top: var(--dt-space-4); }
  .accordion-list summary { min-height: 42px; }
}
</style>
