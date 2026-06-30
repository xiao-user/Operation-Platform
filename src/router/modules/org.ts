import type { RouteRecordRaw } from "vue-router";
import PlaceholderView from "@/views/PlaceholderView.vue";

// 机构 · 机构管理 路由
const manageRoutes: RouteRecordRaw[] = [
  { path: "org/manage", redirect: "/org/manage/basic-info" },

  {
    path: "org/manage/basic-info",
    name: "org-basic-info",
    component: PlaceholderView,
    meta: { moduleKey: "org-manage", menuKey: "org-basic-info", title: "基础信息" },
  },
  {
    path: "org/manage/structure/admin",
    name: "org-admin-structure",
    component: PlaceholderView,
    meta: { moduleKey: "org-manage", menuKey: "org-admin-structure", title: "行政架构" },
  },
  {
    path: "org/manage/users/all",
    name: "org-all-users",
    component: PlaceholderView,
    meta: { moduleKey: "org-manage", menuKey: "org-all-users", title: "所有用户" },
  },
  {
    path: "org/manage/users/staff",
    name: "org-staff-manage",
    component: PlaceholderView,
    meta: { moduleKey: "org-manage", menuKey: "org-staff-manage", title: "职员管理" },
  },
  {
    path: "org/manage/users/group",
    name: "org-staff-group",
    component: PlaceholderView,
    meta: { moduleKey: "org-manage", menuKey: "org-staff-group", title: "职员分组" },
  },
  {
    path: "org/manage/users/auth",
    name: "org-auth-manage",
    component: PlaceholderView,
    meta: { moduleKey: "org-manage", menuKey: "org-auth-manage", title: "授权管理" },
  },
  {
    path: "org/manage/users/teacher-review",
    name: "org-teacher-review",
    component: PlaceholderView,
    meta: { moduleKey: "org-manage", menuKey: "org-teacher-review", title: "师资审核" },
  },
];

// 机构 · 结算中心 路由
const settlementRoutes: RouteRecordRaw[] = [
  { path: "org/settlement", redirect: "/org/settlement/payment" },
  {
    path: "org/settlement/payment",
    name: "org-payment-flow",
    component: PlaceholderView,
    meta: { moduleKey: "org-settlement", menuKey: "org-payment-flow", title: "课程缴费流水" },
  },
  {
    path: "org/settlement/refund",
    name: "org-refund-flow",
    component: PlaceholderView,
    meta: { moduleKey: "org-settlement", menuKey: "org-refund-flow", title: "课程退费流水" },
  },
];

// 机构 · 课程课班管理 路由
const courseRoutes: RouteRecordRaw[] = [
  { path: "org/course", redirect: "/org/course/list" },
  {
    path: "org/course/list",
    name: "org-course-list",
    component: PlaceholderView,
    meta: { moduleKey: "org-course", menuKey: "org-course-list", title: "课程列表" },
  },
  {
    path: "org/course/class",
    name: "org-class-manage",
    component: PlaceholderView,
    meta: { moduleKey: "org-course", menuKey: "org-class-manage", title: "课班管理" },
  },
];

// 机构 · 通知公告 路由
const noticeRoutes: RouteRecordRaw[] = [
  { path: "org/notice", redirect: "/org/notice/list" },
  {
    path: "org/notice/list",
    name: "org-notice-list",
    component: PlaceholderView,
    meta: { moduleKey: "org-notice", menuKey: "org-notice-list", title: "通知公告" },
  },
];

export const orgRoutes: RouteRecordRaw[] = [
  ...manageRoutes,
  ...settlementRoutes,
  ...courseRoutes,
  ...noticeRoutes,
];
