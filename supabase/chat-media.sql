-- SAVIS private chat media: photo attachments and voice notes.
-- Apply in Supabase SQL Editor after realtime-messaging.sql.
alter table public.messages add column if not exists attachment_type text;
alter table public.messages drop constraint if exists messages_attachment_type_check;
alter table public.messages add constraint messages_attachment_type_check check (attachment_type is null or attachment_type in ('image','audio'));
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('job-message-media','job-message-media',false,12582912,array['image/jpeg','image/png','image/webp','image/heic','image/heif','audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav','audio/x-m4a'])
on conflict (id) do update set public=false,file_size_limit=12582912,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Chat participants read message media" on storage.objects;
create policy "Chat participants read message media" on storage.objects for select to authenticated using (bucket_id='job-message-media' and exists (select 1 from public.conversations c where c.id::text=split_part(name,'/',1) and (c.consumer_id=auth.uid() or c.provider_id=auth.uid()::text)));
drop policy if exists "Chat participants upload own message media" on storage.objects;
create policy "Chat participants upload own message media" on storage.objects for insert to authenticated with check (bucket_id='job-message-media' and split_part(name,'/',2)=auth.uid()::text and exists (select 1 from public.conversations c where c.id::text=split_part(name,'/',1) and (c.consumer_id=auth.uid() or c.provider_id=auth.uid()::text)));
drop policy if exists "Chat participants delete own message media" on storage.objects;
create policy "Chat participants delete own message media" on storage.objects for delete to authenticated using (bucket_id='job-message-media' and split_part(name,'/',2)=auth.uid()::text and exists (select 1 from public.conversations c where c.id::text=split_part(name,'/',1) and (c.consumer_id=auth.uid() or c.provider_id=auth.uid()::text)));
