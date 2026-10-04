-- SAVIS provider verification review workflow
-- Run in Supabase SQL Editor after provider-kyc.sql.
-- Admin access is explicit: add trusted reviewer auth user IDs to provider_reviewers.

create table if not exists public.provider_reviewers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.provider_reviewers enable row level security;
drop policy if exists "Reviewers can read reviewer membership" on public.provider_reviewers;
create policy "Reviewers can read reviewer membership"
  on public.provider_reviewers for select to authenticated
  using (user_id = auth.uid());

create index if not exists provider_verifications_status_idx
  on public.provider_verifications(status, updated_at desc);

create or replace function public.is_provider_reviewer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.provider_reviewers r where r.user_id = auth.uid());
$$;
grant execute on function public.is_provider_reviewer() to authenticated;

drop policy if exists "Reviewers can read KYC queue" on public.provider_verifications;
create policy "Reviewers can read KYC queue"
  on public.provider_verifications for select to authenticated
  using (public.is_provider_reviewer());

drop policy if exists "Reviewers can read KYC provider profile" on public.profiles;
create policy "Reviewers can read KYC provider profile"
  on public.profiles for select to authenticated
  using (public.is_provider_reviewer());

create or replace function public.review_provider_kyc(
  p_provider_id uuid,
  p_decision text,
  p_rejection_reason text default null
)
returns public.provider_verifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.provider_verifications;
begin
  if not public.is_provider_reviewer() then
    raise exception 'not authorized';
  end if;

  if p_decision not in ('verified','rejected') then
    raise exception 'invalid decision';
  end if;

  if p_decision = 'rejected' and nullif(trim(coalesce(p_rejection_reason,'')), '') is null then
    raise exception 'rejection reason is required';
  end if;

  update public.provider_verifications
  set status = p_decision,
      rejection_reason = case when p_decision='rejected' then trim(p_rejection_reason) else null end,
      reviewed_at = now(),
      updated_at = now()
  where provider_id = p_provider_id
  returning * into v_record;

  if not found then
    raise exception 'provider verification record not found';
  end if;

  update public.profiles
  set verification_status = p_decision,
      verified = (p_decision = 'verified')
  where id = p_provider_id;

  return v_record;
end;
$$;
grant execute on function public.review_provider_kyc(uuid,text,text) to authenticated;

create or replace function public.list_provider_kyc_queue(
  p_status text default 'submitted'
)
returns table(
  provider_id uuid,
  full_name text,
  service_category text,
  location_name text,
  verification_status text,
  kyc_status text,
  id_front_path text,
  id_back_path text,
  selfie_path text,
  certificate_path text,
  rejection_reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select v.provider_id,
         p.full_name,
         p.service_category,
         p.location_name,
         p.verification_status,
         v.status,
         v.id_front_path,
         v.id_back_path,
         v.selfie_path,
         v.certificate_path,
         v.rejection_reason,
         v.updated_at,
         v.reviewed_at
  from public.provider_verifications v
  join public.profiles p on p.id=v.provider_id
  where public.is_provider_reviewer()
    and (p_status is null or v.status=p_status)
  order by v.updated_at desc;
$$;
grant execute on function public.list_provider_kyc_queue(text) to authenticated;

-- Reviewer access to private KYC files. Paths are provider-id-prefixed by submit_provider_kyc.
drop policy if exists "Reviewers can read KYC documents" on storage.objects;
create policy "Reviewers can read KYC documents"
  on storage.objects for select to authenticated
  using (
    bucket_id='kyc-documents'
    and public.is_provider_reviewer()
  );
