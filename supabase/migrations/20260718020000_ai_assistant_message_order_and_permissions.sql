alter table public.ai_messages
add column sequence_number bigint generated always as identity;

create index ai_messages_conversation_sequence_idx
  on public.ai_messages (conversation_id, sequence_number);

revoke update on public.ai_conversations from authenticated;
grant update (title) on public.ai_conversations to authenticated;
