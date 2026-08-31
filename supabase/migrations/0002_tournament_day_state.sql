-- Phase 5 preparation: explicit persisted draft/committed day state.
-- This does not change application behaviour by itself. Phase 5B will use this
-- table through the Supabase data-access layer when redirecting persistence.
--
-- The JSON columns intentionally preserve the existing application Assignment
-- and manual-lock representations without introducing a second domain model.
-- The normalised allocations/manual_locks tables remain available for the
-- relational committed representation used by the existing data layer.

create table if not exists tournament_day_state (
  tournament_day_id uuid primary key references tournament_days(id) on delete cascade,
  draft_assignments jsonb not null default '[]'::jsonb,
  draft_manual_locks jsonb not null default '[]'::jsonb,
  committed_assignments jsonb not null default '[]'::jsonb,
  committed_manual_locks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(draft_assignments) = 'array'),
  check (jsonb_typeof(draft_manual_locks) = 'array'),
  check (jsonb_typeof(committed_assignments) = 'array'),
  check (jsonb_typeof(committed_manual_locks) = 'array')
);

create index if not exists idx_tournament_day_state_tournament_day
  on tournament_day_state(tournament_day_id);

comment on table tournament_day_state is
  'Explicit persistence bridge for application draft and committed state. Used by Phase 5B; not a second application domain model.';
