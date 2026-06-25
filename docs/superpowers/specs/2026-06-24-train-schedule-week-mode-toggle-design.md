# Train Schedule — Push/Save Week Label Toggle Design Spec

**Date:** 2026-06-24
**Status:** Approved

## Overview

The alliance runs two different weekly ruleset variants — "Push Week" and "Save Week" — which change what each day's Captain (Conductor) and First Mate (VIP) slot is awarded for. Today `src/pages/TrainSchedule.tsx` hardcodes the Push Week wording in a static `DOW_SOURCES` lookup. Add an admin-controlled toggle, visible to everyone, that switches the displayed wording between the two rulesets. The toggle's setting is stored server-side so it's shared by all users, not a per-device preference.

This only affects descriptive label text. It does not affect which member is assigned to a given day — that remains a manual per-day admin entry, unrelated to week mode.

---

## 1. Scope

- **In scope:**
  - New persisted `week_mode` setting (`'push' | 'save'`), readable by everyone, writable by admins (enforced client-side, consistent with how admin actions are gated everywhere else in this app).
  - A segmented "Push Week / Save Week" switch in the `TrainSchedule` page header, next to the existing R4 Rotation link. Admins can click either side to change the mode; non-admins see the same control as a non-interactive status display.
  - Rewriting the per-day Captain/First Mate description text to be a function of `week_mode`, and correcting two pre-existing mismatches against the actual ruleset (see below) while doing so.
- **Out of scope / unchanged:**
  - The `train_schedule` table, its data, and the per-day Captain/First Mate member assignment UI (edit modal).
  - The R4 Rotation list/modal.
  - Per-user preferences — there is exactly one shared mode for the whole alliance.

## 2. Source of Truth (from reference screenshots)

| Day | Push Week — Conductor | Save Week — Conductor | Push Week — VIP | Save Week — VIP |
|-----|------------------------|------------------------|------------------|------------------|
| Mon | DS Top Scorer | DS Top Scorer | Canyon Top Scorer | Canyon Top Scorer |
| Tue | Alliance MVP | Alliance MVP | prev day's Top VS Scorer | prev day's Top Donator |
| Wed–Sat | R4 Rotation | R4 Rotation | prev day's Top VS Scorer | prev day's Top Donator |
| Sun | Top Weekly VS Scorer | Top Weekly Donator | prev day's Top VS Scorer | prev day's Top Donator |

Only the "VS Scorer" ↔ "Donator" wording changes between modes (Conductor/Sun, and VIP/Tue–Sun). Everything else is identical between the two modes.

**Pre-existing mismatch being fixed:** the current `DOW_SOURCES` constant has Monday's Captain/First Mate text swapped (`Alliance MVP` / `DS top scorer`) and Tuesday's Captain text wrong (`Highest donator`). This spec's rewrite (section 4) corrects both while adding mode support, since the whole table is being rewritten anyway.

## 3. Data Layer

### New table: `train_schedule_settings`

```sql
CREATE TABLE train_schedule_settings (
  key        text        PRIMARY KEY CHECK (key = 'week_mode'),
  mode       text        NOT NULL DEFAULT 'push' CHECK (mode IN ('push', 'save')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO train_schedule_settings (key, mode) VALUES ('week_mode', 'push');

ALTER TABLE train_schedule_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read train_schedule_settings"
  ON train_schedule_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update train_schedule_settings"
  ON train_schedule_settings FOR UPDATE
  TO authenticated
  USING (true);
```

This mirrors the existing `alliance_tech_status` singleton-row-by-`key` pattern already used in this codebase. No INSERT/DELETE policy is needed since the row is seeded once by migration and only ever updated. Default `'push'` preserves current behavior for existing users until an admin flips it. RLS allows any authenticated user to write, matching every other table in this app (admin gating is a client-side UI concern here, not a database concern).

This SQL goes in a new `scripts/train-schedule-settings-migration.sql`, run manually in the Supabase SQL editor (matching how `alliance-tech-migration.sql` etc. are applied).

### New type (`src/lib/types.ts`)

```ts
export type WeekMode = 'push' | 'save';
```

### New hook: `src/hooks/useScheduleSettings.ts`

Same fetch/save shape as `useAllianceTech.ts`:

```ts
export function useScheduleSettings() {
  // GET the single row (key = 'week_mode') on mount
  // returns { weekMode: WeekMode, loading, error, setWeekMode(mode: WeekMode): Promise<void> }
}
```

- `weekMode` defaults to `'push'` while `loading` is true, so there's no flash of wrong/blank labels before the fetch resolves.
- `setWeekMode` issues an `update` (row always exists after migration) and refetches, throwing on error so the caller can surface a failure message — same pattern as `saveEntry`/`deleteEntry` in `useTrainSchedule.ts`.

## 4. Day-Source Text (`src/pages/TrainSchedule.tsx`)

Replace the static `DOW_SOURCES` constant with a function parameterized by mode:

```ts
function buildDowSources(mode: WeekMode): Record<string, { captain: string; firstMate: string }> {
  const metric = mode === 'push' ? 'VS scorer' : 'donator'
  return {
    Sun: { captain: `Weekly top ${metric}`, firstMate: `Top ${metric} (Sat)` },
    Mon: { captain: 'DS top scorer', firstMate: 'Canyon top scorer' },
    Tue: { captain: 'Alliance MVP', firstMate: `Top ${metric} (Mon)` },
    Wed: { captain: 'R4 rotation', firstMate: `Top ${metric} (Tue)` },
    Thu: { captain: 'R4 rotation', firstMate: `Top ${metric} (Wed)` },
    Fri: { captain: 'R4 rotation', firstMate: `Top ${metric} (Thu)` },
    Sat: { captain: 'R4 rotation', firstMate: `Top ${metric} (Fri)` },
  }
}
```

The component calls `buildDowSources(weekMode)` once per render (cheap, no need to memoize) and looks up `sources[getDow(date)]` exactly as it does today.

## 5. UI (`src/pages/TrainSchedule.tsx`)

- Add `const { weekMode, setWeekMode, error: settingsError } = useScheduleSettings()` alongside the existing `useTrainSchedule()` call.
- In the header row (currently title + R4 Rotation link), add a segmented pill between them:
  - Two segments, "Push Week" and "Save Week".
  - Active segment styled like the existing "TODAY" badge (`bg-game-gold text-game-dark font-bold`); inactive segment styled muted (`text-gray-400`).
  - When `isAdmin`: each segment is a `<button>`; clicking the inactive segment calls `setWeekMode` with that mode (optimistic — hook refetches after the update resolves). A brief inline error (reusing the existing small error-text style) appears if the update fails.
  - When not `isAdmin`: render the identical pill markup but as plain `<span>`s (no click handler, no hover styles) — so the current mode is always visible to everyone, but only admins can change it.
- No other layout changes to the page.

## 6. Testing

No automated test framework exists in this project (`tsc` + manual verification is the established pattern, per `useAllianceTech`/`AllianceTech.tsx`'s drag-reorder spec). Manual verification in the running dev app:

- Confirm default mode is "Push Week" and matches today's wording for an unmigrated/fresh row.
- As an admin, toggle to "Save Week" and confirm the VIP Tue–Sun and Conductor/Sun text switches to "donator" wording; toggle back and confirm it reverts.
- Refresh the page after toggling and confirm the mode persists (shared, not per-device).
- Open the page as a non-admin and confirm the pill shows the current mode but is not clickable.
- Confirm Monday now reads Captain: "DS top scorer", First Mate: "Canyon top scorer", and Tuesday Captain reads "Alliance MVP", in both modes.
- Confirm the per-day member assignment edit modal is unaffected by mode.
