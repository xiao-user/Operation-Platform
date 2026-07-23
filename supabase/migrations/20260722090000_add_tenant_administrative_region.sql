alter table public.tenants
  add column administrative_region_code text,
  add column administrative_region_name text,
  add column administrative_region_scope text,
  add column administrative_region_path jsonb;

update public.tenants
set
  administrative_region_code = '440000',
  administrative_region_name = '广东省',
  administrative_region_scope = 'province',
  administrative_region_path = '[{"code":"440000","name":"广东省","scope":"province"}]'::jsonb
where type <> 'platform';

alter table public.tenants
  add constraint tenants_administrative_region_scope_check
    check (administrative_region_scope is null or administrative_region_scope in ('province', 'city', 'district')),
  add constraint tenants_administrative_region_complete_check
    check (
      type = 'platform'
      or (
        administrative_region_code ~ '^[0-9]{6}$'
        and length(trim(administrative_region_name)) > 0
        and administrative_region_scope is not null
        and jsonb_typeof(administrative_region_path) = 'array'
        and jsonb_array_length(administrative_region_path) > 0
        and administrative_region_path -> -1 ->> 'code' = administrative_region_code
        and administrative_region_path -> -1 ->> 'name' = administrative_region_name
        and administrative_region_path -> -1 ->> 'scope' = administrative_region_scope
      )
    );

drop function public.create_tenant_with_admin(
  text, text, text, public.tenant_type, boolean, jsonb, text, text, text, text, text
);

create function public.create_tenant_with_admin(
  p_tenant_id text,
  p_name text,
  p_short_name text,
  p_type public.tenant_type,
  p_enabled boolean,
  p_administrative_region_code text,
  p_administrative_region_name text,
  p_administrative_region_scope text,
  p_administrative_region_path jsonb,
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
  member_email text;
begin
  if not private.is_platform_admin() then
    raise exception 'Only platform administrators can create tenants' using errcode = '42501';
  end if;

  select lower(trim(email))
  into member_email
  from auth.users
  where id = (select auth.uid());

  insert into public.tenants (
    id,
    name,
    short_name,
    type,
    enabled,
    administrative_region_code,
    administrative_region_name,
    administrative_region_scope,
    administrative_region_path
  )
  values (
    p_tenant_id,
    p_name,
    p_short_name,
    p_type,
    p_enabled,
    p_administrative_region_code,
    p_administrative_region_name,
    p_administrative_region_scope,
    p_administrative_region_path
  )
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
    coalesce(member_email, p_member_account),
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

revoke all on function public.create_tenant_with_admin(
  text, text, text, public.tenant_type, boolean, text, text, text, jsonb,
  jsonb, text, text, text, text, text
) from public, anon;
grant execute on function public.create_tenant_with_admin(
  text, text, text, public.tenant_type, boolean, text, text, text, jsonb,
  jsonb, text, text, text, text, text
) to authenticated;
