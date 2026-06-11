-- Profile comments (Steam-style testimonials) — run in Supabase SQL Editor
--
-- Verified members can leave comments on other verified members' public profiles.
-- Profile owners can hide comments or post a single reply per top-level comment.

create table if not exists public.profile_comments (
  id uuid primary key default gen_random_uuid(),
  profile_member_id uuid not null references public.members (id) on delete cascade,
  author_member_id uuid not null references public.members (id) on delete cascade,
  parent_comment_id uuid references public.profile_comments (id) on delete cascade,
  body text not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_comments_body_length check (char_length(trim(body)) between 1 and 500),
  constraint profile_comments_no_self_parent check (
    parent_comment_id is null or parent_comment_id <> id
  )
);

create index if not exists profile_comments_profile_idx
  on public.profile_comments (profile_member_id, created_at desc);

create index if not exists profile_comments_parent_idx
  on public.profile_comments (parent_comment_id)
  where parent_comment_id is not null;

-- One owner reply per top-level comment
create unique index if not exists profile_comments_one_reply_per_parent
  on public.profile_comments (parent_comment_id)
  where parent_comment_id is not null;

alter table public.profile_comments enable row level security;

drop policy if exists "Public read visible profile comments" on public.profile_comments;

create policy "Public read visible profile comments"
  on public.profile_comments for select to anon, authenticated
  using (is_hidden = false);

-- Writes are performed via service role in server functions.
