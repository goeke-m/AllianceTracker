# Season Participation Tracker — Design

## Goal

An admin-only tracker for recording, per member and per season, participation in the single season battle that drives alliance ranking, plus kills. Starts with seasons 5 and 6.

## Data model

New migration adds `season_battle_stats`:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | default `gen_random_uuid()` |
| `season` | int | not null |
| `member_id` | uuid FK → `members(id)` | on delete cascade |
| `participation` | int | not null, default 0, check ≥ 0 (count, e.g. attacks/rounds joined) |
| `kills` | bigint | not null, default 0, check ≥ 0 |
| `created_at` / `updated_at` | timestamptz | default `now()` |

- Unique constraint on `(season, member_id)`.
- RLS enabled. Admin-only select/insert/update/delete using the existing `is_admin` JWT `user_metadata` claim (same pattern as `vs_points`). Grants match the other tables.

## Seasons

`SEASONS = [5, 6]` exported from `src/lib/constants.ts`. Adding a season later means adding a number. No seasons table.

## UI

New "Season" tab in `AdminPanel` (`admin.tabSeason`), rendering `src/components/SeasonStatsManager.tsx`.

- Season selector (5 / 6) at the top; defaults to the latest season.
- Roster table, one row per member: Member, Participation, Kills.
  - Default sort rank then name (reuse existing helper if exported); header click sorts; name filter as in `VsPointManager`.
  - Participation and Kills are inline numeric inputs. Members without a record show 0.
- One "Save" button upserts only changed rows with `onConflict: 'season,member_id'`. Shows saving / saved / error states. Errors go through `logError('SeasonStatsManager.handleSave', error)`.
- Numbers displayed with `formatNumber`.
- Switching season with unsaved edits: discard edits on switch (simple; the Save button state makes pending changes visible).
- Strings added to `en`, `es`, `ko`, `pt-BR` under `seasonStats.*` plus `admin.tabSeason`.

## Code layout

- `src/lib/types.ts`: `SeasonBattleStat` interface.
- `src/lib/seasonStats.ts`: pure helpers — merge roster with records into rows; build upsert payload from changed rows; validate/normalize numeric input (non-negative integers, blank → 0).
- `src/lib/seasonStats.test.ts`: vitest coverage of the helpers.
- `src/components/SeasonStatsManager.tsx`: data loading, table, save.
- `src/pages/AdminPanel.tsx`: tab wiring.
- `supabase/migrations/<timestamp>_season_battle_stats.sql`.

## Error handling

Load and save failures surface an inline message and are logged. Invalid input (negative, non-integer) is rejected at the input/normalize step before save.

## Testing

Vitest for helpers. Manual verification of the tab in the dev server (load, edit, save, reload persistence, season switch).

## Out of scope

Public leaderboard, JSON import, per-battle history, season CRUD, non-admin access.
