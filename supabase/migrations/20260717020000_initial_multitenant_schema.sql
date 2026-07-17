create schema if not exists private;

create type public.tenant_type as enum ('school', 'bureau', 'org', 'platform');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (length(trim(display_name)) > 0),
  initials text not null default '',
  platform_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenants (
  id text primary key check (length(trim(id)) > 0),
  name text not null check (length(trim(name)) > 0),
  short_name text not null check (length(trim(short_name)) > 0),
  type public.tenant_type not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name)
);

create table public.tenant_members (
  id text primary key check (length(trim(id)) > 0),
  tenant_id text not null references public.tenants (id) on delete cascade,
  auth_user_id uuid references auth.users (id) on delete cascade,
  legacy_user_id text,
  name text not null check (length(trim(name)) > 0),
  initials text not null default '',
  account text not null check (length(trim(account)) > 0),
  phone text not null default '',
  title text not null default '',
  enabled boolean not null default true,
  role_ids text[] not null check (cardinality(role_ids) > 0),
  source_created_at timestamptz,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, account)
);

create index tenant_members_tenant_id_idx on public.tenant_members (tenant_id);
create index tenant_members_auth_user_id_idx
  on public.tenant_members (auth_user_id)
  where auth_user_id is not null;
create unique index tenant_members_tenant_auth_user_id_uidx
  on public.tenant_members (tenant_id, auth_user_id)
  where auth_user_id is not null;

create table public.tenant_configurations (
  tenant_id text primary key references public.tenants (id) on delete cascade,
  schema_version integer not null default 1 check (schema_version > 0),
  revision bigint not null default 1 check (revision > 0),
  configuration jsonb not null check (jsonb_typeof(configuration) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workbench_layouts (
  tenant_id text not null references public.tenants (id) on delete cascade,
  auth_user_id uuid references auth.users (id) on delete cascade,
  legacy_user_id text not null,
  profile text not null check (profile in ('admin', 'business')),
  layout jsonb not null check (jsonb_typeof(layout) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, legacy_user_id, profile)
);

create index workbench_layouts_auth_user_id_idx
  on public.workbench_layouts (auth_user_id)
  where auth_user_id is not null;

create table public.user_tenant_preferences (
  tenant_id text not null references public.tenants (id) on delete cascade,
  auth_user_id uuid references auth.users (id) on delete cascade,
  legacy_user_id text not null,
  active_role_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, legacy_user_id)
);

create index user_tenant_preferences_auth_user_id_idx
  on public.user_tenant_preferences (auth_user_id)
  where auth_user_id is not null;

create table private.local_storage_migration_snapshots (
  id bigint generated always as identity primary key,
  source_origin text not null,
  source_exported_at timestamptz not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  imported_at timestamptz not null default now(),
  unique (source_origin, source_exported_at)
);

create or replace function public.store_local_storage_migration_snapshot(
  p_source_origin text,
  p_source_exported_at timestamptz,
  p_payload jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.local_storage_migration_snapshots (
    source_origin,
    source_exported_at,
    payload
  )
  values (p_source_origin, p_source_exported_at, p_payload)
  on conflict (source_origin, source_exported_at)
  do update set payload = excluded.payload, imported_at = now();
$$;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger tenants_set_updated_at
before update on public.tenants
for each row execute function private.set_updated_at();

create trigger tenant_members_set_updated_at
before update on public.tenant_members
for each row execute function private.set_updated_at();

create trigger tenant_configurations_set_updated_at
before update on public.tenant_configurations
for each row execute function private.set_updated_at();

create trigger workbench_layouts_set_updated_at
before update on public.workbench_layouts
for each row execute function private.set_updated_at();

create trigger user_tenant_preferences_set_updated_at
before update on public.user_tenant_preferences
for each row execute function private.set_updated_at();

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
begin
  profile_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    '用户'
  );

  insert into public.profiles (id, display_name, initials, platform_admin)
  values (new.id, profile_name, left(profile_name, 2), false)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

insert into public.profiles (id, display_name, initials, platform_admin)
select
  auth_user.id,
  profile_name.value,
  left(profile_name.value, 2),
  false
from auth.users as auth_user
cross join lateral (
  select coalesce(
    nullif(trim(auth_user.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(auth_user.email, ''), '@', 1), ''),
    '用户'
  ) as value
) as profile_name
on conflict (id) do nothing;

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and platform_admin
  );
$$;

create or replace function private.is_tenant_member(target_tenant_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tenant_members
    where tenant_id = target_tenant_id
      and auth_user_id = (select auth.uid())
      and enabled
  );
$$;

create or replace function private.is_tenant_admin(target_tenant_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tenant_members
    where tenant_id = target_tenant_id
      and auth_user_id = (select auth.uid())
      and enabled
      and role_ids @> array['admin']::text[]
  );
$$;

alter table public.profiles enable row level security;
alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;
alter table public.tenant_configurations enable row level security;
alter table public.workbench_layouts enable row level security;
alter table public.user_tenant_preferences enable row level security;

create policy profiles_select on public.profiles
for select to authenticated
using (id = (select auth.uid()) or (select private.is_platform_admin()));

create policy tenants_select on public.tenants
for select to authenticated
using ((select private.is_tenant_member(id)) or (select private.is_platform_admin()));

create policy tenants_write on public.tenants
for all to authenticated
using ((select private.is_platform_admin()))
with check ((select private.is_platform_admin()));

create policy tenant_members_select on public.tenant_members
for select to authenticated
using ((select private.is_tenant_member(tenant_id)) or (select private.is_platform_admin()));

create policy tenant_members_write on public.tenant_members
for all to authenticated
using ((select private.is_tenant_admin(tenant_id)) or (select private.is_platform_admin()))
with check ((select private.is_tenant_admin(tenant_id)) or (select private.is_platform_admin()));

create policy tenant_configurations_select on public.tenant_configurations
for select to authenticated
using ((select private.is_tenant_member(tenant_id)) or (select private.is_platform_admin()));

create policy tenant_configurations_write on public.tenant_configurations
for all to authenticated
using ((select private.is_tenant_admin(tenant_id)) or (select private.is_platform_admin()))
with check ((select private.is_tenant_admin(tenant_id)) or (select private.is_platform_admin()));

create policy workbench_layouts_owner on public.workbench_layouts
for all to authenticated
using (
  auth_user_id = (select auth.uid())
  and ((select private.is_tenant_member(tenant_id)) or (select private.is_platform_admin()))
)
with check (
  auth_user_id = (select auth.uid())
  and ((select private.is_tenant_member(tenant_id)) or (select private.is_platform_admin()))
);

create policy user_tenant_preferences_owner on public.user_tenant_preferences
for all to authenticated
using (
  auth_user_id = (select auth.uid())
  and ((select private.is_tenant_member(tenant_id)) or (select private.is_platform_admin()))
)
with check (
  auth_user_id = (select auth.uid())
  and ((select private.is_tenant_member(tenant_id)) or (select private.is_platform_admin()))
);

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.tenants to authenticated;
grant select, insert, update, delete on public.tenant_members to authenticated;
grant select, insert, update, delete on public.tenant_configurations to authenticated;
grant select, insert, update, delete on public.workbench_layouts to authenticated;
grant select, insert, update, delete on public.user_tenant_preferences to authenticated;

grant usage on schema public to service_role;
grant select, insert, update on public.profiles to service_role;
grant select, insert, update on public.tenants to service_role;
grant select, insert, update on public.tenant_members to service_role;
grant select, insert, update on public.tenant_configurations to service_role;
grant select, insert, update on public.workbench_layouts to service_role;
grant select, insert, update on public.user_tenant_preferences to service_role;

revoke all on schema private from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

grant execute on function private.is_platform_admin() to authenticated;
grant execute on function private.is_tenant_member(text) to authenticated;
grant execute on function private.is_tenant_admin(text) to authenticated;

revoke all on function public.store_local_storage_migration_snapshot(text, timestamptz, jsonb)
from public, anon, authenticated;
grant execute on function public.store_local_storage_migration_snapshot(text, timestamptz, jsonb)
to service_role;
