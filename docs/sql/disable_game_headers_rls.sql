-- Fix RLS policies for game-headers storage bucket
-- Run in Supabase SQL Editor
-- Note: Cannot disable RLS on storage.objects due to permissions, so we create permissive policies

-- Drop existing policies if they exist
drop policy if exists "Game headers public read" on storage.objects;
drop policy if exists "Game headers authenticated upload" on storage.objects;
drop policy if exists "Game headers authenticated update" on storage.objects;
drop policy if exists "Game headers authenticated delete" on storage.objects;
drop policy if exists "Game headers allow all" on storage.objects;

-- Create permissive policy for all operations on game-headers bucket
create policy "Game headers allow all"
on storage.objects for all
to anon, authenticated
using (bucket_id = 'game-headers')
with check (bucket_id = 'game-headers');
