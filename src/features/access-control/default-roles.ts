import { ADMIN_ROLE_ID, STAFF_ROLE_ID, type RoleRecord } from "@/features/access-control/types";
import type { MenuConfigRecord } from "@/features/menu-config/types";
import type { TenantInfo } from "@/types/user";

function leafMenuIds(records: readonly MenuConfigRecord[]) {
  return records
    .filter((record) => record.visible && (record.type === "page" || record.type === "external"))
    .map((record) => record.id);
}

function staffRoleName(tenant: TenantInfo) {
  return tenant.type === "school" ? "老师" : "职员";
}

export function createDefaultRoles(
  tenant: TenantInfo,
  records: readonly MenuConfigRecord[],
): RoleRecord[] {
  const menuIds = leafMenuIds(records);
  return [
    {
      id: ADMIN_ROLE_ID,
      tenantId: tenant.id,
      name: "管理员",
      description: "内置管理员角色，默认拥有当前租户全部可见菜单权限。",
      builtIn: true,
      enabled: true,
      sort: 10,
      menuIds,
    },
    {
      id: STAFF_ROLE_ID,
      tenantId: tenant.id,
      name: staffRoleName(tenant),
      description: "内置普通角色，可在菜单配置中配置可访问菜单。",
      builtIn: true,
      enabled: true,
      sort: 20,
      menuIds,
    },
  ];
}
