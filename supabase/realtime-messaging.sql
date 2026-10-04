-- SAVIS realtime messaging hardening
-- Run after final-dream.sql. Re-running is safe.
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

-- Ensure realtime payloads include full rows for predictable clients.
alter table public.conversations replica identity full;
alter table public.messages replica identity full;
