# Member Timezone Field Design Spec

**Date:** 2026-06-21
**Status:** Approved

## Overview

Replace the unused free-text `Availability` field on the member list (`src/components/MemberManager.tsx`) with a `Timezone` field backed by a fixed dropdown of named UTC offsets. The DB column, type, and UI are renamed/converted in place — no new orthogonal field, no scheduling logic changes.

---

## 1. Scope

- **In scope:** rename `Availability` → `Timezone` across the DB column, `Member` type, and `MemberManager.tsx` (edit input, table header, display cell); convert the free-text edit input into a `<select>` populated from a fixed timezone list.
- **Out of scope / unchanged:**
  - No sorting or filtering by timezone (the old `Availability` column had neither).
  - No DST-aware time math — the dropdown values are static labels, not live-computed offsets.
  - No use of the timezone value elsewhere (e.g. train schedule display) — purely a member-list field today.

## 2. Data Model

- `scripts/timezone-migration.sql` (new, follows the existing ad-hoc migration pattern e.g. `game-uid-migration.sql`):
  ```sql
  ALTER TABLE members RENAME COLUMN "Availability" TO "Timezone";
  ```
  A rename (not drop+add) preserves the column as-is; existing values are all `NULL` in practice so there's nothing to backfill.
- `src/lib/types.ts`: `Member.Availability?: string` → `Member.Timezone?: string`.
- `scripts/seed-members.sql`: update the column name in the `INSERT ... ("Availability", ...)` column list to `"Timezone"`. Values stay `NULL`; the `ON CONFLICT` update clause doesn't touch this column today and stays that way.

## 3. Timezone List

A curated, static list of 20 labeled UTC offsets, covering the alliance's apparent global member spread (NA/EU/BR/KR/etc.) without enumerating every IANA zone:

```
Hawaii (UTC-10)
Alaska (UTC-9)
Pacific (UTC-8)
Mountain (UTC-7)
Central (UTC-6)
Eastern (UTC-5)
Atlantic (UTC-4)
Brazil (UTC-3)
UTC
Central Europe (UTC+1)
Eastern Europe (UTC+2)
Moscow (UTC+3)
Gulf (UTC+4)
India (UTC+5:30)
Bangladesh (UTC+6)
Indochina (UTC+7)
China/Singapore (UTC+8)
Japan/Korea (UTC+9)
Australia East (UTC+10)
New Zealand (UTC+12)
```

The stored value is the label string itself (e.g. `"Eastern (UTC-5)"`) — same pattern `Rank` and `S1_Type`/`S2_Type` already use for storing their displayed value directly, with no separate code/label mapping table.

Defined as a `TIMEZONES: string[]` const in `MemberManager.tsx`, alongside the existing `RANKS`/`SQUAD_TYPES` consts.

## 4. Component Changes (`src/components/MemberManager.tsx`)

- `EditState.Availability: string` → `EditState.Timezone: string`.
- `memberToEditState`: `Availability: m.Availability ?? ''` → `Timezone: m.Timezone ?? ''`.
- `handleSave`: `Availability: editState.Availability || null` → `Timezone: editState.Timezone || null`.
- `set('Availability', ...)` calls → `set('Timezone', ...)`.
- Edit-row cell: replace the free-text `<input type="text">` with a `<select>` (same `inputCls` styling as the Rank/Sq Type dropdowns), with a blank `<option value="">—</option>` plus one `<option>` per `TIMEZONES` entry.
- Table header: `<th className={thCls}>Availability</th>` → `<th className={thCls}>Timezone</th>` (still non-sortable, no `onClick`, consistent with current behavior).
- Display cell: `m.Availability` → `m.Timezone`, same truncate/title/`'—'` fallback behavior.

## 5. Error Handling

No new error paths — this reuses the existing `handleSave` Supabase update call and its existing (lack of) error handling, consistent with how the other edit fields (Rank, THP, Strike_Team, etc.) behave today.

## 6. Testing

No existing automated test coverage for `MemberManager` (no test files in the repo for this component). Manual verification in the running dev app:
- Edit a member, confirm the Timezone dropdown shows the blank option plus all 20 entries.
- Select a value, save, confirm it persists (reflected in the display cell and after a page refresh).
- Confirm clearing back to the blank option and saving stores `NULL` (displays `—`).
- Confirm the rest of the edit/add/delete/filter/sort flows are unaffected.
