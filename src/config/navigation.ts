import type { NavTab, SideMenuItem } from "@/types/navigation";

// ==========================================
// 顶部导航 Tab（tenantTypes 限定可见租户类型）
// ==========================================
export const topNavTabs: NavTab[] = [
  // 学校专属
  {
    key: "family-interaction",
    label: "家校互动",
    path: "/family-interaction",
    tenantTypes: ["school"],
  },
  { key: "care-management", label: "托管管理", path: "/care-management", tenantTypes: ["school"] },
  { key: "academic", label: "教务管理", path: "/academic", tenantTypes: ["school"] },
  { key: "schedule", label: "排课系统", path: "/schedule", tenantTypes: ["school"] },
  { key: "dorm", label: "宿舍管理", path: "/dorm", tenantTypes: ["school"] },
  { key: "office", label: "校园办公", path: "/office", tenantTypes: ["school"] },
  { key: "finance", label: "缴费管理", path: "/finance", tenantTypes: ["school"] },
  { key: "security", label: "校园安全", path: "/security", tenantTypes: ["school"] },
  { key: "sports", label: "智慧操场", path: "/sports", tenantTypes: ["school"] },
  // 教育局专属
  { key: "bureau-custody", label: "托管学堂", path: "/bureau/custody", tenantTypes: ["bureau"] },
  { key: "bureau-org", label: "组织管理", path: "/bureau/org", tenantTypes: ["bureau"] },
  {
    key: "bureau-operator",
    label: "运营商管理",
    path: "/bureau/operator",
    tenantTypes: ["bureau"],
  },
  // 机构专属
  { key: "org-manage", label: "机构管理", path: "/org/manage", tenantTypes: ["org"] },
  { key: "org-settlement", label: "结算中心", path: "/org/settlement", tenantTypes: ["org"] },
  { key: "org-course", label: "课程课班管理", path: "/org/course", tenantTypes: ["org"] },
  { key: "org-notice", label: "通知公告", path: "/org/notice", tenantTypes: ["org"] },
  // 运营平台专属
  { key: "platform-system", label: "系统管理", path: "/system", tenantTypes: ["platform"] },
];

// ==========================================
// 各模块侧边菜单
// ==========================================
export const moduleMenus: Record<string, SideMenuItem[]> = {
  // ---------- 学校模块 ----------
  security: [
    {
      key: "smart-safety",
      label: "校园智能安防",
      icon: "grid",
      children: [
        { key: "new-gate", label: "新版门禁设置", path: "/security/new-gate" },
        { key: "visitor", label: "访客管理", path: "/security/visitor" },
      ],
    },
  ],

  academic: [
    {
      key: "course-group",
      label: "课程管理",
      icon: "notebook",
      children: [
        { key: "course-list", label: "课程列表", path: "/academic/course-list" },
        { key: "class-manage", label: "班级管理", path: "/academic/class-manage" },
      ],
    },
  ],

  "family-interaction": [
    { key: "notice", label: "通知公告", icon: "chat", path: "/family-interaction/notice" },
    { key: "activity", label: "活动管理", icon: "calendar", path: "/family-interaction/activity" },
  ],

  dorm: [{ key: "room-manage", label: "宿舍管理", icon: "house", path: "/dorm/room-manage" }],

  finance: [{ key: "fee-set", label: "收费设置", icon: "money", path: "/finance/fee-set" }],

  // ---------- 教育局 · 托管学堂 ----------
  "bureau-custody": [
    {
      key: "course-data-center",
      label: "课程数据中心",
      icon: "data",
      children: [
        {
          key: "course-data-analysis",
          label: "课程数据分析",
          path: "/bureau/custody/course-data/analysis",
        },
        {
          key: "school-signup-stats",
          label: "学校报名统计",
          path: "/bureau/custody/course-data/school-signup",
        },
        {
          key: "org-signup-stats",
          label: "机构报名统计",
          path: "/bureau/custody/course-data/org-signup",
        },
        {
          key: "school-class-stats",
          label: "学校开班统计",
          path: "/bureau/custody/course-data/school-class",
        },
        {
          key: "student-signup-list",
          label: "学生报名清单",
          path: "/bureau/custody/course-data/student-list",
        },
      ],
    },
    {
      key: "custody-course-manage",
      label: "托管课程管理",
      icon: "document",
      children: [
        {
          key: "review-list",
          label: "审核列表",
          path: "/bureau/custody/course-manage/review-list",
        },
        {
          key: "course-rule-review",
          label: "课程细则审核",
          path: "/bureau/custody/course-manage/rule-review",
        },
        {
          key: "course-selection",
          label: "选课管理",
          path: "/bureau/custody/course-manage/selection",
        },
        { key: "course-manage", label: "课程管理", path: "/bureau/custody/course-manage/courses" },
        { key: "tag-library", label: "标签库管理", path: "/bureau/custody/course-manage/tags" },
        {
          key: "course-category",
          label: "课程分类管理",
          path: "/bureau/custody/course-manage/category",
        },
        {
          key: "course-evaluation",
          label: "课程服务评价",
          path: "/bureau/custody/course-manage/evaluation",
        },
        {
          key: "attendance-flow",
          label: "课班考勤流水",
          path: "/bureau/custody/course-manage/attendance",
        },
        {
          key: "unit-price",
          label: "课时单价管理",
          path: "/bureau/custody/course-manage/unit-price",
        },
      ],
    },
    {
      key: "settlement-center",
      label: "结算中心",
      icon: "coin",
      children: [
        { key: "payment-flow", label: "课程缴费流水", path: "/bureau/custody/settlement/payment" },
        { key: "refund-flow", label: "课程退费流水", path: "/bureau/custody/settlement/refund" },
        {
          key: "refund-review",
          label: "课程退费审核",
          path: "/bureau/custody/settlement/refund-review",
        },
      ],
    },
    {
      key: "org-manage",
      label: "机构管理",
      icon: "office",
      children: [
        { key: "org-list", label: "机构列表", path: "/bureau/custody/org/list" },
        { key: "org-review", label: "审核列表", path: "/bureau/custody/org/review" },
        { key: "teacher-review", label: "师资审核", path: "/bureau/custody/org/teacher-review" },
      ],
    },
    {
      key: "school-manage",
      label: "学校管理",
      icon: "grid",
      children: [{ key: "school-list", label: "学校管理", path: "/bureau/custody/school/list" }],
    },
    {
      key: "teacher-manage",
      label: "教师管理",
      icon: "user",
      children: [
        { key: "teacher-list", label: "教师列表", path: "/bureau/custody/teacher/list" },
        {
          key: "teacher-blacklist",
          label: "教师黑名单",
          path: "/bureau/custody/teacher/blacklist",
        },
      ],
    },
    {
      key: "operation-log",
      label: "操作日志",
      icon: "list",
      path: "/bureau/custody/operation-log",
    },
    { key: "bureau-settings", label: "设置", icon: "setting", path: "/bureau/custody/settings" },
  ],

  // ---------- 教育局 · 组织管理 ----------
  "bureau-org": [
    { key: "org-structure", label: "组织架构", icon: "office", path: "/bureau/org/structure" },
    { key: "staff-manage", label: "人员管理", icon: "user", path: "/bureau/org/staff" },
  ],

  // ---------- 教育局 · 运营商管理 ----------
  "bureau-operator": [
    { key: "operator-list", label: "运营商列表", icon: "list", path: "/bureau/operator/list" },
    { key: "operator-review", label: "审核管理", icon: "shield", path: "/bureau/operator/review" },
  ],

  // ---------- 机构 · 机构管理 ----------
  "org-manage": [
    { key: "org-basic-info", label: "基础信息", icon: "document", path: "/org/manage/basic-info" },
    {
      key: "org-structure",
      label: "组织架构",
      icon: "office",
      children: [
        { key: "org-admin-structure", label: "行政架构", path: "/org/manage/structure/admin" },
      ],
    },
    {
      key: "org-user-manage",
      label: "用户管理",
      icon: "user",
      children: [
        { key: "org-all-users", label: "所有用户", path: "/org/manage/users/all" },
        { key: "org-staff-manage", label: "职员管理", path: "/org/manage/users/staff" },
        { key: "org-staff-group", label: "职员分组", path: "/org/manage/users/group" },
        { key: "org-auth-manage", label: "授权管理", path: "/org/manage/users/auth" },
        { key: "org-teacher-review", label: "师资审核", path: "/org/manage/users/teacher-review" },
      ],
    },
  ],

  // ---------- 机构 · 结算中心 ----------
  "org-settlement": [
    {
      key: "org-payment-flow",
      label: "课程缴费流水",
      icon: "coin",
      path: "/org/settlement/payment",
    },
    { key: "org-refund-flow", label: "课程退费流水", icon: "coin", path: "/org/settlement/refund" },
  ],

  // ---------- 机构 · 课程课班管理 ----------
  "org-course": [
    { key: "org-course-list", label: "课程列表", icon: "notebook", path: "/org/course/list" },
    { key: "org-class-manage", label: "课班管理", icon: "notebook", path: "/org/course/class" },
  ],

  // ---------- 机构 · 通知公告 ----------
  "org-notice": [
    { key: "org-notice-list", label: "通知公告", icon: "chat", path: "/org/notice/list" },
  ],

  // ---------- 运营平台 · 系统管理 ----------
  "platform-system": [
    { key: "menu-config", label: "菜单配置", icon: "setting", path: "/system/menu-config" },
  ],
};

// ==========================================
// 各模块默认落地路径
// 注意：与 router 的 redirect 保持一致
// ==========================================
export const moduleDefaultPaths: Record<string, string> = {
  // 学校
  "family-interaction": "/family-interaction/notice",
  "care-management": "/care-management",
  academic: "/academic/course-list",
  schedule: "/schedule",
  dorm: "/dorm/room-manage",
  office: "/office",
  finance: "/finance/fee-set",
  security: "/security/new-gate/device-list",
  sports: "/sports",
  // 教育局
  "bureau-custody": "/bureau/custody/course-data/analysis",
  "bureau-org": "/bureau/org/structure",
  "bureau-operator": "/bureau/operator/list",
  // 机构
  "org-manage": "/org/manage/basic-info",
  "org-settlement": "/org/settlement/payment",
  "org-course": "/org/course/list",
  "org-notice": "/org/notice/list",
  // 运营平台
  "platform-system": "/system/menu-config",
};

export function getModuleDefaultPath(moduleKey: string): string {
  return moduleDefaultPaths[moduleKey] ?? "/security/new-gate/device-list";
}

// ==========================================
// 页面子 Tab
// ==========================================
export const pageSubTabs: Record<string, NavTab[]> = {
  "new-gate": [
    { key: "device-list", label: "设备列表", path: "/security/new-gate/device-list" },
    { key: "person-group", label: "人员分组", path: "/security/new-gate/person-group" },
    { key: "special-date", label: "特殊日期", path: "/security/new-gate/special-date" },
    { key: "temp-auth", label: "临时授权", path: "/security/new-gate/temp-auth" },
    { key: "settings", label: "设置", path: "/security/new-gate/settings" },
  ],
};

// ==========================================
// 工具函数
// ==========================================
function isRouteInMenuPath(routePath: string, menuPath: string): boolean {
  return routePath === menuPath || routePath.startsWith(`${menuPath}/`);
}

export function findMenuTrailByPath(menus: SideMenuItem[], routePath: string): SideMenuItem[] {
  let bestTrail: SideMenuItem[] = [];
  let bestMatchedPathLength = -1;

  const walk = (items: SideMenuItem[], trail: SideMenuItem[] = []) => {
    for (const item of items) {
      const nextTrail = [...trail, item];

      if (item.path && isRouteInMenuPath(routePath, item.path)) {
        if (item.path.length > bestMatchedPathLength) {
          bestTrail = nextTrail;
          bestMatchedPathLength = item.path.length;
        }
      }

      if (item.children?.length) {
        walk(item.children, nextTrail);
      }
    }
  };

  walk(menus);
  return bestTrail;
}
