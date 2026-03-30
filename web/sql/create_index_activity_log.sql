create table if not exists public.index_activity_log (
  id uuid primary key default gen_random_uuid(),
  request_id text null,
  source text not null,
  event_type text not null,
  status text not null,
  user_id uuid null references public.users(id) on delete set null,
  owner_anon_id text null,
  user_email text null,
  file_key text null,
  file_name text null,
  logical_file_id text null,
  page_count integer null,
  frame_count integer null,
  duration_ms integer null,
  message text null,
  error text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists index_activity_log_created_at_idx
  on public.index_activity_log (created_at desc);

create index if not exists index_activity_log_status_idx
  on public.index_activity_log (status);

create index if not exists index_activity_log_user_id_idx
  on public.index_activity_log (user_id);

create index if not exists index_activity_log_file_key_idx
  on public.index_activity_log (file_key);
