import type { TenantInfo, UserInfo } from "@/types/user";

// ==========================================
// 虚拟用户数据（对接登录接口后替换）
// ==========================================
export const MOCK_USER_INFO: UserInfo = {
  name: "罗吾航",
  initials: "吾航",
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
  },
  {
    id: "school-002",
    name: "天河区第二实验小学",
    shortName: "天河二实小",
    type: "school",
  },
  {
    id: "bureau-001",
    name: "体验区教育局",
    shortName: "体验区教育局",
    type: "bureau",
  },
  {
    id: "org-001",
    name: "广州星光艺术培训中心",
    shortName: "星光艺术",
    type: "org",
  },
  {
    id: "org-002",
    name: "深圳未来教育科技有限公司",
    shortName: "未来教育",
    type: "org",
  },
  {
    id: "platform-001",
    name: "运营平台",
    shortName: "运营平台",
    type: "platform",
  },
];
