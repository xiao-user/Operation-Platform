import type { RouteComponent, RouteRecordRaw } from "vue-router";
import type { MenuConfigRecord } from "@/features/menu-config/types";
import type { TenantType } from "@/types/user";

export type PageResourceStatus = "available" | "developing-placeholder";

export interface PageRegistryItem {
  key: string;
  title: string;
  path: string;
  component: RouteComponent;
  tenantTypes: TenantType[];
  status: PageResourceStatus;
  description: string;
  selectable: boolean;
  menuOwnerKey: string;
  requiresAdmin: boolean;
  allowDuplicateMenuBinding: boolean;
  menuRouteParam: string | null;
}

interface PageOptions {
  status?: PageResourceStatus;
  description?: string;
  selectable?: boolean;
  menuOwnerKey?: string;
  requiresAdmin?: boolean;
  allowDuplicateMenuBinding?: boolean;
  menuRouteParam?: string;
}

interface SelectablePageResourceOptions {
  tenantType: TenantType;
  records: readonly MenuConfigRecord[];
  editingRecordId?: string | null;
}

const school: TenantType[] = ["school"];
const bureau: TenantType[] = ["bureau"];
const org: TenantType[] = ["org"];
const platform: TenantType[] = ["platform"];
const allTenantTypes: TenantType[] = ["school", "bureau", "org", "platform"];
const PlaceholderView = () => import("@/views/PlaceholderView.vue");
export const DEVELOPING_PAGE_KEY = "developing-placeholder";

function page(
  key: string,
  title: string,
  path: string,
  tenantTypes: TenantType[],
  component?: RouteComponent,
  options: PageOptions = {},
): PageRegistryItem {
  const status = options.status ?? (component ? "available" : "developing-placeholder");
  return {
    key,
    title,
    path,
    tenantTypes,
    component: component ?? PlaceholderView,
    status,
    description: options.description ?? (
      status === "available"
        ? "已开发页面资源，可被菜单关联为导航入口。"
        : "已注册但尚未实现真实业务界面，当前使用开发中占位页。"
    ),
    selectable: options.selectable ?? true,
    menuOwnerKey: options.menuOwnerKey ?? key,
    requiresAdmin: options.requiresAdmin ?? false,
    allowDuplicateMenuBinding: options.allowDuplicateMenuBinding ?? false,
    menuRouteParam: options.menuRouteParam ?? null,
  };
}

export function resolvePagePathForMenu(
  page: { path: string; menuRouteParam?: string | null },
  menuId: string,
) {
  if (!page.menuRouteParam) return page.path;
  return page.path.replace(`:${page.menuRouteParam}`, encodeURIComponent(menuId));
}

export const pageRegistry: PageRegistryItem[] = [
  page(
    DEVELOPING_PAGE_KEY,
    "功能开发中缺省页",
    "/developing/:menuId",
    allTenantTypes,
    PlaceholderView,
    {
      status: "developing-placeholder",
      description: "菜单先行配置时使用的统一占位页，后续可替换为真实页面资源。",
      allowDuplicateMenuBinding: true,
      menuRouteParam: "menuId",
    },
  ),

  // 学校通用模块
  page("family-notice", "通知公告", "/family-interaction/notice", school),
  page("family-activity", "活动管理", "/family-interaction/activity", school),
  page("course-list", "课程列表", "/academic/course-list", school),
  page("class-manage", "班级管理", "/academic/class-manage", school),
  page("room-manage", "宿舍管理", "/dorm/room-manage", school),
  page("fee-set", "收费设置", "/finance/fee-set", school),
  page("care-management", "托管管理", "/care-management", school),
  page("schedule", "排课系统", "/schedule", school),
  page("office", "校园办公", "/office", school),
  page("sports", "智慧操场", "/sports", school),

  // 学校 · 校园安全
  page(
    "device-list",
    "设备列表",
    "/security/new-gate/device-list",
    school,
    () => import("@/views/security/new-gate/DeviceListView.vue"),
  ),
  page(
    "person-group",
    "人员分组",
    "/security/new-gate/person-group",
    school,
    () => import("@/views/security/new-gate/PersonGroupView.vue"),
    { selectable: false, menuOwnerKey: "device-list" },
  ),
  page(
    "special-date",
    "特殊日期",
    "/security/new-gate/special-date",
    school,
    () => import("@/views/security/new-gate/SpecialDateView.vue"),
    { selectable: false, menuOwnerKey: "device-list" },
  ),
  page(
    "temp-auth",
    "临时授权",
    "/security/new-gate/temp-auth",
    school,
    () => import("@/views/security/new-gate/TempAuthView.vue"),
    { selectable: false, menuOwnerKey: "device-list" },
  ),
  page(
    "settings",
    "设置",
    "/security/new-gate/settings",
    school,
    () => import("@/views/security/new-gate/SettingsView.vue"),
    { selectable: false, menuOwnerKey: "device-list" },
  ),
  page("visitor", "访客管理", "/security/visitor", school),

  // 教育局 · 托管学堂
  page("bureau-course-data-analysis", "课程数据分析", "/bureau/custody/course-data/analysis", bureau),
  page("bureau-school-signup-stats", "学校报名统计", "/bureau/custody/course-data/school-signup", bureau),
  page("bureau-org-signup-stats", "机构报名统计", "/bureau/custody/course-data/org-signup", bureau),
  page("bureau-school-class-stats", "学校开班统计", "/bureau/custody/course-data/school-class", bureau),
  page("bureau-student-signup-list", "学生报名清单", "/bureau/custody/course-data/student-list", bureau),
  page("bureau-review-list", "审核列表", "/bureau/custody/course-manage/review-list", bureau),
  page("bureau-course-rule-review", "课程细则审核", "/bureau/custody/course-manage/rule-review", bureau),
  page("bureau-course-selection", "选课管理", "/bureau/custody/course-manage/selection", bureau),
  page("bureau-course-manage", "课程管理", "/bureau/custody/course-manage/courses", bureau),
  page("bureau-tag-library", "标签库管理", "/bureau/custody/course-manage/tags", bureau),
  page("bureau-course-category", "课程分类管理", "/bureau/custody/course-manage/category", bureau),
  page("bureau-course-evaluation", "课程服务评价", "/bureau/custody/course-manage/evaluation", bureau),
  page("bureau-attendance-flow", "课班考勤流水", "/bureau/custody/course-manage/attendance", bureau),
  page("bureau-unit-price", "课时单价管理", "/bureau/custody/course-manage/unit-price", bureau),
  page("bureau-payment-flow", "课程缴费流水", "/bureau/custody/settlement/payment", bureau),
  page("bureau-refund-flow", "课程退费流水", "/bureau/custody/settlement/refund", bureau),
  page("bureau-refund-review", "课程退费审核", "/bureau/custody/settlement/refund-review", bureau),
  page("bureau-org-list", "机构列表", "/bureau/custody/org/list", bureau),
  page(
    "bureau-org-review",
    "审核列表",
    "/bureau/custody/org/review",
    bureau,
    () => import("@/views/bureau/custody/org/OrgReviewView.vue"),
  ),
  page(
    "bureau-org-review-detail",
    "审核详情",
    "/bureau/custody/org/review/:id",
    bureau,
    () => import("@/views/bureau/custody/org/OrgReviewDetailView.vue"),
    { selectable: false, menuOwnerKey: "bureau-org-review" },
  ),
  page("bureau-teacher-review", "师资审核", "/bureau/custody/org/teacher-review", bureau),
  page("bureau-school-list", "学校管理", "/bureau/custody/school/list", bureau),
  page("bureau-teacher-list", "教师列表", "/bureau/custody/teacher/list", bureau),
  page("bureau-teacher-blacklist", "教师黑名单", "/bureau/custody/teacher/blacklist", bureau),
  page("bureau-operation-log", "操作日志", "/bureau/custody/operation-log", bureau),
  page("bureau-settings", "设置", "/bureau/custody/settings", bureau),

  // 教育局 · 组织与运营商
  page("bureau-org-structure", "组织架构", "/bureau/org/structure", bureau),
  page("bureau-staff-manage", "人员管理", "/bureau/org/staff", bureau),
  page("bureau-operator-list", "运营商列表", "/bureau/operator/list", bureau),
  page("bureau-operator-review", "审核管理", "/bureau/operator/review", bureau),

  // 机构
  page("org-basic-info", "基础信息", "/org/manage/basic-info", org),
  page("org-admin-structure", "行政架构", "/org/manage/structure/admin", org),
  page("org-all-users", "所有用户", "/org/manage/users/all", org),
  page("org-staff-manage", "职员管理", "/org/manage/users/staff", org),
  page("org-staff-group", "职员分组", "/org/manage/users/group", org),
  page("org-auth-manage", "授权管理", "/org/manage/users/auth", org),
  page("org-teacher-review", "师资审核", "/org/manage/users/teacher-review", org),
  page("org-payment-flow", "课程缴费流水", "/org/settlement/payment", org),
  page("org-refund-flow", "课程退费流水", "/org/settlement/refund", org),
  page("org-course-list", "课程列表", "/org/course/list", org),
  page("org-class-manage", "课班管理", "/org/course/class", org),
  page("org-notice-list", "通知公告", "/org/notice/list", org),

  // 运营平台
  page(
    "system-organization-management",
    "组织管理",
    "/system/organization",
    platform,
    () => import("@/views/system/organization/OrganizationManagementView.vue"),
    { requiresAdmin: true },
  ),
  page(
    "system-role-management",
    "角色管理",
    "/system/roles",
    platform,
    () => import("@/views/system/roles/RoleManagementView.vue"),
    { requiresAdmin: true },
  ),
  page(
    "system-menu-config",
    "菜单配置",
    "/system/menu-config",
    platform,
    () => import("@/views/system/menu-config/MenuConfigView.vue"),
    { requiresAdmin: true },
  ),
];

export const pageRegistryByKey = new Map(pageRegistry.map((item) => [item.key, item]));
export const pageRegistryByPath = new Map(pageRegistry.map((item) => [item.path, item]));

export function pageResourceOptionLabel(page: PageRegistryItem) {
  const statusLabel = page.status === "available" ? "已开发" : "开发中";
  return `[${statusLabel}] ${page.title} · ${page.path}`;
}

export function listSelectablePageResources({
  tenantType,
  records,
  editingRecordId = null,
}: SelectablePageResourceOptions) {
  const usedPageKeys = new Set(
    records
      .filter((record) => record.id !== editingRecordId && record.pageKey)
      .map((record) => record.pageKey),
  );

  return pageRegistry.filter(
    (page) =>
      page.selectable &&
      page.tenantTypes.includes(tenantType) &&
      (page.allowDuplicateMenuBinding || !usedPageKeys.has(page.key)),
  );
}

export const pageRouteRecords: RouteRecordRaw[] = pageRegistry.map((item) => ({
  path: item.path.slice(1),
  name: item.key,
  component: item.component,
  meta: {
    pageKey: item.key,
    menuOwnerKey: item.menuOwnerKey,
    title: item.title,
    requiresAdmin: item.requiresAdmin,
  },
}));
