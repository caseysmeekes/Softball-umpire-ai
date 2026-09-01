-- Softball Umpire AI - Phase 8B
-- Associate tournaments with the Phase 8A username identity.
-- Existing test tournaments may remain unowned. New tournaments require an owner.

alter table public.tournaments
  add column if not exists owner_id uuid references public.app_users(id);

create index if not exists tournaments_owner_id_idx
  on public.tournaments(owner_id);

comment on column public.tournaments.owner_id is 'Phase 8B owner: app_users.id for the user who created the tournament.';
