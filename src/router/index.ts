import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import AppLayout from "@/layouts/AppLayout.vue";
import PlaceholderView from "@/views/PlaceholderView.vue";
import { pageRouteRecords } from "@/config/page-registry";
import { resolveTenantRouteAccess } from "@/router/tenant-route-access";
import { useNavigationStore } from "@/stores/navigation";
import { useUserStore } from "@/stores/user";

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
        path: "menu-unavailable",
        name: "menu-unavailable",
        component: () => import("@/views/MenuUnavailableView.vue"),
        meta: { title: "暂无可访问页面", tenantFallback: true },
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

router.beforeEach((to) => {
  const userStore = useUserStore();
  const navigationStore = useNavigationStore();
  if (navigationStore.currentTenant?.id !== userStore.currentTenant.id) {
    navigationStore.loadTenant(userStore.currentTenant);
  }

  const result = resolveTenantRouteAccess(
    { path: to.path, meta: to.meta },
    userStore.role,
    navigationStore.records,
  );
  if (result.kind === "allow") return true;
  if (result.kind === "empty") {
    return to.name === "menu-unavailable" ? true : { name: "menu-unavailable" };
  }
  return result.path === to.path ? true : result.path;
});

export default router;
