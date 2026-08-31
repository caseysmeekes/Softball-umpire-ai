# Supabase Database Foundation

## Phase 2 scope

This directory contains the database foundation only. The application is intentionally unchanged and continues to use its existing localStorage persistence.

## Current application mapping

| Current concept | Current implementation | Supabase foundation |
|---|---|---|
| Tournament | `Tournament` object in `lib/tournament.ts` | `tournaments` |
| Tournament day | `TournamentDay` with `id`, `name`, `date`, `games`, `assignments`, `manualLocks` | `tournament_days` |
| Game | `Game` in `lib/types.ts` | `games` |
| Umpire | `Umpire` in `lib/types.ts` | `umpires` |
| Day availability | `availabilityByDay[dayIndex]` | `umpire_availability` |
| Allocation | `Assignment { gameId, umpireId, position }` | `allocations` |
| Position | Union of Plate/Base 1/Base 2/Base 3 | constrained text values |
| Manual lock | `gameId::position` key plus assignment | `manual_locks` |
| Rules | `TOURNAMENT_RULES` / enabled rule IDs | `rules` + `tournament_rules` |
| Change history | `softball-allocation-change-history` | `allocation_change_history` |
| Workload | Calculated from assignments | derived, not stored |
| Validation/status | Calculated by `validateUmpire` | derived, not stored |
| Selected day | `softball-selected-day` | UI/session state, not persistent domain data |
| Draft allocation | React `draft` state | transient; not a separate table in Phase 2 |
| Committed allocation | persisted inside tournament assignments | current `allocations` table represents the future persisted state |

## Important identity decisions

The existing umpire IDs and game IDs are strings, so the foundation keeps those IDs as text primary keys rather than forcing a new application-facing identity format. Database-only tournament and day records use UUIDs, while tournament days also retain the existing `legacy_id` such as `day-1`.

The existing allocation has no standalone ID. Its natural identity is the game + position slot, so `allocations` uses `(game_id, position)` as its primary key and retains `umpire_id` as the assigned umpire.

## Day isolation

A tournament owns many `tournament_days`. Games and allocation-related records are attached to a day through their game/day relationships. Availability is explicitly keyed by umpire and tournament day, matching the existing `availabilityByDay[dayIndex]` model.

## Draft and committed state

The current application keeps `draft` and `committed` as React state. The `softball-tournament` localStorage record persists the current assignment set when committed. Therefore Phase 2 does **not** invent a second persisted draft architecture. Phase 3 should decide whether the database needs draft snapshots or whether draft remains client-side until commit.

## Derived data

Workload, Schedule Status, violation lists and validation results are derived from current games, assignments, umpire data, enabled rules and selected day. They should not be stored as authoritative database values.

## Rules

The current rule catalogue uses stable string IDs such as `max-games`, `no-double-booking`, `availability`, `one-plate` and `workload-balance`. The foundation preserves those IDs in `rules` and stores tournament-specific enablement in `tournament_rules`. Rule descriptions remain data, not executable database logic.

## Migration risks to address later

1. Existing localStorage may contain legacy keys as well as the newer `softball-tournament` object.
2. Existing dates and times are stored as strings and must be converted carefully during migration.
3. The application has five configured day slots, so migration must preserve empty days as well as populated days.
4. Umpire IDs must remain stable so existing allocations continue to point at the same person.
5. Availability is day-specific and must never be flattened into tournament-wide availability.
6. Change history currently has a global localStorage key but each entry contains a day index. Migration must preserve that day association.
7. Draft state is not currently persisted independently from committed tournament data.
8. Workload and validation should remain derived to avoid stale database values.
9. Country is not currently part of the `Umpire` TypeScript model, so it has intentionally not been added to the foundation schema.

## Future migration approach

1. Provision/configure the Supabase project outside this repository.
2. Apply the migration without changing the application.
3. Build a read-only verification/mapping layer against a copy of localStorage data.
4. Migrate one representative tournament into Supabase.
5. Compare games, umpires, availability, allocations, locks, rules and history before changing application reads.
6. Introduce Supabase reads behind the existing domain model without changing allocation/validation behaviour.
7. Introduce writes and commit semantics only after read parity is demonstrated.
8. Retain a controlled local fallback during the transition.
9. Remove local persistence only after migration and regression testing are complete.
