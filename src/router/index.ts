import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import AppLayout from "@/layouts/AppLayout.vue";
import { securityRoutes } from "@/router/modules/security";
import { bureauRoutes } from "@/router/modules/bureau";
import { orgRoutes } from "@/router/modules/org";
import PlaceholderView from "@/views/PlaceholderView.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: AppLayout,
    children: [
      {
        path: "",
        redirect: "/security/new-gate/device-list",
      },
      {
        path: "security",
        redirect: "/security/new-gate/device-list",
      },
      ...securityRoutes,
      ...bureauRoutes,
      ...orgRoutes,
      {
        path: "family-interaction",
        redirect: "/family-interaction/notice",
      },
      {
        path: "family-interaction/notice",
        name: "family-notice",
        component: PlaceholderView,
        meta: {
          moduleKey: "family-interaction",
          menuKey: "notice",
          title: "通知公告",
        },
      },
      {
        path: "family-interaction/activity",
        name: "family-activity",
        component: PlaceholderView,
        meta: {
          moduleKey: "family-interaction",
          menuKey: "activity",
          title: "活动管理",
        },
      },
      {
        path: "academic",
        redirect: "/academic/course-list",
      },
      {
        path: "academic/course-list",
        name: "course-list",
        component: PlaceholderView,
        meta: {
          moduleKey: "academic",
          menuKey: "course-list",
          title: "课程列表",
        },
      },
      {
        path: "academic/class-manage",
        name: "class-manage",
        component: PlaceholderView,
        meta: {
          moduleKey: "academic",
          menuKey: "class-manage",
          title: "班级管理",
        },
      },
      {
        path: "dorm",
        redirect: "/dorm/room-manage",
      },
      {
        path: "dorm/room-manage",
        name: "room-manage",
        component: PlaceholderView,
        meta: {
          moduleKey: "dorm",
          menuKey: "room-manage",
          title: "宿舍管理",
        },
      },
      {
        path: "finance",
        redirect: "/finance/fee-set",
      },
      {
        path: "finance/fee-set",
        name: "fee-set",
        component: PlaceholderView,
        meta: {
          moduleKey: "finance",
          menuKey: "fee-set",
          title: "收费设置",
        },
      },
      {
        path: "care-management",
        name: "care-management",
        component: PlaceholderView,
        meta: {
          moduleKey: "care-management",
          title: "托管管理",
        },
      },
      {
        path: "schedule",
        name: "schedule",
        component: PlaceholderView,
        meta: {
          moduleKey: "schedule",
          title: "排课系统",
        },
      },
      {
        path: "office",
        name: "office",
        component: PlaceholderView,
        meta: {
          moduleKey: "office",
          title: "校园办公",
        },
      },
      {
        path: "sports",
        name: "sports",
        component: PlaceholderView,
        meta: {
          moduleKey: "sports",
          title: "智慧操场",
        },
      },
      {
        path: ":pathMatch(.*)*",
        name: "not-found",
        component: PlaceholderView,
        meta: {
          moduleKey: "security",
          title: "页面未找到",
        },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
