-- SAVIS Developer Control Plane hardening
-- Run after the base schema/final-dream migrations.
-- This migration is safe to re-run.

create table if not exists public.developer_security_state (
  id boolean primary key default true check (id),
  maintenance_mode boolean not null default false,
  read_only_mode boolean not null default false,
  signup_enabled boolean not null default true,
  payments_enabled boolean not null default true,
  session_epoch bigint not null default 0,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.developer_security_state enable row level security;
insert into public.developer_security_state(id) values(true)
on conflict(id) do nothing;

create table if not exists public.developer_nuclear_challenges (
  id uuid primary key default gen_random_uuid(),
  developer_id uuid not null references auth.users(id) on delete cascade,
  challenge text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.developer_nuclear_challenges enable row level security;
create index if not exists developer_nuclear_challenges_developer_idx
  on public.developer_nuclear_challenges(developer_id, created_at desc);

create or replace function public.developer_security_snapshot()
returns public.developer_security_state
language plpgsql stable security definer set search_path=public
as $$
declare r public.developer_security_state;
begin
  if not public.is_developer_admin() then raise exception 'developer access required'; end if;
  select * into r from public.developer_security_state where id=true;
  return r;
end $$;
grant execute on function public.developer_security_snapshot() to authenticated;

create or replace function public.developer_set_system_state(
  p_maintenance boolean,
  p_read_only boolean,
  p_signup_enabled boolean,
  p_payments_enabled boolean
)
returns public.developer_security_state
language plpgsql security definer set search_path=public
as $$
declare r public.developer_security_state;
begin
  if not public.is_developer_admin() then raise exception 'developer access required'; end if;
  update public.developer_security_state
  set maintenance_mode=p_maintenance,
      read_only_mode=p_read_only,
      signup_enabled=p_signup_enabled,
      payments_enabled=p_payments_enabled,
      updated_by=auth.uid(),
      updated_at=now()
  where id=true
  returning * into r;
  perform public.write_developer_audit(
    'nuclear.system_state.update',
    jsonb_build_object(
      'maintenance_mode',p_maintenance,
      'read_only_mode',p_read_only,
      'signup_enabled',p_signup_enabled,
      'payments_enabled',p_payments_enabled
    )
  );
  return r;
end $$;
grant execute on function public.developer_set_system_state(boolean,boolean,boolean,boolean) to authenticated;

create or replace function public.developer_bump_session_epoch()
returns bigint
language plpgsql security definer set search_path=public
as $$
declare v bigint;
begin
  if not public.is_developer_admin() then raise exception 'developer access required'; end if;
  update public.developer_security_state
  set session_epoch=session_epoch+1, updated_by=auth.uid(), updated_at=now()
  where id=true
  returning session_epoch into v;
  perform public.write_developer_audit('nuclear.session_epoch.bump',jsonb_build_object('session_epoch',v));
  return v;
end $$;
grant execute on function public.developer_bump_session_epoch() to authenticated;

create or replace function public.developer_health_snapshot()
returns jsonb
language plpgsql stable security definer set search_path=public
as $$
declare result jsonb;
begin
  if not public.is_developer_admin() then raise exception 'developer access required'; end if;
  select jsonb_build_object(
    'profiles', (select count(*) from public.profiles),
    'providers', (select count(*) from public.profiles where role in ('provider','professional','seller')),
    'verified_providers', (select count(*) from public.profiles where role in ('provider','professional','seller') and verified=true),
    'jobs', (select count(*) from public.jobs),
    'conversations', (select count(*) from public.conversations),
    'payments', (select count(*) from public.payments)
  ) into result;
  return result;
end $$;
grant execute on function public.developer_health_snapshot() to authenticated;
