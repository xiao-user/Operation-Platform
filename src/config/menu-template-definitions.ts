import type { NavTab, SideMenuItem } from "@/types/navigation";

// ==========================================
// 默认菜单模板定义（仅用于首次初始化，不参与运行时导航）
// ==========================================
export const menuTemplateModules: NavTab[] = [
  // 学校专属
  {
    key: "family-interaction",
    label: "家校互动",
    path: "/family-interaction",
    icon: "chat",
    tenantTypes: ["school"],
  },
  { key: "care-management", label: "托管管理", path: "/care-management", icon: "calendar", tenantTypes: ["school"] },
  { key: "academic", label: "教务管理", path: "/academic", icon: "notebook", tenantTypes: ["school"] },
  { key: "schedule", label: "排课系统", path: "/schedule", icon: "grid", tenantTypes: ["school"] },
  { key: "dorm", label: "宿舍管理", path: "/dorm", icon: "house", tenantTypes: ["school"] },
  { key: "office", label: "校园办公", path: "/office", icon: "office", tenantTypes: ["school"] },
  { key: "finance", label: "缴费管理", path: "/finance", icon: "money", tenantTypes: ["school"] },
  { key: "security", label: "校园安全", path: "/security", icon: "shield", tenantTypes: ["school"] },
  { key: "sports", label: "智慧操场", path: "/sports", icon: "grid", tenantTypes: ["school"] },
  // 机构专属
  { key: "org-manage", label: "机构管理", path: "/org/manage", icon: "office", tenantTypes: ["org"] },
  { key: "org-settlement", label: "结算中心", path: "/org/settlement", icon: "coin", tenantTypes: ["org"] },
  { key: "org-course", label: "课程课班管理", path: "/org/course", icon: "notebook", tenantTypes: ["org"] },
  { key: "org-notice", label: "通知公告", path: "/org/notice", icon: "chat", tenantTypes: ["org"] },
  // 运营平台专属
  { key: "platform-system", label: "系统管理", path: "/system", icon: "setting", tenantTypes: ["platform"] },
];

// ==========================================
// 各模块侧边菜单
// ==========================================
export const menuTemplateChildrenByModule: Record<string, SideMenuItem[]> = {
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
    { key: "organization-management", label: "组织管理", icon: "Building2", path: "/system/organization" },
    { key: "role-management", label: "角色管理", icon: "Users", path: "/system/roles" },
    { key: "menu-config", label: "菜单配置", icon: "setting", path: "/system/menu-config" },
  ],
};

// ==========================================
// 各模块默认落地路径
// 注意：与 router 的 redirect 保持一致
// ==========================================
export const menuTemplateDefaultPageByModule: Record<string, string> = {
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
  // 机构
  "org-manage": "/org/manage/basic-info",
  "org-settlement": "/org/settlement/payment",
  "org-course": "/org/course/list",
  "org-notice": "/org/notice/list",
  // 运营平台
  "platform-system": "/system/organization",
};
