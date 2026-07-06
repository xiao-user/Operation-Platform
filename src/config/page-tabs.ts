import type { NavTab } from "@/types/navigation";

export const pageSubTabs: Record<string, NavTab[]> = {
  "new-gate": [
    { key: "device-list", label: "设备列表", path: "/security/new-gate/device-list" },
    { key: "person-group", label: "人员分组", path: "/security/new-gate/person-group" },
    { key: "special-date", label: "特殊日期", path: "/security/new-gate/special-date" },
    { key: "temp-auth", label: "临时授权", path: "/security/new-gate/temp-auth" },
    { key: "settings", label: "设置", path: "/security/new-gate/settings" },
  ],
};
