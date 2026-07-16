import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import AppLayout from "@/layouts/AppLayout.vue";
import {
  pageRegistryByKey,
  pageRouteRecords,
  standalonePageRouteRecords,
} from "@/config/page-registry";
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
  ...standalonePageRouteRecords,
  {
    path: "/",
    component: AppLayout,
    children: [
      { path: "", redirect: "/workbench" },
      ...legacyRedirects,
      {
        path: "workbench",
        name: "workbench",
        component: () => import("@/views/WorkbenchView.vue"),
        meta: { title: "工作台", fixedWorkbench: true },
      },
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
        component: () => import("@/views/PlaceholderView.vue"),
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
  const pageKey = typeof to.meta.pageKey === "string" ? to.meta.pageKey : "";
  const page = pageKey ? pageRegistryByKey.get(pageKey) : null;
  const requestedTenantId = typeof to.query.tenantId === "string" ? to.query.tenantId : "";

  if (page?.surface === "standalone") {
    const requestedTenant = userStore.availableTenants.find(
      (tenant) =>
        tenant.id === requestedTenantId &&
        page.tenantTypes.includes(tenant.type) &&
        userStore.canAccessTenant(tenant),
    );
    if (!requestedTenant) return { name: "menu-unavailable" };
    if (requestedTenant.id !== userStore.currentTenant.id) {
      userStore.switchTenant(requestedTenant.id);
    }
  }
  const platformTenant = userStore.availableTenants.find((tenant) => tenant.type === "platform");
  const hasPlatformAdminRole = platformTenant
    ? userStore.hasAdminRoleForTenant(platformTenant.id)
    : false;

  if (
    page?.tenantTypes.length === 1 &&
    page.tenantTypes[0] === "platform" &&
    hasPlatformAdminRole &&
    platformTenant &&
    userStore.currentTenant.type !== "platform"
  ) {
    userStore.switchTenant(platformTenant.id);
  }

  if (navigationStore.currentTenant?.id !== userStore.currentTenant.id) {
    navigationStore.loadTenant(userStore.currentTenant);
  }

  const result = resolveTenantRouteAccess(
    { path: to.path, meta: to.meta, params: to.params },
    userStore.role,
    navigationStore.records,
    navigationStore.shellConfig,
    navigationStore.roles,
  );
  if (result.kind === "allow") return true;
  if (result.kind === "empty") {
    return to.name === "menu-unavailable" ? true : { name: "menu-unavailable" };
  }
  return result.path === to.path ? true : result.path;
});

export default router;
