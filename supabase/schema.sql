-- SAVIS backend schema
-- Run this once in Supabase: SQL Editor → New query → Paste → Run

-- Profiles (safe if already exists)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  role text check (role in ('consumer', 'provider', 'professional', 'seller', 'agent')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Jobs / bookings
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  consumer_id uuid references auth.users (id) on delete set null,
  provider_id text,
  provider_name text not null,
  skill text,
  description text not null,
  location text not null,
  urgency text default 'today',
  rate integer default 0,
  status text not null default 'requested'
    check (status in ('requested', 'accepted', 'declined', 'completed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists jobs_status_idx on public.jobs (status);
create index if not exists jobs_consumer_idx on public.jobs (consumer_id);
create index if not exists jobs_created_idx on public.jobs (created_at desc);

alter table public.jobs enable row level security;

-- Any logged-in user can read jobs (prototype; tighten later)
drop policy if exists "Authenticated users can read jobs" on public.jobs;
create policy "Authenticated users can read jobs"
  on public.jobs for select
  to authenticated
  using (true);

-- Consumers create jobs
drop policy if exists "Authenticated users can create jobs" on public.jobs;
create policy "Authenticated users can create jobs"
  on public.jobs for insert
  to authenticated
  with check (auth.uid() = consumer_id);

-- Authenticated users can update status (accept / decline / complete)
drop policy if exists "Authenticated users can update jobs" on public.jobs;
create policy "Authenticated users can update jobs"
  on public.jobs for update
  to authenticated
  using (true)
  with check (true);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists jobs_updated_at on public.jobs;
create trigger jobs_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

-- Reviews (run this if you already ran the first schema)
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs (id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz default now()
);

alter table public.reviews enable row level security;

drop policy if exists "Anyone authenticated can read reviews" on public.reviews;
create policy "Anyone authenticated can read reviews"
  on public.reviews for select to authenticated using (true);

drop policy if exists "Authenticated users can insert reviews" on public.reviews;
create policy "Authenticated users can insert reviews"
  on public.reviews for insert to authenticated with check (true);


-- Location foundation for nearby discovery
alter table public.profiles add column if not exists latitude double precision;
alter table public.profiles add column if not exists longitude double precision;
alter table public.profiles add column if not exists location_name text;
create index if not exists profiles_location_idx on public.profiles (latitude, longitude) where latitude is not null and longitude is not null;
alter table public.jobs add column if not exists latitude double precision;
alter table public.jobs add column if not exists longitude double precision;
alter table public.jobs add column if not exists location_accuracy double precision;
create index if not exists jobs_location_idx on public.jobs (latitude, longitude) where latitude is not null and longitude is not null;
