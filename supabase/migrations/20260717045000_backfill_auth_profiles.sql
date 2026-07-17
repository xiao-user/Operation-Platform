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
