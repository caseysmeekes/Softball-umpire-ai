# Phase 4: Controlled localStorage to Supabase migration

Phase 4 adds a migration utility without changing the application's persistence behaviour. The application continues to read and write localStorage. The migration is never invoked automatically on application load.

## Local storage sources

The migration reads these current keys:

- `softball-tournament` - canonical multi-day tournament object containing days, games, assignments and manual locks.
- `softball-umpires` - tournament-wide umpire pool.
- `softball-enabled-rules` - enabled rule IDs. An empty list means the application's default-enabled rules are effective.
- `softball-allocation-change-history` - manual allocation history, with a day index on each entry.
- `softball-selected-day` - UI/session state only. It is read for completeness and is not migrated as domain data.

If `softball-tournament` does not exist, the migration uses the legacy `softball-games`, `softball-assignments` and `softball-manual-locks` keys as a compatibility source and places those records into Day 1. This is reported as a legacy-source migration.

## Identity decisions

The local `Tournament` type has no persistent tournament ID. Phase 4 therefore creates a new UUID and stores it temporarily in `softball-supabase-migration-id` so an explicit migration can be retried or verified without generating another target tournament.

Existing IDs are preserved for:

- tournament day IDs, stored in `tournament_days.legacy_id`
- game IDs
- umpire IDs
- allocation identity, represented by `(game_id, position)`
- manual change-history IDs

The Supabase day primary key remains a generated UUID because the Phase 2 schema intentionally separates database identity from the local day ID.

## Explicit migration

The migration utility is `lib/supabase/migration.ts`.

The application does not call it on startup and no UI has been changed to invoke it. A developer can explicitly call:

```ts
await migrateLocalStorageToSupabase()
```

The function validates the complete local snapshot before writing anything. It then performs a preflight check for duplicate game, umpire and history IDs and conflicting rule definitions.

## Failure handling

The migration records the generated target tournament ID and only uses it for this migration attempt. If any write fails, the utility performs a targeted rollback of the records created by that attempt. The original localStorage data is never deleted or replaced.

If rollback itself fails, the utility reports that explicitly rather than claiming success.

## Transformations

The main data transformation is time formatting. Local game and availability times can use values such as `10:00 AM` or `23:59`; PostgreSQL receives `HH:MM:SS` values.

No allocation, umpire, game or day ID is silently regenerated.

Draft state is not migrated separately. The current application keeps draft allocation in React state and persists the current assignment set in the tournament localStorage record. Workload, validation and schedule status remain derived values.

## Verification

`verifyLocalStorageMigration()` reads the migrated tournament and compares core local data against Supabase, including tournament name, game identity and schedule fields, umpire identity, and allocation identity. It also reports counts for days, games, umpires, availability, allocations, manual locks, tournament rules and history.

The selected-day UI state and derived workload/validation state are intentionally not treated as persistent database records.

## Safety boundary

Phase 4 does **not**:

- replace localStorage
- change application reads or writes
- add authentication
- change the allocation engine
- change validation or rules
- change UI behaviour
- delete local data
- introduce a database-backed draft architecture

The next phase should only begin after a representative migrated tournament has been verified successfully and the existing application regression suite remains green.
