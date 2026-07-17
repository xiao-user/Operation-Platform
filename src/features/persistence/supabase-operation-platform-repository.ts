import { getSupabaseClient } from "@/lib/supabase";
import type { PersistenceIdentity } from "@/features/persistence/operation-platform-persistence";
import type { TenantConfiguration } from "@/features/tenant-config/types";
import { isValidTenantConfiguration } from "@/features/tenant-config/tenant-configuration-validation";
import type { TenantMemberRecord } from "@/features/tenant-members/types";
import type { UserWorkbenchLayout, WorkbenchProfile } from "@/features/workbench/types";
import type { TenantInfo, TenantType } from "@/types/user";

interface ProfileRow {
  id: string;
  display_name: string;
  initials: string;
  platform_admin: boolean;
}

interface TenantRow {
  id: string;
  name: string;
  short_name: string;
  type: TenantType;
  enabled: boolean;
}

interface ConfigurationRow {
  tenant_id: string;
  revision: number;
  configuration: unknown;
}

interface MemberRow {
  id: string;
  tenant_id: string;
  auth_user_id: string | null;
  legacy_user_id: string | null;
  name: string;
  initials: string;
  account: string;
  phone: string;
  title: string;
  enabled: boolean;
  role_ids: string[];
  source_created_at: string | null;
  source_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PreferenceRow {
  tenant_id: string;
  active_role_id: string | null;
  visualization_theme_id: string | null;
}

interface LayoutRow {
  tenant_id: string;
  profile: WorkbenchProfile;
  layout: UserWorkbenchLayout;
}

export interface RemoteTenantConfiguration {
  configuration: TenantConfiguration;
  revision: number;
}

export interface OperationPlatformBootstrap {
  profile: ProfileRow;
  tenants: TenantInfo[];
  configurations: Map<string, RemoteTenantConfiguration>;
  members: Map<string, TenantMemberRecord[]>;
  activeRoles: Map<string, string>;
  visualizationThemes: Map<string, string>;
  workbenchLayouts: Map<string, UserWorkbenchLayout>;
}

function assertNoError(error: { message: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback);
}

function toTenant(row: TenantRow): TenantInfo {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    type: row.type,
    enabled: row.enabled,
  };
}

function toMember(row: MemberRow): TenantMemberRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.auth_user_id ?? row.legacy_user_id ?? row.id,
    name: row.name,
    initials: row.initials,
    account: row.account,
    phone: row.phone,
    title: row.title,
    enabled: row.enabled,
    roleIds: [...row.role_ids],
    createdAt: Date.parse(row.source_created_at ?? row.created_at),
    updatedAt: Date.parse(row.source_updated_at ?? row.updated_at),
  };
}

function configurationFromRow(row: ConfigurationRow, tenant: TenantInfo) {
  if (!isValidTenantConfiguration(row.configuration, tenant)) {
    throw new Error(`组织「${tenant.name}」的远端配置格式无效`);
  }
  return {
    revision: Number(row.revision),
    configuration: row.configuration,
  } satisfies RemoteTenantConfiguration;
}

function layoutKey(tenantId: string, profile: WorkbenchProfile) {
  return `${tenantId}:${profile}`;
}

export class SupabaseOperationPlatformRepository {
  async bootstrap(user: PersistenceIdentity): Promise<OperationPlatformBootstrap> {
    const client = getSupabaseClient();
    const [profileResult, tenantsResult, configurationsResult, membersResult, preferencesResult, layoutsResult] = await Promise.all([
      client.from("profiles").select("id,display_name,initials,platform_admin").eq("id", user.id).single(),
      client.from("tenants").select("id,name,short_name,type,enabled").order("type").order("name"),
      client.from("tenant_configurations").select("tenant_id,revision,configuration"),
      client.from("tenant_members").select("id,tenant_id,auth_user_id,legacy_user_id,name,initials,account,phone,title,enabled,role_ids,source_created_at,source_updated_at,created_at,updated_at"),
      client.from("user_tenant_preferences").select("tenant_id,active_role_id,visualization_theme_id").eq("auth_user_id", user.id),
      client.from("workbench_layouts").select("tenant_id,profile,layout").eq("auth_user_id", user.id),
    ]);
    assertNoError(profileResult.error, "用户资料读取失败");
    assertNoError(tenantsResult.error, "组织读取失败");
    assertNoError(configurationsResult.error, "组织配置读取失败");
    assertNoError(membersResult.error, "组织成员读取失败");
    assertNoError(preferencesResult.error, "当前角色读取失败");
    assertNoError(layoutsResult.error, "工作台布局读取失败");

    const tenants = (tenantsResult.data as TenantRow[]).map(toTenant);
    const tenantsById = new Map(tenants.map((tenant) => [tenant.id, tenant]));
    const configurations = new Map<string, RemoteTenantConfiguration>();
    for (const row of configurationsResult.data as ConfigurationRow[]) {
      const tenant = tenantsById.get(row.tenant_id);
      if (tenant) configurations.set(row.tenant_id, configurationFromRow(row, tenant));
    }
    const members = new Map<string, TenantMemberRecord[]>();
    for (const row of membersResult.data as MemberRow[]) {
      const records = members.get(row.tenant_id) ?? [];
      records.push(toMember(row));
      members.set(row.tenant_id, records);
    }
    for (const records of members.values()) {
      records.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    }
    const activeRoles = new Map(
      (preferencesResult.data as PreferenceRow[]).flatMap((row) =>
        row.active_role_id ? [[row.tenant_id, row.active_role_id] as const] : [],
      ),
    );
    const visualizationThemes = new Map(
      (preferencesResult.data as PreferenceRow[]).flatMap((row) =>
        row.visualization_theme_id
          ? [[row.tenant_id, row.visualization_theme_id] as const]
          : [],
      ),
    );
    const workbenchLayouts = new Map(
      (layoutsResult.data as LayoutRow[]).map((row) => [
        layoutKey(row.tenant_id, row.profile),
        { ...row.layout, tenantId: row.tenant_id, userId: user.id, profile: row.profile },
      ]),
    );
    return {
      profile: profileResult.data as ProfileRow,
      tenants,
      configurations,
      members,
      activeRoles,
      visualizationThemes,
      workbenchLayouts,
    };
  }

  async createTenant(tenant: TenantInfo, configuration: TenantConfiguration, member: TenantMemberRecord) {
    const { data, error } = await getSupabaseClient().rpc("create_tenant_with_admin", {
      p_tenant_id: tenant.id,
      p_name: tenant.name,
      p_short_name: tenant.shortName,
      p_type: tenant.type,
      p_enabled: tenant.enabled,
      p_configuration: configuration,
      p_member_id: member.id,
      p_member_name: member.name,
      p_member_initials: member.initials,
      p_member_account: member.account,
      p_member_title: member.title,
    });
    assertNoError(error, "组织创建失败");
    return toTenant(data as TenantRow);
  }

  async updateTenant(tenant: TenantInfo) {
    const { data, error } = await getSupabaseClient()
      .from("tenants")
      .update({
        name: tenant.name,
        short_name: tenant.shortName,
        enabled: tenant.type === "platform" ? true : tenant.enabled,
      })
      .eq("id", tenant.id)
      .select("id,name,short_name,type,enabled")
      .single();
    assertNoError(error, "组织保存失败");
    return toTenant(data as TenantRow);
  }

  async deleteTenant(tenantId: string) {
    const { error } = await getSupabaseClient().from("tenants").delete().eq("id", tenantId);
    assertNoError(error, "组织删除失败");
  }

  async saveConfiguration(tenantId: string, expectedRevision: number, configuration: TenantConfiguration) {
    const { data, error } = await getSupabaseClient().rpc("save_tenant_configuration", {
      p_tenant_id: tenantId,
      p_expected_revision: expectedRevision,
      p_configuration: configuration,
    });
    assertNoError(error, "租户配置保存失败");
    return Number(data);
  }

  async replaceMembers(tenantId: string, members: TenantMemberRecord[]) {
    const { data, error } = await getSupabaseClient().rpc("replace_tenant_members", {
      p_tenant_id: tenantId,
      p_members: members,
    });
    assertNoError(error, "组织成员保存失败");
    return (data as MemberRow[]).map(toMember);
  }

  async saveActiveRole(tenantId: string, authUserId: string, roleId: string) {
    const { error } = await getSupabaseClient().from("user_tenant_preferences").upsert({
      tenant_id: tenantId,
      auth_user_id: authUserId,
      legacy_user_id: authUserId,
      active_role_id: roleId,
    }, { onConflict: "tenant_id,auth_user_id" });
    assertNoError(error, "当前角色保存失败");
  }

  async saveVisualizationTheme(tenantId: string, authUserId: string, themeId: string) {
    const { error } = await getSupabaseClient().from("user_tenant_preferences").upsert({
      tenant_id: tenantId,
      auth_user_id: authUserId,
      legacy_user_id: authUserId,
      visualization_theme_id: themeId,
    }, { onConflict: "tenant_id,auth_user_id" });
    assertNoError(error, "可视化主题保存失败");
  }

  async saveWorkbenchLayout(authUserId: string, layout: UserWorkbenchLayout) {
    const { error } = await getSupabaseClient().from("workbench_layouts").upsert({
      tenant_id: layout.tenantId,
      auth_user_id: authUserId,
      legacy_user_id: authUserId,
      profile: layout.profile,
      layout,
    }, { onConflict: "tenant_id,auth_user_id,profile" });
    assertNoError(error, "工作台布局保存失败");
  }

  async resetWorkbenchLayout(tenantId: string, authUserId: string, profile: WorkbenchProfile) {
    const { error } = await getSupabaseClient()
      .from("workbench_layouts")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("auth_user_id", authUserId)
      .eq("profile", profile);
    assertNoError(error, "恢复默认工作台失败");
  }
}

export const supabaseOperationPlatformRepository = new SupabaseOperationPlatformRepository();
export { layoutKey as remoteWorkbenchLayoutKey };
