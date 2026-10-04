-- SAVIS realtime messaging migration
-- Self-contained recovery migration: creates the messaging tables if the
-- final-dream migration was not applied completely, then enables Realtime.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  consumer_id uuid not null references auth.users(id) on delete cascade,
  provider_id text not null,
  job_id uuid references public.jobs(id) on delete set null,
  last_message_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(consumer_id,provider_id,job_id)
);
create index if not exists conversations_consumer_idx on public.conversations(consumer_id,last_message_at desc);
create index if not exists conversations_provider_idx on public.conversations(provider_id,last_message_at desc);
alter table public.conversations enable row level security;
drop policy if exists "conversation participants read" on public.conversations;
create policy "conversation participants read" on public.conversations for select to authenticated using(consumer_id=auth.uid() or provider_id=auth.uid()::text);
drop policy if exists "consumer creates conversation" on public.conversations;
create policy "consumer creates conversation" on public.conversations for insert to authenticated with check(consumer_id=auth.uid());
drop policy if exists "conversation participants update" on public.conversations;
create policy "conversation participants update" on public.conversations for update to authenticated using(consumer_id=auth.uid() or provider_id=auth.uid()::text) with check(consumer_id=auth.uid() or provider_id=auth.uid()::text);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text,
  attachment_url text,
  created_at timestamptz default now(),
  read_at timestamptz
);
create index if not exists messages_conversation_idx on public.messages(conversation_id,created_at);
alter table public.messages enable row level security;
drop policy if exists "message participants read" on public.messages;
create policy "message participants read" on public.messages for select to authenticated using(
  exists(select 1 from public.conversations c where c.id=conversation_id and (c.consumer_id=auth.uid() or c.provider_id=auth.uid()::text))
);
drop policy if exists "message participants send" on public.messages;
create policy "message participants send" on public.messages for insert to authenticated with check(
  sender_id=auth.uid() and exists(select 1 from public.conversations c where c.id=conversation_id and (c.consumer_id=auth.uid() or c.provider_id=auth.uid()::text))
);
drop policy if exists "message participants readmark" on public.messages;
create policy "message participants readmark" on public.messages for update to authenticated using(
  exists(select 1 from public.conversations c where c.id=conversation_id and (c.consumer_id=auth.uid() or c.provider_id=auth.uid()::text))
) with check(true);

do $$
begin
  alter publication supabase_realtime add table public.conversations;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;

alter table public.conversations replica identity full;
alter table public.messages replica identity full;
