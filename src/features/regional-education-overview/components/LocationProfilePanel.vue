<script setup lang="ts">
import { computed } from "vue";
import mapPinIcon from "@/assets/figma/regional-education-overview/map-pin.svg";
import chevronBottomIcon from "@/assets/figma/regional-education-overview/chevron-bottom.svg";
import { educationLocationTypeMeta } from "../education-locations";
import type { EducationLocation } from "../types";
import AnimatedNumber from "./AnimatedNumber.vue";

const props = defineProps<{
  location?: EducationLocation;
  scopeName: string;
  canDrill: boolean;
  formattedDate: string;
  entityCount: number;
  locations: readonly EducationLocation[];
}>();

const emit = defineEmits<{
  locationSelect: [location: EducationLocation];
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
const importanceLabel = computed(() => props.location?.type === "bureau" ? "区域级" : "校级");
</script>

<template>
  <div class="right-hud">
    <ol class="spatial-trail" aria-label="当前空间路径">
      <li class="is-current">
        <strong>{{ location?.name ?? scopeName }}</strong>
        <span><img :src="mapPinIcon" alt="" aria-hidden="true">{{ selectedTypeMeta?.label ?? "行政区域" }}</span>
      </li>
      <li>
        <strong>{{ scopeName }}</strong>
        <span><AnimatedNumber :value="entityCount" /> 个空间实体</span>
      </li>
      <li v-if="scopeName !== '榕城区'">
        <strong>榕城区</strong>
        <span>区域教育总览</span>
      </li>
    </ol>

    <aside class="right-panel" aria-label="当前教育机构详情">
      <template v-if="location && selectedTypeMeta">
        <div class="profile-content">
          <h2>{{ location.name }}</h2>

          <div class="profile-meta">
            <dl>
              <div><dt>日期</dt><dd>{{ formattedDate }}</dd></div>
              <div><dt>类型</dt><dd>{{ selectedTypeMeta.label }}</dd></div>
            </dl>
            <div class="entity-emblem" :style="{ '--entity-color': selectedTypeMeta.color }" aria-hidden="true">
              <span>{{ selectedTypeMeta.shortLabel }}</span>
            </div>
          </div>

          <div class="entity-metric">
            <strong><AnimatedNumber :value="1" /></strong><span>个</span><p>地图实体</p>
          </div>

          <div class="profile-tabs" role="tablist" aria-label="机构详情分类">
            <button type="button" class="is-active" role="tab" aria-selected="true">机构信息</button>
            <button type="button" role="tab" aria-selected="false" disabled>运行追踪</button>
          </div>

          <section class="detail-card" aria-label="空间实体数据">
            <dl class="detail-grid">
              <div><dt>机构编码</dt><dd>{{ entityCode }}</dd></div>
              <div><dt>接入状态</dt><dd>已接入</dd></div>
              <div><dt>机构类型</dt><dd>{{ selectedTypeMeta.label }}</dd></div>
              <div><dt>数据来源</dt><dd>{{ sourceLabel }}</dd></div>
              <div><dt>数据等级</dt><dd><mark>{{ importanceLabel }}</mark></dd></div>
            </dl>

            <dl class="detail-grid secondary-grid">
              <div><dt>更新时间</dt><dd>{{ formattedDate }}</dd></div>
              <div><dt>所属范围</dt><dd>{{ scopeName }}</dd></div>
              <div><dt>数据效力</dt><dd>原型参考</dd></div>
            </dl>

            <div class="accordion-list">
              <details open>
                <summary>数据说明<img :src="chevronBottomIcon" alt="" aria-hidden="true"></summary>
                <p>{{ location.note ?? "坐标来自公开地理数据，等待教育局权威台账补充运行指标。" }}</p>
              </details>
              <details>
                <summary>坐标信息<img :src="chevronBottomIcon" alt="" aria-hidden="true"></summary>
                <p>经度 {{ location.coordinate[0].toFixed(6) }}，纬度 {{ location.coordinate[1].toFixed(6) }}</p>
              </details>
              <details>
                <summary>数据来源<img :src="chevronBottomIcon" alt="" aria-hidden="true"></summary>
                <p>{{ sourceLabel }} 公开地理数据，仅用于本地原型展示。</p>
              </details>
              <details>
                <summary>地图操作<img :src="chevronBottomIcon" alt="" aria-hidden="true"></summary>
                <p>拖拽旋转、滚轮缩放、点击点位查看。{{ canDrill ? "点击镇街边界可下钻。" : "当前已进入镇街层级。" }}</p>
              </details>
              <details>
                <summary>校准状态<img :src="chevronBottomIcon" alt="" aria-hidden="true"></summary>
                <p>正式上线前需使用教育局权威台账校准机构类型、隶属关系与坐标。</p>
              </details>
            </div>
          </section>
        </div>

        <div class="panel-pagination" aria-label="切换教育机构">
          <div class="pagination-track">
            <button
              v-for="item in locations"
              :key="item.id"
              type="button"
              class="pagination-item"
              :class="{ 'is-active': item.id === location.id }"
              :aria-label="`切换至${item.name}`"
              :aria-pressed="item.id === location.id"
              @click="emit('locationSelect', item)"
            >
              <i aria-hidden="true" />
            </button>
          </div>
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
  color: var(--dt-color-text);
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
  align-items: flex-start;
}

.profile-meta dl,
.detail-grid {
  margin: 0;
}

.profile-meta dl {
  display: grid;
  gap: var(--dt-space-2);
}

.profile-meta dl div,
.detail-grid div {
  display: grid;
  grid-template-columns: var(--dt-profile-label-column) minmax(0, 1fr);
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
  color: var(--dt-color-text-muted);
}

.profile-meta dd,
.detail-grid dd {
  overflow: hidden;
  color: var(--dt-color-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entity-emblem {
  --entity-color: var(--dt-color-accent);
  position: relative;
  display: grid;
  width: 90px;
  height: 56px;
  color: var(--entity-color);
  align-self: center;
  place-items: center;
}

.entity-emblem::before {
  position: absolute;
  width: 58px;
  height: 36px;
  border: 1px solid color-mix(in srgb, var(--entity-color) 82%, transparent);
  border-radius: 50%;
  background: color-mix(in srgb, var(--entity-color) 18%, transparent);
  box-shadow: 0 0 var(--dt-space-6) color-mix(in srgb, var(--entity-color) 48%, transparent);
  content: "";
  transform: rotate(-12deg);
}

.entity-emblem span {
  position: relative;
  z-index: 1;
  font-size: var(--dt-font-size-lg);
  line-height: var(--dt-line-height-lg);
  font-weight: var(--dt-font-weight-bold);
  text-shadow: 0 0 12px currentcolor;
}

.entity-metric {
  display: flex;
  margin-top: 13px;
  align-items: baseline;
}

.entity-metric strong {
  color: var(--dt-color-text);
  font-size: var(--dt-font-size-metric);
  line-height: var(--dt-line-height-metric);
  font-weight: var(--dt-font-weight-medium);
  font-variant-numeric: tabular-nums;
}

.entity-metric > span {
  margin-left: var(--dt-space-1);
  color: var(--dt-color-text-secondary);
  font-size: var(--dt-font-size-sm);
}

.entity-metric p {
  margin: 0 0 0 var(--dt-space-8);
  color: var(--dt-color-text-secondary);
  font-size: var(--dt-font-size-sm);
  line-height: var(--dt-line-height-sm);
}

.profile-tabs {
  display: flex;
  height: 40px;
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
}

.profile-tabs button.is-active {
  color: var(--dt-color-text);
}

.detail-card {
  min-height: 0;
  overflow: auto;
  flex: 1 1 auto;
  margin-top: var(--dt-space-4);
  border: var(--dt-border-width) solid var(--dt-color-text-muted);
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
  color: var(--dt-color-text);
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
  color: var(--dt-color-text-secondary);
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

.accordion-list details p {
  margin: -1px 0 var(--dt-space-3);
  padding: var(--dt-space-3);
  background: var(--dt-color-panel-soft);
  color: var(--dt-color-text-muted);
  font-size: var(--dt-font-size-xs);
  line-height: var(--dt-line-height-md);
}

.panel-pagination {
  display: flex;
  width: 100%;
  height: var(--dt-pagination-height);
  flex: 0 0 var(--dt-pagination-height);
  padding-top: var(--dt-pagination-padding-top);
  align-items: stretch;
}

.pagination-track {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: stretch;
  gap: var(--dt-pagination-gap);
}

.pagination-item {
  display: grid;
  min-width: 1px;
  height: 100%;
  border: 0;
  padding: 0;
  background: transparent;
  flex: 1 1 0;
  cursor: pointer;
  place-items: center;
}

.pagination-item i {
  width: 100%;
  height: 2px;
  background: var(--dt-color-line);
  transition: background var(--dt-transition-fast), transform var(--dt-transition-fast);
}

.pagination-item:hover i,
.pagination-item.is-active i {
  background: var(--dt-color-text);
}

.pagination-item.is-active i {
  transform: scaleY(1.5);
}

.spatial-trail {
  position: absolute;
  right: calc(var(--dt-right-panel-width) + var(--dt-trail-gap));
  bottom: 163px;
  display: grid;
  width: var(--dt-trail-width);
  margin: 0;
  padding: 0;
  color: var(--dt-color-text-secondary);
  list-style: none;
  gap: var(--dt-space-6);
  pointer-events: none;
}

.spatial-trail::after {
  position: absolute;
  top: var(--dt-space-2);
  right: 2px;
  bottom: 0;
  width: 1px;
  background: var(--dt-color-line);
  content: "";
}

.spatial-trail li {
  position: relative;
  padding-right: var(--dt-space-4);
  text-align: right;
}

.spatial-trail li::after {
  position: absolute;
  z-index: 1;
  top: 6px;
  right: 0;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--dt-color-text-muted);
  content: "";
  transform: translateX(50%);
}

.spatial-trail strong,
.spatial-trail li > span {
  display: flex;
  overflow: hidden;
  justify-content: flex-end;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.spatial-trail strong {
  color: var(--dt-color-accent);
  font-size: var(--dt-font-size-sm);
  line-height: var(--dt-line-height-sm);
  font-weight: var(--dt-font-weight-light);
}

.spatial-trail li > span {
  margin-top: var(--dt-space-1);
  color: var(--dt-color-text-muted);
  font-size: var(--dt-font-size-xs);
  line-height: var(--dt-line-height-xs);
  align-items: center;
  gap: var(--dt-space-1);
}

.spatial-trail li > span img {
  width: var(--dt-icon-size-xs);
  height: var(--dt-icon-size-xs);
}

.spatial-trail li.is-current strong {
  color: var(--dt-color-text);
}

.spatial-trail li.is-current::after {
  background: var(--dt-color-text);
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
