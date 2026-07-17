alter table public.workbench_layouts
  add constraint workbench_layouts_tenant_auth_profile_key
  unique (tenant_id, auth_user_id, profile);

alter table public.user_tenant_preferences
  add constraint user_tenant_preferences_tenant_auth_key
  unique (tenant_id, auth_user_id);

create or replace function public.create_tenant_with_admin(
  p_tenant_id text,
  p_name text,
  p_short_name text,
  p_type public.tenant_type,
  p_enabled boolean,
  p_configuration jsonb,
  p_member_id text,
  p_member_name text,
  p_member_initials text,
  p_member_account text,
  p_member_title text
)
returns public.tenants
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_tenant public.tenants;
begin
  if not private.is_platform_admin() then
    raise exception 'Only platform administrators can create tenants' using errcode = '42501';
  end if;

  insert into public.tenants (id, name, short_name, type, enabled)
  values (p_tenant_id, p_name, p_short_name, p_type, p_enabled)
  returning * into created_tenant;

  insert into public.tenant_members (
    id,
    tenant_id,
    auth_user_id,
    legacy_user_id,
    name,
    initials,
    account,
    title,
    enabled,
    role_ids,
    source_created_at,
    source_updated_at
  )
  values (
    p_member_id,
    p_tenant_id,
    (select auth.uid()),
    (select auth.uid())::text,
    p_member_name,
    p_member_initials,
    p_member_account,
    p_member_title,
    true,
    array['admin']::text[],
    now(),
    now()
  );

  insert into public.tenant_configurations (tenant_id, schema_version, revision, configuration)
  values (p_tenant_id, 1, 1, p_configuration);

  return created_tenant;
end;
$$;

create or replace function public.save_tenant_configuration(
  p_tenant_id text,
  p_expected_revision bigint,
  p_configuration jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_revision bigint;
begin
  if not (private.is_tenant_admin(p_tenant_id) or private.is_platform_admin()) then
    raise exception 'Tenant administrator permission required' using errcode = '42501';
  end if;

  update public.tenant_configurations
  set configuration = p_configuration,
      schema_version = 1,
      revision = revision + 1
  where tenant_id = p_tenant_id
    and revision = p_expected_revision
  returning revision into next_revision;

  if next_revision is null then
    raise exception 'Tenant configuration changed in another browser; reload before saving'
      using errcode = '40001';
  end if;

  return next_revision;
end;
$$;

create or replace function public.replace_tenant_members(
  p_tenant_id text,
  p_members jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (private.is_tenant_admin(p_tenant_id) or private.is_platform_admin()) then
    raise exception 'Tenant administrator permission required' using errcode = '42501';
  end if;

  if jsonb_typeof(p_members) <> 'array' then
    raise exception 'Members payload must be an array' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(p_members) as item
    where coalesce((item ->> 'enabled')::boolean, false)
      and (item -> 'roleIds') ? 'admin'
  ) then
    raise exception 'At least one enabled administrator member is required'
      using errcode = '23514';
  end if;

  with incoming as (
    select item
    from jsonb_array_elements(p_members) as item
  ),
  deleted as (
    delete from public.tenant_members
    where tenant_id = p_tenant_id
    returning id, auth_user_id
  )
  insert into public.tenant_members (
    id,
    tenant_id,
    auth_user_id,
    legacy_user_id,
    name,
    initials,
    account,
    phone,
    title,
    enabled,
    role_ids,
    source_created_at,
    source_updated_at
  )
  select
    item ->> 'id',
    p_tenant_id,
    case
      when item ->> 'userId' = (select auth.uid())::text then (select auth.uid())
      else deleted.auth_user_id
    end,
    item ->> 'userId',
    item ->> 'name',
    coalesce(item ->> 'initials', ''),
    item ->> 'account',
    coalesce(item ->> 'phone', ''),
    coalesce(item ->> 'title', ''),
    (item ->> 'enabled')::boolean,
    array(select jsonb_array_elements_text(item -> 'roleIds')),
    to_timestamp((item ->> 'createdAt')::double precision / 1000),
    to_timestamp((item ->> 'updatedAt')::double precision / 1000)
  from incoming
  left join deleted on deleted.id = item ->> 'id';
end;
$$;

revoke all on function public.create_tenant_with_admin(
  text, text, text, public.tenant_type, boolean, jsonb, text, text, text, text, text
) from public, anon;
grant execute on function public.create_tenant_with_admin(
  text, text, text, public.tenant_type, boolean, jsonb, text, text, text, text, text
) to authenticated;

revoke all on function public.save_tenant_configuration(text, bigint, jsonb)
from public, anon;
grant execute on function public.save_tenant_configuration(text, bigint, jsonb)
to authenticated;

revoke all on function public.replace_tenant_members(text, jsonb)
from public, anon;
grant execute on function public.replace_tenant_members(text, jsonb)
to authenticated;
