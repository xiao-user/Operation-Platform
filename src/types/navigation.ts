import type { TenantType } from "@/types/user";

export type MenuIconKey =
  | "grid"
  | "notebook"
  | "chat"
  | "calendar"
  | "house"
  | "money"
  | "shield"
  | "setting"
  | "menu"
  | "data"
  | "document"
  | "coin"
  | "office"
  | "user"
  | "list";

export interface NavTab {
  key: string;
  label: string;
  path: string;
  icon?: MenuIconKey;
  /** 限定哪些租户类型可见，不填则所有租户都显示 */
  tenantTypes?: TenantType[];
}

export interface SideMenuItem {
  key: string;
  label: string;
  icon?: MenuIconKey;
  path?: string;
  children?: SideMenuItem[];
}
