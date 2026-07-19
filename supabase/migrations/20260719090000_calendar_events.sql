create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants (id) on delete cascade,
  auth_user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 80),
  event_type text not null check (event_type in ('meeting', 'review', 'task')),
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'cancelled')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text not null default '',
  audience text not null default '',
  viewed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_time_order check (ends_at > starts_at),
  constraint calendar_events_completion_consistency check (
    (status = 'completed' and completed_at is not null and cancelled_at is null)
    or (status = 'cancelled' and cancelled_at is not null and completed_at is null)
    or (status = 'pending' and completed_at is null and cancelled_at is null)
  )
);

create index calendar_events_owner_start_idx
  on public.calendar_events (tenant_id, auth_user_id, starts_at, id);

create index calendar_events_owner_pending_end_idx
  on public.calendar_events (tenant_id, auth_user_id, ends_at)
  where status = 'pending';

create trigger calendar_events_set_updated_at
before update on public.calendar_events
for each row execute function private.set_updated_at();

alter table public.calendar_events enable row level security;

revoke all on public.calendar_events from anon;

create policy calendar_events_owner on public.calendar_events
for all to authenticated
using (
  auth_user_id = (select auth.uid())
  and ((select private.is_tenant_member(tenant_id)) or (select private.is_platform_admin()))
)
with check (
  auth_user_id = (select auth.uid())
  and ((select private.is_tenant_member(tenant_id)) or (select private.is_platform_admin()))
);

grant select, insert, update, delete on public.calendar_events to authenticated;
