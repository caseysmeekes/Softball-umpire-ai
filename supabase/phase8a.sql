-- Softball Umpire AI - Phase 8A
-- Username-only identity. No passwords, email auth, roles or permissions.

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  created_at timestamptz not null default now()
);

comment on table public.app_users is 'Phase 8A lightweight application identity. Not an authentication/security table.';
