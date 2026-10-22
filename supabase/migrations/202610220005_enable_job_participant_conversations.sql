drop policy if exists "consumer creates conversation" on public.conversations;
create policy "job participants create conversation"
on public.conversations
for insert
to authenticated
with check (
  (consumer_id = (select auth.uid()) or provider_id = (select auth.uid())::text)
  and exists (
    select 1
    from public.jobs j
    where j.id = conversations.job_id
      and j.consumer_id = conversations.consumer_id
      and j.provider_id = conversations.provider_id
      and (j.consumer_id = (select auth.uid()) or j.provider_id = (select auth.uid())::text)
  )
);
