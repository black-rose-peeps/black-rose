-- Runtime flags for Cloudflare discord-sync Worker.
-- Required for temporary boost mode (/sync/boost endpoint).

create table if not exists public.worker_runtime_flags (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.worker_runtime_flags enable row level security;
alter table public.worker_runtime_flags force row level security;

-- No client policies on purpose.
-- With RLS enabled and no policies, anon/authenticated clients cannot read/write this table.
-- The Worker uses SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS.
