-- =============================================================================
-- Black Rose Arena — tournament official ruleset files (Supabase Storage)
-- Run once in Supabase → SQL Editor (after tournament_rules_url.sql)
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tournament-rules',
  'tournament-rules',
  true,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read — rulesets are published on the tournament Rules tab.
drop policy if exists "Public read tournament rules files" on storage.objects;
create policy "Public read tournament rules files"
  on storage.objects for select
  using (bucket_id = 'tournament-rules');

-- Admin console uploads via anon key until Supabase Auth + admin RLS is wired.
-- Writes are scoped to {tournament_uuid}/official-rules.{pdf,doc,docx} only.
drop policy if exists "Allow tournament rules uploads" on storage.objects;
drop policy if exists "Allow tournament rules insert" on storage.objects;
drop policy if exists "Allow tournament rules update" on storage.objects;
drop policy if exists "Allow tournament rules delete" on storage.objects;

create policy "Allow tournament rules insert"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'tournament-rules'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and storage.filename(name) ~ '^official-rules\.(pdf|doc|docx)$'
  );

create policy "Allow tournament rules update"
  on storage.objects for update
  to anon, authenticated
  using (
    bucket_id = 'tournament-rules'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and storage.filename(name) ~ '^official-rules\.(pdf|doc|docx)$'
  )
  with check (
    bucket_id = 'tournament-rules'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and storage.filename(name) ~ '^official-rules\.(pdf|doc|docx)$'
  );

create policy "Allow tournament rules delete"
  on storage.objects for delete
  to anon, authenticated
  using (
    bucket_id = 'tournament-rules'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  );
