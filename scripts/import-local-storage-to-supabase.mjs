import { readFile } from "node:fs/promises";
import process from "node:process";

const snapshotPath = process.argv[2];
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const serverKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const migrationAuthUserId = process.env.MIGRATION_AUTH_USER_ID || null;
const configuredLegacyUserId = process.env.MIGRATION_LEGACY_USER_ID || null;

if (!snapshotPath) throw new Error("Usage: node scripts/import-local-storage-to-supabase.mjs <snapshot.json>");
if (!supabaseUrl || !serverKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required");
}

const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
if (snapshot.format !== "operation-platform-local-storage-export" || snapshot.version !== 1) {
  throw new Error("Unsupported localStorage export format");
}

const entries = snapshot.entries;
const tenants = parseEntry("operation-platform:tenants:v1", []);
const tenantIds = new Set(tenants.map((tenant) => tenant.id));
const activeRolePrefix = "operation-platform:active-role:v1:";
const preferenceLegacyUserIds = new Set(
  Object.keys(entries)
    .filter((key) => key.startsWith(activeRolePrefix))
    .map((key) => key.slice(activeRolePrefix.length).split(":").at(-1))
    .filter(Boolean),
);
const migrationLegacyUserId = configuredLegacyUserId
  || (preferenceLegacyUserIds.size === 1 ? [...preferenceLegacyUserIds][0] : null);

if (migrationAuthUserId && !migrationLegacyUserId) {
  throw new Error(
    "Unable to infer the legacy current-user ID; set MIGRATION_LEGACY_USER_ID explicitly",
  );
}

function parseEntry(key, fallback = null) {
  const raw = entries[key];
  return raw === undefined ? fallback : JSON.parse(raw);
}

function epochToIso(value) {
  return Number.isFinite(value) ? new Date(value).toISOString() : null;
}

async function upsert(table, rows, onConflict) {
  if (!rows.length) return;
  const headers = {
    apikey: serverKey,
    "content-type": "application/json",
    prefer: "resolution=merge-duplicates,return=minimal",
  };
  if (!serverKey.startsWith("sb_secret_")) {
    headers.authorization = `Bearer ${serverKey}`;
  }
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(rows),
    },
  );
  if (!response.ok) throw new Error(`${table} import failed: ${response.status} ${await response.text()}`);
}

async function callRpc(name, body) {
  const headers = {
    apikey: serverKey,
    "content-type": "application/json",
  };
  if (!serverKey.startsWith("sb_secret_")) {
    headers.authorization = `Bearer ${serverKey}`;
  }
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${name} failed: ${response.status} ${await response.text()}`);
}

let authUser = null;
if (migrationAuthUserId) {
  const headers = { apikey: serverKey };
  if (!serverKey.startsWith("sb_secret_")) {
    headers.authorization = `Bearer ${serverKey}`;
  }
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${migrationAuthUserId}`, { headers });
  if (!response.ok) {
    throw new Error(`MIGRATION_AUTH_USER_ID verification failed: ${response.status} ${await response.text()}`);
  }
  authUser = await response.json();
  const displayName = authUser.user_metadata?.display_name
    || authUser.user_metadata?.name
    || authUser.email?.split("@")[0]
    || "平台管理员";
  await upsert("profiles", [{
    id: migrationAuthUserId,
    display_name: displayName,
    initials: displayName.slice(0, 2),
    platform_admin: true,
  }], "id");
}

await upsert(
  "tenants",
  tenants.map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
    short_name: tenant.shortName,
    type: tenant.type,
    enabled: tenant.enabled !== false,
  })),
  "id",
);

const configurations = tenants.flatMap((tenant) => {
  const configuration = parseEntry(`operation-platform:tenant-configuration:v1:${tenant.id}`);
  return configuration
    ? [{
        tenant_id: tenant.id,
        schema_version: configuration.version ?? 1,
        configuration,
      }]
    : [];
});
await upsert("tenant_configurations", configurations, "tenant_id");

const members = tenants.flatMap((tenant) => {
  const records = parseEntry(`operation-platform:tenant-members:v1:${tenant.id}`, []);
  return records.map((member) => ({
    id: member.id,
    tenant_id: tenant.id,
    auth_user_id: migrationAuthUserId && member.userId === migrationLegacyUserId
      ? migrationAuthUserId
      : null,
    legacy_user_id: member.userId,
    name: member.name,
    initials: member.initials ?? "",
    account: member.account,
    phone: member.phone ?? "",
    title: member.title ?? "",
    enabled: member.enabled !== false,
    role_ids: member.roleIds,
    source_created_at: epochToIso(member.createdAt),
    source_updated_at: epochToIso(member.updatedAt),
  }));
});
await upsert("tenant_members", members, "id");

const layouts = [];
const preferences = [];
for (const [key, raw] of Object.entries(entries)) {
  const layoutPrefix = "operation-platform:workbench-layout:v1:";
  if (key.startsWith(layoutPrefix) && !key.includes(":invalid:")) {
    const layout = JSON.parse(raw);
    if (!tenantIds.has(layout.tenantId)) continue;
    layouts.push({
      tenant_id: layout.tenantId,
      auth_user_id: migrationAuthUserId && layout.userId === migrationLegacyUserId
        ? migrationAuthUserId
        : null,
      legacy_user_id: layout.userId,
      profile: layout.profile,
      layout,
    });
  }

  if (key.startsWith(activeRolePrefix)) {
    const context = key.slice(activeRolePrefix.length);
    const separator = context.lastIndexOf(":");
    const tenantId = context.slice(0, separator);
    const legacyUserId = context.slice(separator + 1);
    if (!tenantIds.has(tenantId) || !legacyUserId) continue;
    preferences.push({
      tenant_id: tenantId,
      auth_user_id: migrationAuthUserId && legacyUserId === migrationLegacyUserId
        ? migrationAuthUserId
        : null,
      legacy_user_id: legacyUserId,
      active_role_id: raw,
    });
  }
}

await upsert("workbench_layouts", layouts, "tenant_id,legacy_user_id,profile");
await upsert("user_tenant_preferences", preferences, "tenant_id,legacy_user_id");
await callRpc("store_local_storage_migration_snapshot", {
  p_source_origin: snapshot.source?.origin ?? "unknown",
  p_source_exported_at: snapshot.exportedAt,
  p_payload: snapshot,
});

console.log(JSON.stringify({
  profiles: authUser ? 1 : 0,
  tenants: tenants.length,
  configurations: configurations.length,
  members: members.length,
  workbenchLayouts: layouts.length,
  preferences: preferences.length,
  migrationSnapshots: 1,
  linkedAuthUser: Boolean(migrationAuthUserId),
  linkedLegacyUserId: migrationLegacyUserId,
}, null, 2));
