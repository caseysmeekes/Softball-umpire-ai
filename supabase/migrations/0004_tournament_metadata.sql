-- Phase 7C: optional tournament setup metadata
alter table tournaments
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists location text,
  add column if not exists venue text,
  add column if not exists number_of_fields integer;
