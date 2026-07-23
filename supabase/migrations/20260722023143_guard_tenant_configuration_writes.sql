create or replace function public.save_tenant_configuration(
  p_tenant_id text,
  p_expected_revision bigint,
  p_configuration jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
set lock_timeout = '2s'
set statement_timeout = '8s'
as $$
declare
  current_revision bigint;
  current_configuration jsonb;
  next_revision bigint;
begin
  if not (private.is_tenant_admin(p_tenant_id) or private.is_platform_admin()) then
    raise exception 'Tenant administrator permission required' using errcode = '42501';
  end if;

  select revision, configuration
  into current_revision, current_configuration
  from public.tenant_configurations
  where tenant_id = p_tenant_id;

  if current_revision is null or current_revision <> p_expected_revision then
    raise exception 'Tenant configuration changed in another browser; reload before saving'
      using errcode = '40001';
  end if;

  if current_configuration = p_configuration then
    return current_revision;
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

revoke all on function public.save_tenant_configuration(text, bigint, jsonb)
from public, anon;
grant execute on function public.save_tenant_configuration(text, bigint, jsonb)
to authenticated;
