create or replace function public.decline_quote(p_quote_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  q public.quotes;
  j public.jobs;
begin
  select * into q
  from public.quotes
  where id = p_quote_id
  for update;

  if not found then
    raise exception 'Quote not found';
  end if;

  select * into j
  from public.jobs
  where id = q.job_id
  for update;

  if not found then
    raise exception 'Job not found';
  end if;

  if j.consumer_id <> auth.uid() then
    raise exception 'Only the customer who requested this job can decline its quote';
  end if;

  if q.status <> 'pending' or j.status <> 'quote_pending' then
    raise exception 'This quote is no longer awaiting a decision';
  end if;

  update public.quotes
  set status = 'declined'
  where id = p_quote_id;

  if not exists (
    select 1 from public.quotes
    where job_id = q.job_id and status = 'pending'
  ) then
    update public.jobs
    set status = 'requested',
        quoted_amount = null,
        rate = 0,
        updated_at = now()
    where id = q.job_id;
  end if;

  return q.job_id;
end
$function$;

revoke all on function public.decline_quote(uuid) from public, anon;
grant execute on function public.decline_quote(uuid) to authenticated;
