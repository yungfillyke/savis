-- A provider may have only one pending quote per job. This protects the job
-- from duplicate submissions even if a user double-clicks or opens two tabs.
create unique index if not exists quotes_one_pending_per_provider_job_idx
  on public.quotes (job_id, provider_id)
  where status = 'pending';
