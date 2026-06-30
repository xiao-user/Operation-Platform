import {
  moduleDefaultPaths,
  moduleMenus,
  topNavTabs,
} from "@/config/navigation";
import { pageRegistryByPath } from "@/config/page-registry";
import type { MenuConfigRecord, MenuItemType } from "@/features/menu-config/types";
import type { SideMenuItem } from "@/types/navigation";
import type { TenantInfo, TenantType } from "@/types/user";

const TEMPLATE_TENANT_ID = "__template__";
const pagePathAliases: Record<string, string> = {
  "/security/new-gate": "/security/new-gate/device-list",
};

function record(
  id: string,
  type: MenuItemType,
  name: string,
  parentId: string | null,
  sort: number,
  extras: Partial<MenuConfigRecord> = {},
): MenuConfigRecord {
  return {
    id,
    tenantId: TEMPLATE_TENANT_ID,
    parentId,
    type,
    name,
    icon: null,
    pageKey: null,
    externalUrl: null,
    externalOpenMode: null,
    sort,
    visible: true,
    ...extras,
  };
}

function pageKeyForPath(path: string) {
  const canonicalPath = pagePathAliases[path] ?? path;
  const registeredPage = pageRegistryByPath.get(canonicalPath);
  if (!registeredPage) throw new Error(`菜单模板引用了未注册页面：${path}`);
  return registeredPage.menuOwnerKey;
}

function convertMenuItems(
  tenantType: TenantType,
  moduleKey: string,
  parentId: string,
  items: SideMenuItem[],
): MenuConfigRecord[] {
  return items.flatMap((item, index) => {
    const id = `template:${tenantType}:${moduleKey}:${item.key}`;
    const sort = (index + 1) * 10;

    if (item.children?.length) {
      return [
        record(id, "directory", item.label, parentId, sort, { icon: item.icon ?? null }),
        ...convertMenuItems(tenantType, moduleKey, id, item.children),
      ];
    }

    if (!item.path) return [];
    return [
      record(id, "page", item.label, parentId, sort, {
        icon: item.icon ?? null,
        pageKey: pageKeyForPath(item.path),
      }),
    ];
  });
}

function buildTemplate(tenantType: TenantType): MenuConfigRecord[] {
  return topNavTabs
    .filter((tab) => tab.tenantTypes?.includes(tenantType))
    .flatMap((tab, index) => {
      const moduleId = `template:${tenantType}:module:${tab.key}`;
      const moduleRecord = record(
        moduleId,
        "module",
        tab.label,
        null,
        (index + 1) * 10,
      );
      const configuredMenus = moduleMenus[tab.key] ?? [];

      if (configuredMenus.length) {
        return [
          moduleRecord,
          ...convertMenuItems(tenantType, tab.key, moduleId, configuredMenus),
        ];
      }

      const defaultPath = moduleDefaultPaths[tab.key];
      if (!defaultPath) return [moduleRecord];
      return [
        moduleRecord,
        record(
          `template:${tenantType}:${tab.key}:default-page`,
          "page",
          tab.label,
          moduleId,
          10,
          { pageKey: pageKeyForPath(defaultPath) },
        ),
      ];
    });
}

export const tenantMenuTemplates: Record<TenantType, MenuConfigRecord[]> = {
  school: buildTemplate("school"),
  bureau: buildTemplate("bureau"),
  org: buildTemplate("org"),
  platform: buildTemplate("platform"),
};

export function cloneTenantTemplate(tenant: TenantInfo): MenuConfigRecord[] {
  const template = tenantMenuTemplates[tenant.type];
  const idMap = new Map(template.map((item) => [item.id, crypto.randomUUID()]));

  return template.map((item) => ({
    ...item,
    id: idMap.get(item.id)!,
    tenantId: tenant.id,
    parentId: item.parentId ? idMap.get(item.parentId) ?? null : null,
  }));
}
