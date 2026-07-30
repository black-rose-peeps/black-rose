-- Create storage bucket for game header images
-- Run in Supabase SQL Editor

-- Create the bucket
insert into storage.buckets (id, name, public)
values ('game-headers', 'game-headers', true)
on conflict (id) do nothing;

-- Create RLS policies for the bucket
-- Public read access
create policy "Game headers public read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'game-headers');

-- Authenticated users can upload
create policy "Game headers authenticated upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'game-headers');

-- Authenticated users can update (replace) images
create policy "Game headers authenticated update"
on storage.objects for update
to authenticated
using (bucket_id = 'game-headers')
with check (bucket_id = 'game-headers');

-- Authenticated users can delete
create policy "Game headers authenticated delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'game-headers');
