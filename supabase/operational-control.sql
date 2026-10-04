-- SAVIS developer Operational Control Center
-- Safe, developer-only operational inspection and controlled recovery actions.
-- Run in Supabase SQL Editor after developer-console.sql.

create or replace function public.developer_operational_overview()
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  jobs_count bigint := 0;
  active_jobs bigint := 0;
  payments_count bigint := 0;
  held_payments bigint := 0;
  conversations_count bigint := 0;
  products_count bigint := 0;
  orders_count bigint := 0;
begin
  if not public.is_developer_admin() then raise exception 'developer access required'; end if;

  if to_regclass('public.jobs') is not null then
    execute 'select count(*) from public.jobs' into jobs_count;
    execute $$select count(*) from public.jobs where status in ('requested','quote_pending','accepted','en_route','in_progress','rescheduled')$$ into active_jobs;
  end if;
  if to_regclass('public.payments') is not null then
    execute 'select count(*) from public.payments' into payments_count;
    execute $$select count(*) from public.payments where status in ('pending','authorized','held')$$ into held_payments;
  end if;
  if to_regclass('public.conversations') is not null then
    execute 'select count(*) from public.conversations' into conversations_count;
  end if;
  if to_regclass('public.products') is not null then
    execute 'select count(*) from public.products' into products_count;
  end if;
  if to_regclass('public.product_orders') is not null then
    execute 'select count(*) from public.product_orders' into orders_count;
  end if;

  return jsonb_build_object(
    'jobs',jobs_count,'active_jobs',active_jobs,
    'payments',payments_count,'held_payments',held_payments,
    'conversations',conversations_count,'products',products_count,'orders',orders_count
  );
end $$;
grant execute on function public.developer_operational_overview() to authenticated;

create or replace function public.list_developer_jobs(p_status text default null, p_limit integer default 50)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare result jsonb;
begin
  if not public.is_developer_admin() then raise exception 'developer access required'; end if;
  if to_regclass('public.jobs') is null then return '[]'::jsonb; end if;
  execute $q$
    select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb)
    from (
      select j.id,j.consumer_id,j.provider_id,j.provider_name,j.skill,j.description,j.location,
             j.status,j.rate,j.quoted_amount,j.scheduled_for,j.created_at,j.updated_at
      from public.jobs j
      where ($1 is null or j.status=$1)
      order by j.created_at desc
      limit greatest(1,least($2,200))
    ) x
  $q$ into result using p_status,p_limit;
  return result;
end $$;
grant execute on function public.list_developer_jobs(text,integer) to authenticated;

create or replace function public.developer_transition_job(p_job_id uuid,p_next_status text,p_note text default null)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare j record;
begin
  if not public.is_developer_admin() then raise exception 'developer access required'; end if;
  select * into j from public.jobs where id=p_job_id for update;
  if not found then raise exception 'job not found'; end if;
  if p_next_status not in ('requested','quote_pending','accepted','en_route','in_progress','completed','declined','cancelled','rescheduled') then
    raise exception 'invalid job status';
  end if;
  if not (
    (j.status='requested' and p_next_status in ('quote_pending','accepted','declined','cancelled')) or
    (j.status='quote_pending' and p_next_status in ('accepted','declined','cancelled')) or
    (j.status='accepted' and p_next_status in ('en_route','cancelled','rescheduled')) or
    (j.status='en_route' and p_next_status in ('in_progress','cancelled')) or
    (j.status='in_progress' and p_next_status in ('completed','cancelled')) or
    (j.status='rescheduled' and p_next_status in ('accepted','cancelled'))
  ) then raise exception 'invalid job status transition: % -> %',j.status,p_next_status; end if;

  update public.jobs set status=p_next_status,
    completed_at=case when p_next_status='completed' then now() else completed_at end,
    cancelled_reason=case when p_next_status='cancelled' then coalesce(p_note,cancelled_reason) else cancelled_reason end
    where id=p_job_id;
  if to_regclass('public.job_status_events') is not null then
    insert into public.job_status_events(job_id,actor_id,status,note)
    values(p_job_id,auth.uid(),p_next_status,p_note);
  end if;
  perform public.write_developer_audit('job.status.force_transition',jsonb_build_object('job_id',p_job_id,'from',j.status,'to',p_next_status,'note',p_note));
  return jsonb_build_object('ok',true,'job_id',p_job_id,'status',p_next_status);
end $$;
grant execute on function public.developer_transition_job(uuid,text,text) to authenticated;

create or replace function public.list_developer_payments(p_status text default null,p_limit integer default 50)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare result jsonb;
begin
  if not public.is_developer_admin() then raise exception 'developer access required'; end if;
  if to_regclass('public.payments') is null then return '[]'::jsonb; end if;
  execute $q$
    select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb)
    from (
      select id,job_id,order_id,payer_id,payee_id,amount,platform_fee,method,status,
             provider_reference,checkout_request_id,created_at,updated_at
      from public.payments
      where ($1 is null or status=$1)
      order by created_at desc
      limit greatest(1,least($2,200))
    ) x
  $q$ into result using p_status,p_limit;
  return result;
end $$;
grant execute on function public.list_developer_payments(text,integer) to authenticated;

create or replace function public.developer_update_payment_status(p_payment_id uuid,p_status text)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare old_status text;
begin
  if not public.is_developer_admin() then raise exception 'developer access required'; end if;
  if p_status not in ('pending','authorized','held','released','refunded','failed','cancelled') then raise exception 'invalid payment status'; end if;
  select status into old_status from public.payments where id=p_payment_id for update;
  if old_status is null then raise exception 'payment not found'; end if;
  update public.payments set status=p_status,updated_at=now() where id=p_payment_id;
  perform public.write_developer_audit('payment.status.force_update',jsonb_build_object('payment_id',p_payment_id,'from',old_status,'to',p_status));
  return jsonb_build_object('ok',true,'payment_id',p_payment_id,'status',p_status);
end $$;
grant execute on function public.developer_update_payment_status(uuid,text) to authenticated;

create or replace function public.list_developer_conversations(p_limit integer default 50)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare result jsonb;
begin
  if not public.is_developer_admin() then raise exception 'developer access required'; end if;
  if to_regclass('public.conversations') is null then return '[]'::jsonb; end if;
  execute $q$
    select coalesce(jsonb_agg(to_jsonb(x) order by x.last_message_at desc),'[]'::jsonb)
    from (
      select c.id,c.consumer_id,c.provider_id,c.job_id,c.last_message_at,c.created_at,
             (select m.body from public.messages m where m.conversation_id=c.id order by m.created_at desc limit 1) last_message
      from public.conversations c
      order by c.last_message_at desc
      limit greatest(1,least($1,200))
    ) x
  $q$ into result using p_limit;
  return result;
end $$;
grant execute on function public.list_developer_conversations(integer) to authenticated;

create or replace function public.developer_send_support_message(p_conversation_id uuid,p_body text)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare msg_id uuid;
begin
  if not public.is_developer_admin() then raise exception 'developer access required'; end if;
  if length(trim(coalesce(p_body,'')))=0 then raise exception 'message cannot be empty'; end if;
  if not exists(select 1 from public.conversations where id=p_conversation_id) then raise exception 'conversation not found'; end if;
  insert into public.messages(conversation_id,sender_id,body) values(p_conversation_id,auth.uid(),trim(p_body)) returning id into msg_id;
  update public.conversations set last_message_at=now() where id=p_conversation_id;
  perform public.write_developer_audit('messaging.support_message',jsonb_build_object('conversation_id',p_conversation_id,'message_id',msg_id));
  return jsonb_build_object('ok',true,'message_id',msg_id);
end $$;
grant execute on function public.developer_send_support_message(uuid,text) to authenticated;

create or replace function public.list_developer_marketplace()
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare result jsonb := '{}'::jsonb; n bigint;
begin
  if not public.is_developer_admin() then raise exception 'developer access required'; end if;
  if to_regclass('public.products') is not null then execute 'select count(*) from public.products' into n; result:=result||jsonb_build_object('products',n); else result:=result||jsonb_build_object('products',0); end if;
  if to_regclass('public.product_orders') is not null then execute 'select count(*) from public.product_orders' into n; result:=result||jsonb_build_object('orders',n); else result:=result||jsonb_build_object('orders',0); end if;
  perform public.write_developer_audit('marketplace.view',jsonb_build_object('area','operational'));
  return result;
end $$;
grant execute on function public.list_developer_marketplace() to authenticated;
