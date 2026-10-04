-- SAVIS Business Control Center
-- Run after developer-console.sql. Safe to re-run.

create table if not exists public.developer_assisted_sessions (
  id uuid primary key default gen_random_uuid(),
  developer_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  target_role text not null check (target_role in ('provider','professional','seller')),
  status text not null default 'prepared' check (status in ('prepared','active','ended','expired')),
  expires_at timestamptz not null, created_at timestamptz not null default now(), ended_at timestamptz
);
create index if not exists developer_assisted_sessions_developer_idx on public.developer_assisted_sessions(developer_id,created_at desc);
create index if not exists developer_assisted_sessions_target_idx on public.developer_assisted_sessions(target_user_id,created_at desc);
alter table public.developer_assisted_sessions enable row level security;

create or replace function public.list_developer_business_accounts(p_search text default null,p_role text default null)
returns table (id uuid,full_name text,email text,phone text,role text,avatar_url text,service_category text,hourly_rate integer,rating numeric,review_count integer,availability text,verified boolean,verification_status text,bio text,location_name text,service_area_km integer,created_at timestamptz)
language sql stable security definer set search_path=public as $$
 select p.id,p.full_name,p.email,p.phone,p.role,p.avatar_url,p.service_category,p.hourly_rate,p.rating,p.review_count,p.availability,p.verified,p.verification_status,p.bio,p.location_name,p.service_area_km,p.created_at
 from public.profiles p
 where public.is_developer_admin() and p.role in ('provider','professional','seller')
 and (p_role is null or p_role='' or p.role=p_role)
 and (p_search is null or p_search='' or lower(coalesce(p.full_name,'')) like '%'||lower(p_search)||'%' or lower(coalesce(p.email,'')) like '%'||lower(p_search)||'%' or lower(coalesce(p.service_category,'')) like '%'||lower(p_search)||'%')
 order by p.created_at desc limit 100
$$;
grant execute on function public.list_developer_business_accounts(text,text) to authenticated;

create or replace function public.update_developer_business_account(p_user_id uuid,p_full_name text default null,p_service_category text default null,p_bio text default null,p_hourly_rate integer default null,p_availability text default null,p_location_name text default null,p_service_area_km integer default null,p_avatar_url text default null)
returns public.profiles language plpgsql security definer set search_path=public as $$
declare r public.profiles;
begin
 if not public.is_developer_admin() then raise exception 'developer access required'; end if;
 if not exists(select 1 from public.profiles where id=p_user_id and role in ('provider','professional','seller')) then raise exception 'business account not eligible'; end if;
 update public.profiles set full_name=coalesce(p_full_name,full_name),service_category=coalesce(p_service_category,service_category),bio=coalesce(p_bio,bio),hourly_rate=coalesce(p_hourly_rate,hourly_rate),availability=coalesce(p_availability,availability),location_name=coalesce(p_location_name,location_name),service_area_km=coalesce(p_service_area_km,service_area_km),avatar_url=coalesce(p_avatar_url,avatar_url) where id=p_user_id returning * into r;
 perform public.write_developer_audit('business.account.update',jsonb_build_object('target_user_id',p_user_id));
 return r;
end $$;
grant execute on function public.update_developer_business_account(uuid,text,text,text,integer,text,text,integer,text) to authenticated;

create or replace function public.prepare_developer_assisted_session(p_target_user_id uuid,p_minutes integer default 30)
returns public.developer_assisted_sessions language plpgsql security definer set search_path=public as $$
declare r public.developer_assisted_sessions; target_role text;
begin
 if not public.is_developer_admin() then raise exception 'developer access required'; end if;
 select role into target_role from public.profiles where id=p_target_user_id;
 if target_role not in ('provider','professional','seller') then raise exception 'only business accounts can be assisted'; end if;
 if p_minutes < 5 or p_minutes > 120 then raise exception 'session duration must be 5-120 minutes'; end if;
 insert into public.developer_assisted_sessions(developer_id,target_user_id,target_role,status,expires_at) values(auth.uid(),p_target_user_id,target_role,'prepared',now()+make_interval(mins=>p_minutes)) returning * into r;
 perform public.write_developer_audit('assisted_session.prepare',jsonb_build_object('target_user_id',p_target_user_id,'target_role',target_role,'expires_at',r.expires_at));
 return r;
end $$;
grant execute on function public.prepare_developer_assisted_session(uuid,integer) to authenticated;

create or replace function public.end_developer_assisted_session(p_session_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_developer_admin() then raise exception 'developer access required'; end if;
 update public.developer_assisted_sessions set status='ended',ended_at=now() where id=p_session_id and developer_id=auth.uid() and status in ('prepared','active');
 perform public.write_developer_audit('assisted_session.end',jsonb_build_object('session_id',p_session_id));
end $$;
grant execute on function public.end_developer_assisted_session(uuid) to authenticated;
