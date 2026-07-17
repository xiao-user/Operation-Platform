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
  member_email text;
begin
  if not private.is_platform_admin() then
    raise exception 'Only platform administrators can create tenants' using errcode = '42501';
  end if;

  select lower(trim(email))
  into member_email
  from auth.users
  where id = (select auth.uid());

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

drop function public.replace_tenant_members(text, jsonb);

create function public.replace_tenant_members(
  p_tenant_id text,
  p_members jsonb
)
returns setof public.tenant_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  unknown_email text;
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

  select lower(trim(item ->> 'account'))
  into unknown_email
  from jsonb_array_elements(p_members) as item
  where position('@' in coalesce(item ->> 'account', '')) > 0
    and not exists (
      select 1
      from auth.users
      where lower(email) = lower(trim(item ->> 'account'))
    )
  limit 1;

  if unknown_email is not null then
    raise exception 'No Supabase Auth user exists for email %', unknown_email
      using errcode = '23503';
  end if;

  return query
  with incoming as (
    select item
    from jsonb_array_elements(p_members) as item
  ),
  deleted as (
    delete from public.tenant_members
    where tenant_id = p_tenant_id
    returning *
  ),
  inserted as (
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
        when position('@' in coalesce(item ->> 'account', '')) > 0 then auth_user.id
        when item ->> 'userId' = (select auth.uid())::text then (select auth.uid())
        else deleted.auth_user_id
      end,
      coalesce(deleted.legacy_user_id, item ->> 'userId'),
      item ->> 'name',
      coalesce(item ->> 'initials', ''),
      case
        when position('@' in coalesce(item ->> 'account', '')) > 0
          then lower(trim(item ->> 'account'))
        else item ->> 'account'
      end,
      coalesce(item ->> 'phone', ''),
      coalesce(item ->> 'title', ''),
      (item ->> 'enabled')::boolean,
      array(select jsonb_array_elements_text(item -> 'roleIds')),
      to_timestamp((item ->> 'createdAt')::double precision / 1000),
      to_timestamp((item ->> 'updatedAt')::double precision / 1000)
    from incoming
    left join deleted on deleted.id = item ->> 'id'
    left join auth.users as auth_user
      on lower(auth_user.email) = lower(trim(item ->> 'account'))
    returning *
  )
  select *
  from inserted
  order by name, account;
end;
$$;

revoke all on function public.replace_tenant_members(text, jsonb)
from public, anon;
grant execute on function public.replace_tenant_members(text, jsonb)
to authenticated;

update public.tenant_members as member
set account = lower(auth_user.email)
from auth.users as auth_user
where member.auth_user_id = auth_user.id
  and auth_user.email is not null
  and member.account is distinct from lower(auth_user.email);
