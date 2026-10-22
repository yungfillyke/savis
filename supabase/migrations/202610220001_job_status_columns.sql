-- Keep the production job status RPC compatible with the jobs table.
-- These columns were referenced by transition_job but missing in the live schema.
alter table public.jobs add column if not exists cancelled_reason text;
alter table public.jobs add column if not exists completed_at timestamptz;
alter table public.jobs add column if not exists quoted_amount integer;
