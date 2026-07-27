# Train Schedule — Boarding Time Design Spec

**Date:** 2026-07-27
**Status:** Approved

## Overview

The train's departure time varies day to day now that the alliance is international, so members can no longer assume a fixed daily time. Add an optional "boarding time" to each day's Train Schedule entry — a single hour, selectable in 1-hour blocks — so admins can give members a heads-up on when to expect the train that day. This is purely an informational label for members ("Server Time" is wording only, not a timezone conversion); it does not drive any reset logic or affect the existing VS-day calculation.

## 1. Scope

- **In scope:**
  - A new optional field on each day's `train_schedule` entry: an hour (0–23) representing the expected boarding time, editable by admins alongside Conductor/VIP/Notes.
  - Display of the set boarding time on each day's card, visible to all users (not just admins).
  - Persisted server-side (shared across all viewers), same as the rest of the entry.
- **Out of scope:**
  - Minutes/sub-hour precision — 1-hour blocks only.
  - Any timezone conversion or per-viewer local-time display — the value is stored and shown as-is, labeled "(Server Time)" for context only.
  - Any change to the existing VS-day reset logic (`getActiveVsDateStr`) or week-mode toggle.
  - Notifications/reminders tied to the boarding time — display only.

## 2. Data Layer

### Schema change: `train_schedule.boarding_hour`

```sql
ALTER TABLE "public"."train_schedule"
  ADD COLUMN "boarding_hour" smallint;

ALTER TABLE "public"."train_schedule"
  ADD CONSTRAINT "train_schedule_boarding_hour_check"
  CHECK ("boarding_hour" IS NULL OR ("boarding_hour" >= 0 AND "boarding_hour" <= 23));
```

New migration file: `supabase/migrations/<timestamp>_train_schedule_boarding_hour.sql`, following the existing plain-`ALTER TABLE` pattern used in `20260723011851_storm_roster_requested_role.sql`. `NULL` means "not set" (the common case until an admin fills it in); no default value.

No RLS changes needed — `train_schedule` read/write policies already cover all columns on the table.

### Type (`src/lib/types.ts`)

```ts
export interface TrainEntry {
  id: string;
  date: string; // YYYY-MM-DD
  conductor: string; // member id
  vip: string; // member id
  notes?: string;
  boardingHour: number | null; // 0-23, server-time hour block; null = not set
  created_at: string;
  updated_at: string;
}
```

### Hook (`src/hooks/useTrainSchedule.ts`)

- `fetchData`: map DB column `boarding_hour` → `boardingHour` on each entry (same pattern as the existing `Date`/`Conductor`/`VIP` remapping).
- `saveEntry` signature becomes:
  ```ts
  saveEntry(date: string, conductorId: string, vipId: string, notes: string, boardingHour: number | null, existingId?: string): Promise<void>
  ```
  writes `boarding_hour: boardingHour` in the upsert payload (insert or update), alongside `Date`/`Conductor`/`VIP`/`notes`.

## 3. UI — Edit Modal (`src/pages/TrainSchedule.tsx`)

- `EditState` gains `boardingHour: number | null`, initialized from `existing?.boardingHour ?? null` in `openEdit`.
- New `<select>` between the VIP field and the Notes field, labeled with a new `schedule.boardingTimeLabel` key ("Boarding Time"):
  - First option: blank/"not set" (`schedule.boardingTimeUnsetOption`), value `""`.
  - 24 options, one per hour, value `"0"`–`"23"`, displayed 24-hour format zero-padded (`00:00`, `01:00`, … `23:00`).
  - On change, parse to `number | null` (empty string → `null`) and update `editState.boardingHour`.
- `handleSave` passes `editState.boardingHour` through to `saveEntry` in the new parameter position.

## 4. UI — Day Card Display (`src/pages/TrainSchedule.tsx`)

- When `entry.boardingHour` is not `null`, render a small line similar in style to the existing Notes ("Mission Notes") row — e.g. `Boards: 14:00 (Server Time)` — using a new `schedule.boardingTimeDisplay` i18n key with `{{time}}` interpolation, where `time` is the zero-padded `HH:00` string.
- Not shown at all when `boardingHour` is `null` (no empty placeholder row), consistent with how `entry.notes` is conditionally rendered today.
- Visible to all users, admin or not (matches the rest of the entry display).

## 5. i18n

Add to all four locale files (`en`, `es`, `pt-BR`, `ko`) under the `schedule` namespace:
- `boardingTimeLabel` — "Boarding Time"
- `boardingTimeUnsetOption` — "No time set"
- `boardingTimeDisplay` — "Boards: {{time}} (Server Time)"

English strings authored first; other three locales translated to match existing tone/terminology in those files.

## 6. Testing

No automated test framework in this project (consistent with prior Train Schedule specs) — manual verification in the running dev app:
- As admin, set a boarding hour on a day, save, confirm it displays as `Boards: HH:00 (Server Time)` on that day's card.
- Refresh the page and confirm the boarding time persists (shared, not per-device).
- Clear the boarding time (select "No time set") and confirm the display line disappears and the value saves as `null`.
- Confirm a day with no boarding time set shows no boarding-time line at all.
- View as a non-admin and confirm the boarding time displays but there is no way to edit it.
- Confirm existing Conductor/VIP/Notes editing and the week-mode toggle are unaffected.
