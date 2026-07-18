create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants (id) on delete cascade,
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '新对话' check (length(trim(title)) between 1 and 120),
  model text not null default 'deepseek-chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  unique (id, tenant_id, auth_user_id)
);

create index ai_conversations_owner_tenant_updated_idx
  on public.ai_conversations (auth_user_id, tenant_id, last_message_at desc);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  tenant_id text not null,
  auth_user_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  content text not null check (length(content) <= 50000),
  page_context jsonb,
  model text,
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  created_at timestamptz not null default now(),
  foreign key (conversation_id, tenant_id, auth_user_id)
    references public.ai_conversations (id, tenant_id, auth_user_id)
    on delete cascade
);

create index ai_messages_conversation_created_idx
  on public.ai_messages (conversation_id, created_at);

create trigger ai_conversations_set_updated_at
before update on public.ai_conversations
for each row execute function private.set_updated_at();

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

create policy ai_conversations_select on public.ai_conversations
for select to authenticated
using (
  auth_user_id = (select auth.uid())
  and (
    (select private.is_tenant_member(tenant_id))
    or (select private.is_platform_admin())
  )
);

create policy ai_conversations_update on public.ai_conversations
for update to authenticated
using (
  auth_user_id = (select auth.uid())
  and (
    (select private.is_tenant_member(tenant_id))
    or (select private.is_platform_admin())
  )
)
with check (
  auth_user_id = (select auth.uid())
  and (
    (select private.is_tenant_member(tenant_id))
    or (select private.is_platform_admin())
  )
);

create policy ai_conversations_delete on public.ai_conversations
for delete to authenticated
using (
  auth_user_id = (select auth.uid())
  and (
    (select private.is_tenant_member(tenant_id))
    or (select private.is_platform_admin())
  )
);

create policy ai_messages_select on public.ai_messages
for select to authenticated
using (
  auth_user_id = (select auth.uid())
  and exists (
    select 1
    from public.ai_conversations as conversation
    where conversation.id = ai_messages.conversation_id
      and conversation.tenant_id = ai_messages.tenant_id
      and conversation.auth_user_id = (select auth.uid())
  )
);

grant select, update, delete on public.ai_conversations to authenticated;
grant select on public.ai_messages to authenticated;

grant select, insert, update, delete on public.ai_conversations to service_role;
grant select, insert, update, delete on public.ai_messages to service_role;
