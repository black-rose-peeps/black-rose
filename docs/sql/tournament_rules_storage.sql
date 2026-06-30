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

-- Admin console uploads via anon key (align with open tournament write policies in dev).
drop policy if exists "Allow tournament rules uploads" on storage.objects;
create policy "Allow tournament rules uploads"
  on storage.objects for all
  using (bucket_id = 'tournament-rules')
  with check (bucket_id = 'tournament-rules');
