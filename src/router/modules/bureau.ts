import type { RouteRecordRaw } from "vue-router";
import PlaceholderView from "@/views/PlaceholderView.vue";
import OrgReviewView from "@/views/bureau/custody/org/OrgReviewView.vue";

// 教育局 · 托管学堂 路由
const custodyRoutes: RouteRecordRaw[] = [
  { path: "bureau/custody", redirect: "/bureau/custody/course-data/analysis" },
  // 课程数据中心
  {
    path: "bureau/custody/course-data/analysis",
    name: "bureau-course-data-analysis",
    component: PlaceholderView,
    meta: { moduleKey: "bureau-custody", menuKey: "course-data-analysis", title: "课程数据分析" },
  },
  {
    path: "bureau/custody/course-data/school-signup",
    name: "bureau-school-signup-stats",
    component: PlaceholderView,
    meta: { moduleKey: "bureau-custody", menuKey: "school-signup-stats", title: "学校报名统计" },
  },
  {
    path: "bureau/custody/course-data/org-signup",
    name: "bureau-org-signup-stats",
    component: PlaceholderView,
    meta: { moduleKey: "bureau-custody", menuKey: "org-signup-stats", title: "机构报名统计" },
  },
  {
    path: "bureau/custody/course-data/school-class",
    name: "bureau-school-class-stats",
    component: PlaceholderView,
    meta: { moduleKey: "bureau-custody", menuKey: "school-class-stats", title: "学校开班统计" },
  },
  {
    path: "bureau/custody/course-data/student-list",
    name: "bureau-student-signup-list",
    component: PlaceholderView,
    meta: { moduleKey: "bureau-custody", menuKey: "student-signup-list", title: "学生报名清单" },
  },
  // 托管课程管理
  {
    path: "bureau/custody/course-manage/review-list",
    name: "bureau-review-list",
    component: PlaceholderView,
    meta: { moduleKey: "bureau-custody", menuKey: "review-list", title: "审核列表" },
  },
  {
    path: "bureau/custody/course-manage/rule-review",
    name: "bureau-course-rule-review",
    component: PlaceholderView,
    meta: { moduleKey: "bureau-custody", menuKey: "course-rule-review", title: "课程细则审核" },
  },
  {
    path: "bureau/custody/course-manage/selection",
    name: "bureau-course-selection",
    component: PlaceholderView,
    meta: { moduleKey: "bureau-custody", menuKey: "course-selection", title: "选课管理" },
  },
  {
    path: "bureau/custody/course-manage/courses",
    name: "bureau-course-manage",
    component: PlaceholderView,
    meta: { moduleKey: "bureau-custody", menuKey: "course-manage", title: "课程管理" },
  },
  {
    path: "bureau/custody/course-manage/tags",
    name: "bureau-tag-library",
    component: PlaceholderView,
    meta: { moduleKey: "bureau-custody", menuKey: "tag-library", title: "标签库管理" },
  },
  {
    path: "bureau/custody/course-manage/category",
    name: "bureau-course-category",
    component: PlaceholderView,
    meta: { moduleKey: "bureau-custody", menuKey: "course-category", title: "课程分类管理" },
  },
  {
    path: "bureau/custody/course-manage/evaluation",
    name: "bureau-course-evaluation",
    component: PlaceholderView,
    meta: { moduleKey: "bureau-custody", menuKey: "course-evaluation", title: "课程服务评价" },
  },
  {
    path: "bureau/custody/course-manage/attendance",
    name: "bureau-attendance-flow",
    component: PlaceholderView,
    meta: { moduleKey: "bureau-custody", menuKey: "attendance-flow", title: "课班考勤流水" },
  },
  {
    path: "bureau/custody/course-manage/unit-price",
    name: "bureau-unit-price",
    component: PlaceholderView,
    meta: { moduleKey: "bureau-custody", menuKey: "unit-price", title: "课时单价管理" },
  },
  // 结算中心
  {
    path: "bureau/custody/settlement/payment",
    name: "bureau-payment-flow",
    component: PlaceholderView,
    meta: { moduleKey: "bureau-custody", menuKey: "payment-flow", title: "课程缴费流水" },
  },
  {
    path: "bureau/custody/settlement/refund",
    name: "bureau-refund-flow",
    component: PlaceholderView,
    meta: { moduleKey: "bureau-custody", menuKey: "refund-flow", title: "课程退费流水" },
  },
  {
    path: "bureau/custody/settlement/refund-review",
    name: "bureau-refund-review",
    component: PlaceholderView,
    meta: { moduleKey: "bureau-custody", menuKey: "refund-review", title: "课程退费审核" },
  },
  // 机构管理
  {
    path: "bureau/custody/org/list",
    name: "bureau-org-list",
    component: PlaceholderView,
    meta: { moduleKey: "bureau-custody", menuKey: "org-list", title: "机构列表" },
  },
  {
    path: "bureau/custody/org/review",
    name: "bureau-org-review",
    component: OrgReviewView,
    meta: { moduleKey: "bureau-custody", menuKey: "org-review", title: "审核列表" },
  },
  {
    path: "bureau/custody/org/review/:id",
    name: "bureau-org-review-detail",
    component: () => import("@/views/bureau/custody/org/OrgReviewDetailView.vue"),
    meta: { moduleKey: "bureau-custody", menuKey: "org-review", title: "审核详情" },
  },
  {
    path: "bureau/custody/org/teacher-review",
    name: "bureau-teacher-review",
    component: PlaceholderView,
    meta: { moduleKey: "bureau-custody", menuKey: "teacher-review", title: "师资审核" },
  },
  // 学校管理
  {
    path: "bureau/custody/school/list",
    name: "bureau-school-list",
    component: PlaceholderView,
    meta: { moduleKey: "bureau-custody", menuKey: "school-list", title: "学校管理" },
  },
  // 教师管理
  {
    path: "bureau/custody/teacher/list",
    name: "bureau-teacher-list",
    component: PlaceholderView,
    meta: { moduleKey: "bureau-custody", menuKey: "teacher-list", title: "教师列表" },
  },
  {
    path: "bureau/custody/teacher/blacklist",
    name: "bureau-teacher-blacklist",
    component: PlaceholderView,
    meta: { moduleKey: "bureau-custody", menuKey: "teacher-blacklist", title: "教师黑名单" },
  },
  // 操作日志 & 设置
  {
    path: "bureau/custody/operation-log",
    name: "bureau-operation-log",
    component: PlaceholderView,
    meta: { moduleKey: "bureau-custody", menuKey: "operation-log", title: "操作日志" },
  },
  {
    path: "bureau/custody/settings",
    name: "bureau-settings",
    component: PlaceholderView,
    meta: { moduleKey: "bureau-custody", menuKey: "bureau-settings", title: "设置" },
  },
];

// 教育局 · 组织管理 路由
const orgRoutes: RouteRecordRaw[] = [
  { path: "bureau/org", redirect: "/bureau/org/structure" },
  {
    path: "bureau/org/structure",
    name: "bureau-org-structure",
    component: PlaceholderView,
    meta: { moduleKey: "bureau-org", menuKey: "org-structure", title: "组织架构" },
  },
  {
    path: "bureau/org/staff",
    name: "bureau-staff-manage",
    component: PlaceholderView,
    meta: { moduleKey: "bureau-org", menuKey: "staff-manage", title: "人员管理" },
  },
];

// 教育局 · 运营商管理 路由
const operatorRoutes: RouteRecordRaw[] = [
  { path: "bureau/operator", redirect: "/bureau/operator/list" },
  {
    path: "bureau/operator/list",
    name: "bureau-operator-list",
    component: PlaceholderView,
    meta: { moduleKey: "bureau-operator", menuKey: "operator-list", title: "运营商列表" },
  },
  {
    path: "bureau/operator/review",
    name: "bureau-operator-review",
    component: PlaceholderView,
    meta: { moduleKey: "bureau-operator", menuKey: "operator-review", title: "审核管理" },
  },
];

export const bureauRoutes: RouteRecordRaw[] = [...custodyRoutes, ...orgRoutes, ...operatorRoutes];
