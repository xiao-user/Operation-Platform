drop policy if exists workbench_layouts_owner on public.workbench_layouts;
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

drop policy if exists user_tenant_preferences_owner on public.user_tenant_preferences;
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
