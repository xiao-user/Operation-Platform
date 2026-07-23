import type { TenantInfo, UserInfo } from "@/types/user";

// ==========================================
// 虚拟用户数据（对接登录接口后替换）
// ==========================================
export const MOCK_USER_INFO: UserInfo = {
  id: "user-demo",
  email: "luowuhang@example.local",
  name: "罗吴航",
  initials: "吴航",
  platformAdmin: false,
  tenantRoleIds: {
    "school-001": "admin",
    "school-002": "teacher",
    "bureau-001": "teacher",
    "bureau-74b5bcaf-69af-4cf2-8c63-11f9270d4676": "teacher",
    "org-001": "admin",
    "org-002": "teacher",
    "platform-001": "admin",
  },
};

// ==========================================
// 虚拟租户列表（对接接口后替换）
// ==========================================
export const MOCK_TENANTS: TenantInfo[] = [
  {
    id: "school-001",
    name: "体育东路小学海明学校",
    shortName: "体育东路小学海",
    type: "school",
    enabled: true,
    administrativeRegion: {
      code: "440106",
      name: "天河区",
      scope: "district",
      path: [
        { code: "440000", name: "广东省", scope: "province" },
        { code: "440100", name: "广州市", scope: "city" },
        { code: "440106", name: "天河区", scope: "district" },
      ],
    },
  },
  {
    id: "school-002",
    name: "天河区第二实验小学",
    shortName: "天河二实小",
    type: "school",
    enabled: true,
    administrativeRegion: {
      code: "440106",
      name: "天河区",
      scope: "district",
      path: [
        { code: "440000", name: "广东省", scope: "province" },
        { code: "440100", name: "广州市", scope: "city" },
        { code: "440106", name: "天河区", scope: "district" },
      ],
    },
  },
  {
    id: "bureau-001",
    name: "体验区教育局",
    shortName: "体验区教育局",
    type: "bureau",
    enabled: true,
    administrativeRegion: {
      code: "440000",
      name: "广东省",
      scope: "province",
      path: [{ code: "440000", name: "广东省", scope: "province" }],
    },
  },
  {
    id: "bureau-74b5bcaf-69af-4cf2-8c63-11f9270d4676",
    name: "揭阳市榕城区教育局",
    shortName: "榕城区教育局",
    type: "bureau",
    enabled: true,
    administrativeRegion: {
      code: "445202",
      name: "榕城区",
      scope: "district",
      path: [
        { code: "440000", name: "广东省", scope: "province" },
        { code: "445200", name: "揭阳市", scope: "city" },
        { code: "445202", name: "榕城区", scope: "district" },
      ],
    },
  },
  {
    id: "org-001",
    name: "广州星光艺术培训中心",
    shortName: "星光艺术",
    type: "org",
    enabled: true,
    administrativeRegion: {
      code: "440100",
      name: "广州市",
      scope: "city",
      path: [
        { code: "440000", name: "广东省", scope: "province" },
        { code: "440100", name: "广州市", scope: "city" },
      ],
    },
  },
  {
    id: "org-002",
    name: "深圳未来教育科技有限公司",
    shortName: "未来教育",
    type: "org",
    enabled: true,
    administrativeRegion: {
      code: "440300",
      name: "深圳市",
      scope: "city",
      path: [
        { code: "440000", name: "广东省", scope: "province" },
        { code: "440300", name: "深圳市", scope: "city" },
      ],
    },
  },
  {
    id: "platform-001",
    name: "运营平台",
    shortName: "运营平台",
    type: "platform",
    enabled: true,
  },
];
