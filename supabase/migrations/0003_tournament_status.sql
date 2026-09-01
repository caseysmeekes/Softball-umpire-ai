-- Phase 7B: tournament lifecycle status
-- Existing tournaments remain active by default.

alter table tournaments
  add column if not exists status text not null default 'active'
  check (status in ('active', 'completed'));

create index if not exists idx_tournaments_status on tournaments(status);
