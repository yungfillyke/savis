-- SAVIS provider KYC gate
-- Run after final-dream.sql, dynamic-marketplace.sql and public-discovery.sql.
-- Providers must be verified before appearing to consumers or switching themselves online.

insert into storage.buckets (id, name, public)
values ('kyc-documents', 'kyc-documents', false)
on conflict (id) do update set public = false;

drop policy if exists "providers upload own KYC documents" on storage.objects;
create policy "providers upload own KYC documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'kyc-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "providers read own KYC documents" on storage.objects;
create policy "providers read own KYC documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'kyc-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "providers replace own KYC documents" on storage.objects;
create policy "providers replace own KYC documents"
on storage.objects for update to authenticated
using (
  bucket_id = 'kyc-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'kyc-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "providers delete own KYC documents" on storage.objects;
create policy "providers delete own KYC documents"
on storage.objects for delete to authenticated
using (
  bucket_id = 'kyc-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.submit_provider_kyc(
  p_id_front_path text,
  p_id_back_path text,
  p_selfie_path text,
  p_certificate_path text default null
)
returns public.provider_verifications
language plpgsql
security definer
set search_path=''
as $$
declare v public.provider_verifications;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('provider','professional')
  ) then
    raise exception 'Only providers and professionals can submit KYC';
  end if;
  if coalesce(trim(p_id_front_path),'') = '' or coalesce(trim(p_id_back_path),'') = '' or coalesce(trim(p_selfie_path),'') = '' then
    raise exception 'ID front, ID back and selfie are required';
  end if;

  insert into public.provider_verifications(
    provider_id,id_front_path,id_back_path,selfie_path,certificate_path,consent_at,status,updated_at
  ) values (
    auth.uid(),p_id_front_path,p_id_back_path,p_selfie_path,p_certificate_path,now(),'submitted',now()
  )
  on conflict (provider_id) do update set
    id_front_path=excluded.id_front_path,
    id_back_path=excluded.id_back_path,
    selfie_path=excluded.selfie_path,
    certificate_path=excluded.certificate_path,
    consent_at=excluded.consent_at,
    status='submitted',
    rejection_reason=null,
    reviewed_at=null,
    updated_at=now()
  returning * into v;

  update public.profiles
  set verification_status='pending', verified=false
  where id=auth.uid();

  return v;
end
$$;

grant execute on function public.submit_provider_kyc(text,text,text,text) to authenticated;

-- Never expose providers to consumers until verification is approved.
drop function if exists public.search_nearby_providers(double precision,double precision,double precision,text,integer);
create or replace function public.search_nearby_providers(
  p_lat double precision,p_lng double precision,p_radius_km double precision default 25,
  p_category text default null,p_limit integer default 40
)
returns table(
  id uuid,full_name text,role text,avatar_url text,latitude double precision,longitude double precision,location_name text,
  service_category text,hourly_rate integer,rating numeric,review_count integer,availability text,verified boolean,
  verification_status text,bio text,distance_km double precision
)
language sql stable security invoker
as $$
  with candidates as(
    select p.id,p.full_name,p.role,p.avatar_url,p.latitude,p.longitude,p.location_name,p.service_category,p.hourly_rate,
      p.rating,p.review_count,p.availability,p.verified,p.verification_status,p.bio,
      6371*acos(least(1,greatest(-1,
        sin(radians(p_lat))*sin(radians(p.latitude))+
        cos(radians(p_lat))*cos(radians(p.latitude))*cos(radians(p.longitude)-radians(p_lng))
      ))) distance_km
    from public.profiles p
    where p.role in('provider','professional')
      and p.verification_status='verified'
      and p.verified=true
      and p.latitude is not null and p.longitude is not null
      and (p_category is null or lower(coalesce(p.service_category,''))=lower(p_category))
  )
  select * from candidates where distance_km<=greatest(1,p_radius_km)
  order by distance_km asc limit greatest(1,least(p_limit,100));
$$;
grant execute on function public.search_nearby_providers(double precision,double precision,double precision,text,integer) to authenticated;

drop function if exists public.search_public_providers(double precision,double precision,double precision,text,text,integer);
create or replace function public.search_public_providers(
  p_lat double precision,p_lng double precision,p_radius_km double precision default 25,
  p_category text default null,p_query text default null,p_limit integer default 24
)
returns table(id uuid,full_name text,role text,avatar_url text,latitude double precision,longitude double precision,location_name text,service_category text,hourly_rate integer,rating numeric,review_count integer,availability text,verified boolean,verification_status text,bio text,distance_km double precision)
language sql stable security definer set search_path=''
as $$
  with candidates as (
    select p.id,p.full_name,p.role,p.avatar_url,p.latitude,p.longitude,p.location_name,p.service_category,p.hourly_rate,p.rating,p.review_count,p.availability,p.verified,p.verification_status,p.bio,
    6371*acos(least(1,greatest(-1,sin(radians(p_lat))*sin(radians(p.latitude))+cos(radians(p_lat))*cos(radians(p.latitude))*cos(radians(p.longitude)-radians(p_lng))))) distance_km
    from public.profiles p
    where p.role in ('provider','professional')
    and p.verification_status='verified' and p.verified=true
    and p.latitude is not null and p.longitude is not null
    and (p_category is null or lower(coalesce(p.service_category,''))=lower(p_category))
    and (p_query is null or trim(p_query)='' or lower(coalesce(p.full_name,'')) like '%'||lower(trim(p_query))||'%' or lower(coalesce(p.service_category,'')) like '%'||lower(trim(p_query))||'%' or lower(coalesce(p.location_name,'')) like '%'||lower(trim(p_query))||'%' or lower(coalesce(p.bio,'')) like '%'||lower(trim(p_query))||'%')
  ) select * from candidates where distance_km<=greatest(1,p_radius_km) order by distance_km limit greatest(1,least(p_limit,100));
$$;
revoke all on function public.search_public_providers(double precision,double precision,double precision,text,text,integer) from public;
grant execute on function public.search_public_providers(double precision,double precision,double precision,text,text,integer) to anon,authenticated;

drop function if exists public.get_public_provider(uuid);
create or replace function public.get_public_provider(p_provider_id uuid)
returns table(id uuid,full_name text,role text,avatar_url text,latitude double precision,longitude double precision,location_name text,service_category text,hourly_rate integer,rating numeric,review_count integer,availability text,verified boolean,verification_status text,bio text)
language sql stable security definer set search_path=''
as $$ select p.id,p.full_name,p.role,p.avatar_url,p.latitude,p.longitude,p.location_name,p.service_category,p.hourly_rate,p.rating,p.review_count,p.availability,p.verified,p.verification_status,p.bio from public.profiles p where p.id=p_provider_id and p.role in('provider','professional') and p.verification_status='verified' and p.verified=true limit 1 $$;
revoke all on function public.get_public_provider(uuid) from public;
grant execute on function public.get_public_provider(uuid) to anon,authenticated;

drop function if exists public.get_public_provider_services(uuid);
create or replace function public.get_public_provider_services(p_provider_id uuid)
returns table(id uuid,name text,description text,starting_price integer,unit text)
language sql stable security definer set search_path=''
as $$ select s.id,s.name,s.description,s.starting_price,s.unit from public.provider_services s join public.profiles p on p.id=s.provider_id where s.provider_id=p_provider_id and s.is_active=true and p.verification_status='verified' and p.verified=true order by s.starting_price $$;
revoke all on function public.get_public_provider_services(uuid) from public;
grant execute on function public.get_public_provider_services(uuid) to anon,authenticated;
