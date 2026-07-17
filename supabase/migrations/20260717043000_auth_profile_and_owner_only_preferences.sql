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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

drop policy if exists workbench_layouts_owner on public.workbench_layouts;
create policy workbench_layouts_owner on public.workbench_layouts
for all to authenticated
using (auth_user_id = (select auth.uid()))
with check (auth_user_id = (select auth.uid()));

drop policy if exists user_tenant_preferences_owner on public.user_tenant_preferences;
create policy user_tenant_preferences_owner on public.user_tenant_preferences
for all to authenticated
using (auth_user_id = (select auth.uid()))
with check (auth_user_id = (select auth.uid()));

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;
