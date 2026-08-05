-- Setup RLS policies for game-icons storage bucket
-- IMPORTANT: Since you cannot disable RLS on storage.objects (system table),
-- we need to ensure the bucket is created with proper RLS policies.
-- The bucket should already be created and public.

-- Drop existing policies if they exist
drop policy if exists "Game Icons Public Read" on storage.objects;
drop policy if exists "Game Icons Authenticated Upload" on storage.objects;
drop policy if exists "Game Icons Authenticated Update" on storage.objects;
drop policy if exists "Game Icons Authenticated Delete" on storage.objects;
drop policy if exists "Game Icons Allow All" on storage.objects;

-- Create a permissive policy matching game-headers bucket exactly
-- This allows all operations on game-icons bucket for both anon and authenticated users
create policy "Game Icons Allow All"
on storage.objects for all
to anon, authenticated
using (bucket_id = 'game-icons')
with check (bucket_id = 'game-icons');
