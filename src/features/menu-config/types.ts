import type { MenuIconKey } from "@/types/navigation";

export type MenuItemType = "module" | "directory" | "page" | "external";
export type ExternalOpenMode = "current" | "new-tab";

export interface MenuConfigRecord {
  id: string;
  tenantId: string;
  parentId: string | null;
  type: MenuItemType;
  name: string;
  icon: MenuIconKey | null;
  pageKey: string | null;
  externalUrl: string | null;
  externalOpenMode: ExternalOpenMode | null;
  sort: number;
  visible: boolean;
}

export type MenuRecordInput = Omit<MenuConfigRecord, "id" | "tenantId">;

export interface MenuTreeNode extends MenuConfigRecord {
  children: MenuTreeNode[];
}

export type MenuTarget =
  | { kind: "internal"; path: string; pageKey: string }
  | { kind: "external"; url: string; openMode: ExternalOpenMode };

export interface MenuPageReference {
  path: string;
  menuRouteParam?: string | null;
}
