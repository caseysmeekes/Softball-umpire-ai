-- Phase 2: Supabase database foundation
-- Discovery-informed schema only. The application continues to use localStorage.
-- No application tables are populated by this migration.

create extension if not exists pgcrypto;

create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tournament_days (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  legacy_id text not null,
  day_index smallint not null check (day_index >= 0 and day_index < 5),
  name text not null,
  date date,
  created_at timestamptz not null default now(),
  unique (tournament_id, legacy_id),
  unique (tournament_id, day_index)
);

create table if not exists umpires (
  id text primary key,
  tournament_id uuid not null references tournaments(id) on delete cascade,
  name text not null,
  experience text not null check (experience in ('International','National','Regional','Developing')),
  max_games integer not null check (max_games >= 1 and max_games <= 10),
  legacy_availability text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, id)
);

create table if not exists umpire_availability (
  id uuid primary key default gen_random_uuid(),
  umpire_id text not null references umpires(id) on delete cascade,
  tournament_day_id uuid not null references tournament_days(id) on delete cascade,
  enabled boolean not null default true,
  from_time time,
  until_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (umpire_id, tournament_day_id),
  check ((enabled = false) or (from_time is not null and until_time is not null)),
  check ((from_time is null and until_time is null) or (from_time is not null and until_time is not null))
);

create table if not exists games (
  id text primary key,
  tournament_day_id uuid not null references tournament_days(id) on delete cascade,
  number integer not null,
  date date not null,
  start_time time not null,
  end_time time,
  field text not null,
  teams text not null,
  division text not null,
  positions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_day_id, number),
  check (end_time is null or end_time >= start_time),
  check (positions <@ array['Plate','Base 1','Base 2','Base 3']::text[])
);

create table if not exists allocations (
  game_id text not null references games(id) on delete cascade,
  umpire_id text not null references umpires(id) on delete restrict,
  position text not null check (position in ('Plate','Base 1','Base 2','Base 3')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (game_id, position)
);

create table if not exists manual_locks (
  game_id text not null references games(id) on delete cascade,
  position text not null check (position in ('Plate','Base 1','Base 2','Base 3')),
  umpire_id text not null references umpires(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (game_id, position),
  foreign key (game_id, position) references allocations(game_id, position) on delete cascade
);

create table if not exists rules (
  id text primary key,
  name text not null,
  category text not null check (category in ('hard','soft')),
  description text not null,
  default_enabled boolean not null default false
);

create table if not exists tournament_rules (
  tournament_id uuid not null references tournaments(id) on delete cascade,
  rule_id text not null references rules(id) on delete restrict,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (tournament_id, rule_id)
);

create table if not exists allocation_change_history (
  id text primary key,
  tournament_day_id uuid not null references tournament_days(id) on delete cascade,
  game_id text not null references games(id) on delete cascade,
  game_number integer not null,
  time text,
  diamond text,
  position text not null check (position in ('Plate','Base 1','Base 2','Base 3')),
  from_umpire text not null,
  to_umpire text not null,
  status text not null check (status in ('Pending','Committed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_tournament_days_tournament on tournament_days(tournament_id);
create index if not exists idx_umpires_tournament on umpires(tournament_id);
create index if not exists idx_availability_day on umpire_availability(tournament_day_id);
create index if not exists idx_availability_umpire on umpire_availability(umpire_id);
create index if not exists idx_games_day on games(tournament_day_id);
create index if not exists idx_allocations_umpire on allocations(umpire_id);
create index if not exists idx_allocations_game on allocations(game_id);
create index if not exists idx_locks_umpire on manual_locks(umpire_id);
create index if not exists idx_history_day on allocation_change_history(tournament_day_id);
create index if not exists idx_history_game on allocation_change_history(game_id);

-- The current application derives workload, validation/status, and selected day at runtime.
-- Draft allocation is transient React state; the persisted localStorage tournament currently
-- represents the committed allocation. No separate draft table is introduced in Phase 2.
