-- Allow multiple replies per profile comment thread (owner + original commenter).
-- Run in Supabase SQL Editor after profile_comments.sql.

drop index if exists public.profile_comments_one_reply_per_parent;
