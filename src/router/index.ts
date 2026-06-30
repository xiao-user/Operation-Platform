import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import AppLayout from "@/layouts/AppLayout.vue";
import PlaceholderView from "@/views/PlaceholderView.vue";
import { pageRouteRecords } from "@/config/page-registry";

const legacyRedirects: RouteRecordRaw[] = [
  { path: "security", redirect: "/security/new-gate/device-list" },
  { path: "security/new-gate", redirect: "/security/new-gate/device-list" },
  { path: "family-interaction", redirect: "/family-interaction/notice" },
  { path: "academic", redirect: "/academic/course-list" },
  { path: "dorm", redirect: "/dorm/room-manage" },
  { path: "finance", redirect: "/finance/fee-set" },
  { path: "bureau/custody", redirect: "/bureau/custody/course-data/analysis" },
  { path: "bureau/org", redirect: "/bureau/org/structure" },
  { path: "bureau/operator", redirect: "/bureau/operator/list" },
  { path: "org/manage", redirect: "/org/manage/basic-info" },
  { path: "org/settlement", redirect: "/org/settlement/payment" },
  { path: "org/course", redirect: "/org/course/list" },
  { path: "org/notice", redirect: "/org/notice/list" },
];

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: AppLayout,
    children: [
      { path: "", redirect: "/security/new-gate/device-list" },
      ...legacyRedirects,
      ...pageRouteRecords,
      {
        path: "system/menu-config",
        name: "system-menu-config",
        component: () => import("@/views/system/menu-config/MenuConfigView.vue"),
        meta: { title: "菜单配置", fixedSystem: true },
      },
      {
        path: ":pathMatch(.*)*",
        name: "not-found",
        component: PlaceholderView,
        meta: { title: "页面未找到" },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
