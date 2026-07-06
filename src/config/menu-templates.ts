import {
  menuTemplateChildrenByModule,
  menuTemplateDefaultPageByModule,
  menuTemplateModules,
} from "@/config/menu-template-definitions";
import { DEVELOPING_PAGE_KEY, pageRegistryByPath } from "@/config/page-registry";
import {
  schoolMenuOutline,
  type SchoolMenuOutlineNode,
} from "@/config/school-menu-outline";
import { MAX_MENU_DEPTH } from "@/features/menu-config/menu-validation";
import type { MenuConfigRecord, MenuItemType } from "@/features/menu-config/types";
import type { MenuIconKey, SideMenuItem } from "@/types/navigation";
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

const schoolModuleIcons: Record<string, MenuIconKey> = {
  家校共育: "chat",
  教育教学: "notebook",
  教育评价: "data",
  教育管理: "office",
  平安校园: "shield",
  文化生活: "house",
  数据中心: "data",
};

function flattenPageLevel(nodes: readonly SchoolMenuOutlineNode[]) {
  const names: string[] = [];
  const visit = (node: SchoolMenuOutlineNode) => {
    names.push(node.name);
    node.children.forEach(visit);
  };
  nodes.forEach(visit);
  return names;
}

function buildSchoolMenuRecords(
  nodes: readonly SchoolMenuOutlineNode[],
  parentId: string,
  level: number,
  path: string,
): MenuConfigRecord[] {
  if (level >= MAX_MENU_DEPTH) {
    return flattenPageLevel(nodes).map((name, index) =>
      record(
        `template:school:${path}:page:${index}`,
        "page",
        name,
        parentId,
        (index + 1) * 10,
        { pageKey: DEVELOPING_PAGE_KEY },
      ),
    );
  }

  return nodes.flatMap((node, index) => {
    const id = `template:school:${path}:${index}`;
    const sort = (index + 1) * 10;
    if (node.children.length) {
      return [
        record(id, "directory", node.name, parentId, sort),
        ...buildSchoolMenuRecords(node.children, id, level + 1, `${path}:${index}`),
      ];
    }
    return [
      record(id, "page", node.name, parentId, sort, { pageKey: DEVELOPING_PAGE_KEY }),
    ];
  });
}

function buildSchoolTemplate() {
  return schoolMenuOutline.flatMap((module, index) => {
    const moduleId = `template:school:module:${index}`;
    return [
      record(moduleId, "module", module.name, null, (index + 1) * 10, {
        icon: schoolModuleIcons[module.name] ?? "menu",
      }),
      ...buildSchoolMenuRecords(module.children, moduleId, 2, `module:${index}`),
    ];
  });
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
  return menuTemplateModules
    .filter((tab) => tab.tenantTypes?.includes(tenantType))
    .flatMap((tab, index) => {
      const moduleId = `template:${tenantType}:module:${tab.key}`;
      const moduleRecord = record(
        moduleId,
        "module",
        tab.label,
        null,
        (index + 1) * 10,
        { icon: tab.icon ?? null },
      );
      const configuredMenus = menuTemplateChildrenByModule[tab.key] ?? [];

      if (configuredMenus.length) {
        return [
          moduleRecord,
          ...convertMenuItems(tenantType, tab.key, moduleId, configuredMenus),
        ];
      }

      const defaultPath = menuTemplateDefaultPageByModule[tab.key];
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
  school: buildSchoolTemplate(),
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
