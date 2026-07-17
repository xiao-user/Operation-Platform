grant execute on function private.is_platform_admin() to authenticated;
grant execute on function private.is_tenant_member(text) to authenticated;
grant execute on function private.is_tenant_admin(text) to authenticated;
