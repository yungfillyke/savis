alter table public.jobs drop constraint if exists jobs_status_check;
alter table public.jobs add constraint jobs_status_check check (
  status = any (array['requested','quote_pending','accepted','en_route','arrived','in_progress','completed','declined','cancelled','rescheduled']::text[])
);

create or replace function public.transition_job(
  p_job_id uuid,
  p_next_status text,
  p_note text default null,
  p_latitude double precision default null,
  p_longitude double precision default null
)
returns public.jobs
language plpgsql
security definer
set search_path = ''
as $function$
declare
  j public.jobs;
  ok boolean := false;
begin
  select * into j from public.jobs where id = p_job_id for update;
  if not found then raise exception 'Job not found'; end if;
  if not (j.consumer_id = auth.uid() or j.provider_id = auth.uid()::text) then
    raise exception 'Not authorized';
  end if;

  ok := case
    when j.status = 'requested' and p_next_status in ('quote_pending','accepted','declined','cancelled') then true
    when j.status = 'quote_pending' and p_next_status in ('accepted','declined','cancelled') then true
    when j.status = 'accepted' and p_next_status in ('quote_pending','en_route','cancelled','rescheduled') then true
    when j.status = 'en_route' and p_next_status in ('arrived','cancelled') then true
    when j.status = 'arrived' and p_next_status in ('in_progress','cancelled') then true
    when j.status = 'in_progress' and p_next_status in ('completed','cancelled') then true
    when j.status = 'rescheduled' and p_next_status in ('accepted','cancelled') then true
    else false
  end;
  if not ok then raise exception 'Invalid job status transition: % -> %', j.status, p_next_status; end if;

  update public.jobs
  set status = p_next_status,
      updated_at = now(),
      completed_at = case when p_next_status = 'completed' then now() else completed_at end,
      cancelled_reason = case when p_next_status = 'cancelled' then p_note else cancelled_reason end
  where id = p_job_id
  returning * into j;

  insert into public.job_status_events(job_id, actor_id, status, note, latitude, longitude)
  values (p_job_id, auth.uid(), p_next_status, p_note, p_latitude, p_longitude);
  return j;
end
$function$;

revoke all on function public.transition_job(uuid,text,text,double precision,double precision) from public, anon;
grant execute on function public.transition_job(uuid,text,text,double precision,double precision) to authenticated;
