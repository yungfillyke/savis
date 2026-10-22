-- Repair job status workflow and quote persistence for SAVIS.
alter table public.jobs drop constraint if exists jobs_status_check;
alter table public.jobs add constraint jobs_status_check
  check (status = any (ARRAY[
    'requested','quote_pending','accepted','en_route','in_progress',
    'completed','declined','cancelled','rescheduled'
  ]::text[]));

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  provider_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount > 0),
  message text,
  expires_at timestamptz,
  status text not null default 'pending'
    check (status = any (ARRAY['pending','accepted','declined','expired','cancelled']::text[])),
  created_at timestamptz not null default now()
);
alter table public.quotes enable row level security;
grant select, insert on public.quotes to authenticated;
drop policy if exists "Job participants can read quotes" on public.quotes;
create policy "Job participants can read quotes" on public.quotes for select to authenticated
using (exists (select 1 from public.jobs j where j.id = quotes.job_id
  and (j.consumer_id = (select auth.uid()) or j.provider_id = (select auth.uid())::text)));
drop policy if exists "Assigned provider can create quotes" on public.quotes;
create policy "Assigned provider can create quotes" on public.quotes for insert to authenticated
with check (provider_id = (select auth.uid()) and exists (
  select 1 from public.jobs j where j.id = quotes.job_id
  and j.provider_id = (select auth.uid())::text and j.status in ('requested','quote_pending')));

create table if not exists public.job_status_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  status text not null,
  note text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);
alter table public.job_status_events enable row level security;
grant select on public.job_status_events to authenticated;
drop policy if exists "Job participants can read status events" on public.job_status_events;
create policy "Job participants can read status events" on public.job_status_events for select to authenticated
using (exists (select 1 from public.jobs j where j.id = job_status_events.job_id
  and (j.consumer_id = (select auth.uid()) or j.provider_id = (select auth.uid())::text)));

create or replace function public.transition_job(
  p_job_id uuid, p_next_status text, p_note text default null,
  p_latitude double precision default null, p_longitude double precision default null
) returns public.jobs language plpgsql security definer set search_path = ''
as $function$
declare j public.jobs; ok boolean := false;
begin
  select * into j from public.jobs where id = p_job_id for update;
  if not found then raise exception 'Job not found'; end if;
  if not (j.consumer_id = auth.uid() or j.provider_id = auth.uid()::text) then raise exception 'Not authorized'; end if;
  ok := case
    when j.status = 'requested' and p_next_status in ('quote_pending','accepted','declined','cancelled') then true
    when j.status = 'quote_pending' and p_next_status in ('accepted','declined','cancelled') then true
    when j.status = 'accepted' and p_next_status in ('en_route','cancelled','rescheduled') then true
    when j.status = 'en_route' and p_next_status in ('in_progress','cancelled') then true
    when j.status = 'in_progress' and p_next_status in ('completed','cancelled') then true
    when j.status = 'rescheduled' and p_next_status in ('accepted','cancelled') then true
    else false end;
  if not ok then raise exception 'Invalid job status transition: % -> %', j.status, p_next_status; end if;
  update public.jobs set status = p_next_status, updated_at = now(),
    completed_at = case when p_next_status = 'completed' then now() else completed_at end,
    cancelled_reason = case when p_next_status = 'cancelled' then p_note else cancelled_reason end
    where id = p_job_id returning * into j;
  insert into public.job_status_events(job_id, actor_id, status, note, latitude, longitude)
    values (p_job_id, auth.uid(), p_next_status, p_note, p_latitude, p_longitude);
  return j;
end $function$;

-- Quote acceptance is atomic and does not create a payment record.
create or replace function public.accept_quote(p_quote_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $function$
declare q public.quotes; j public.jobs;
begin
  select * into q from public.quotes where id = p_quote_id for update;
  if not found then raise exception 'Quote not found'; end if;
  select * into j from public.jobs where id = q.job_id for update;
  if not found then raise exception 'Job not found'; end if;
  if j.consumer_id is distinct from auth.uid() then raise exception 'Only the customer who requested this job can accept its quote'; end if;
  if q.status <> 'pending' then raise exception 'This quote is no longer pending'; end if;
  if j.status not in ('requested','quote_pending') then raise exception 'This job can no longer accept a quote'; end if;
  update public.quotes set status = 'accepted' where id = q.id;
  update public.quotes set status = 'declined' where job_id = q.job_id and id <> q.id and status = 'pending';
  update public.jobs set status = 'accepted', quoted_amount = q.amount, rate = q.amount, updated_at = now()
    where id = q.job_id returning * into j;
  insert into public.job_status_events(job_id, actor_id, status, note)
    values (j.id, auth.uid(), 'accepted', 'Customer accepted the provider quote.');
  return j.id;
end $function$;

revoke all on function public.transition_job(uuid,text,text,double precision,double precision) from public, anon;
grant execute on function public.transition_job(uuid,text,text,double precision,double precision) to authenticated;
revoke all on function public.accept_quote(uuid) from public, anon;
grant execute on function public.accept_quote(uuid) to authenticated;
