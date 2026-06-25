# Train Schedule Week Mode Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-controlled, server-persisted "Push Week / Save Week" toggle to the Train Schedule page that switches the displayed Captain/First Mate day-source label text, and fix two pre-existing label mismatches in that text.

**Architecture:** A new singleton-row Supabase table (`train_schedule_settings`) stores the current mode, mirroring the existing `alliance_tech_status` pattern. A new `useScheduleSettings` hook fetches/updates that row. `TrainSchedule.tsx` derives its per-day label text from a `buildDowSources(mode)` function instead of a static constant, and gets a small segmented pill control in its header wired to the hook.

**Tech Stack:** React + TypeScript + Vite, Supabase (Postgres + supabase-js), Tailwind utility classes. No test framework in this repo — verification is `tsc`/`vite build` (via `npm run build`) plus manual checks in the running dev app, matching this codebase's existing convention (see `docs/superpowers/specs/2026-06-10-tech-queue-drag-reorder-design.md` §6).

## Global Constraints

- New table is named `train_schedule_settings`, single row, primary key `key` checked to equal `'week_mode'`. Default mode is `'push'`.
- RLS: any authenticated user can read and update — do not add admin-only RLS. This matches every other table in this app (`scripts/rls-policies.sql`, `scripts/alliance-tech-migration.sql`); admin gating is done client-side via `useAuth().isAdmin` only.
- The mode toggle affects **only** the descriptive label text under Captain/First Mate. It must never affect `train_schedule` row data or the per-day member assignment edit modal.
- Follow the existing hook shape used by `src/hooks/useTrainSchedule.ts` and `src/hooks/useAllianceTech.ts`: a `fetchData` `useCallback`, `loading`/`error` state, mutators that `await fetchData()` on success and `throw` on failure for the caller to catch.
- Migration SQL files in this repo are applied manually via the Supabase SQL Editor (see header comments in `scripts/alliance-tech-migration.sql`, `scripts/timezone-migration.sql`) — there is no automated migration runner and no service-role key available locally (`.env` only has the anon key). Do not attempt to execute schema changes programmatically.
- Spec reference: `docs/superpowers/specs/2026-06-24-train-schedule-week-mode-toggle-design.md`.

---

### Task 1: Database migration for `train_schedule_settings`

**Files:**
- Create: `scripts/train-schedule-settings-migration.sql`

**Interfaces:**
- Produces: a Postgres table `train_schedule_settings(key text PK, mode text, updated_at timestamptz)` with exactly one seeded row `('week_mode', 'push')`, readable/updatable by any authenticated Supabase user. Task 2's hook queries this table by `key = 'week_mode'`.

- [ ] **Step 1: Write the migration file**

```sql
-- Train Schedule Settings table
-- Run this in Supabase SQL Editor (Project > SQL Editor)

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

- [ ] **Step 2: Commit the migration file**

```bash
git add scripts/train-schedule-settings-migration.sql
git commit -m "feat: add train_schedule_settings table for week mode toggle"
```

- [ ] **Step 3: Run the migration against the live Supabase project**

This is a schema change to shared infrastructure — ask the user (project owner) to run it themselves, the same way every other `scripts/*-migration.sql` in this repo is applied:

1. Open the Supabase project dashboard → SQL Editor.
2. Paste the contents of `scripts/train-schedule-settings-migration.sql`.
3. Run it.

- [ ] **Step 4: Verify the migration**

Ask the user to run this query in the same SQL Editor and confirm it returns exactly one row with `mode = 'push'`:

```sql
SELECT * FROM train_schedule_settings;
```

Expected: one row, `key = 'week_mode'`, `mode = 'push'`.

Do not proceed to Task 4's manual verification until this is confirmed — Tasks 2 and 3 can proceed in parallel since they don't require the table to exist yet (the hook's catch path leaves `weekMode` at its default `'push'` state on fetch failure).

---

### Task 2: `WeekMode` type and `useScheduleSettings` hook

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/hooks/useScheduleSettings.ts`

**Interfaces:**
- Consumes: `supabase` client from `src/lib/supabase.ts` (`import { supabase } from '../lib/supabase'`); table `train_schedule_settings` from Task 1.
- Produces: `export type WeekMode = 'push' | 'save'` from `src/lib/types.ts`. `export function useScheduleSettings()` from `src/hooks/useScheduleSettings.ts` returning `{ weekMode: WeekMode, loading: boolean, error: string | null, setWeekMode: (mode: WeekMode) => Promise<void> }`. Task 3 consumes `weekMode`; Task 4 consumes `setWeekMode`.

- [ ] **Step 1: Add the `WeekMode` type**

In `src/lib/types.ts`, add this directly above the existing `TrainEntry` interface (currently at line 46):

```ts
export type WeekMode = 'push' | 'save';

```

- [ ] **Step 2: Write the hook**

Create `src/hooks/useScheduleSettings.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { WeekMode } from '../lib/types'

export function useScheduleSettings() {
  const [weekMode, setWeekModeState] = useState<WeekMode>('push')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('train_schedule_settings')
        .select('mode')
        .eq('key', 'week_mode')
        .single()
      if (fetchError) throw fetchError
      setWeekModeState((data?.mode as WeekMode) ?? 'push')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function setWeekMode(mode: WeekMode): Promise<void> {
    const { error: updateError } = await supabase
      .from('train_schedule_settings')
      .update({ mode })
      .eq('key', 'week_mode')
    if (updateError) throw updateError
    await fetchData()
  }

  return { weekMode, loading, error, setWeekMode }
}
```

- [ ] **Step 3: Type-check**

Run: `npm run build`
Expected: completes with no TypeScript errors (this also runs `vite build`; a failure here means a type or import mistake in the new hook or type addition).

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/hooks/useScheduleSettings.ts
git commit -m "feat: add useScheduleSettings hook for week mode persistence"
```

---

### Task 3: Mode-aware day-source labels (and label fix)

**Files:**
- Modify: `src/pages/TrainSchedule.tsx:1-30` (imports and `DOW_SOURCES` constant), `src/pages/TrainSchedule.tsx:50-65` (component body), `src/pages/TrainSchedule.tsx:140-144` (render loop lookup)

**Interfaces:**
- Consumes: `useScheduleSettings` and `WeekMode` from Task 2 (`import { useScheduleSettings } from '../hooks/useScheduleSettings'`, `import type { WeekMode } from '../lib/types'`).
- Produces: `weekMode` is now read from the hook inside `TrainSchedule`. Task 4 will destructure `setWeekMode` from the same `useScheduleSettings()` call already added here.

- [ ] **Step 1: Replace the static `DOW_SOURCES` constant with a mode-aware function**

In `src/pages/TrainSchedule.tsx`, replace lines 22-30:

```ts
const DOW_SOURCES: Record<string, { captain: string; firstMate: string }> = {
  Sun: { captain: 'Weekly top VS scorer', firstMate: 'Top VS scorer (Sat)' },
  Mon: { captain: 'Alliance MVP', firstMate: 'DS top scorer' },
  Tue: { captain: 'Highest donator', firstMate: 'Top VS scorer (Mon)' },
  Wed: { captain: 'R4 rotation', firstMate: 'Top VS scorer (Tue)' },
  Thu: { captain: 'R4 rotation', firstMate: 'Top VS scorer (Wed)' },
  Fri: { captain: 'R4 rotation', firstMate: 'Top VS scorer (Thu)' },
  Sat: { captain: 'R4 rotation', firstMate: 'Top VS scorer (Fri)' },
}
```

with:

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

- [ ] **Step 2: Add the new imports**

At the top of `src/pages/TrainSchedule.tsx`, change:

```ts
import { useState } from 'react'
import { useTrainSchedule } from '../hooks/useTrainSchedule'
import { useAuth } from '../hooks/useAuth'
import type { TrainEntry } from '../lib/types'
```

to:

```ts
import { useState } from 'react'
import { useTrainSchedule } from '../hooks/useTrainSchedule'
import { useScheduleSettings } from '../hooks/useScheduleSettings'
import { useAuth } from '../hooks/useAuth'
import type { TrainEntry, WeekMode } from '../lib/types'
```

- [ ] **Step 3: Wire the hook into the component and compute sources from it**

In the `TrainSchedule` component body, change:

```ts
  const { isAdmin } = useAuth()
  const { members, entries, weekDates, loading, error, saveEntry, deleteEntry } = useTrainSchedule()
  const [editState, setEditState] = useState<EditState | null>(null)
```

to:

```ts
  const { isAdmin } = useAuth()
  const { members, entries, weekDates, loading, error, saveEntry, deleteEntry } = useTrainSchedule()
  const { weekMode } = useScheduleSettings()
  const [editState, setEditState] = useState<EditState | null>(null)
```

Then, directly after the `entryByDate` map is built (after the existing `for (const e of entries) { entryByDate.set(e.date, e) }` block), add:

```ts
  const dowSources = buildDowSources(weekMode)
```

- [ ] **Step 4: Use the computed sources in the render loop**

In the `weekDates.map(date => { ... })` block, change:

```ts
          const sources = DOW_SOURCES[getDow(date)]
```

to:

```ts
          const sources = dowSources[getDow(date)]
```

- [ ] **Step 5: Type-check**

Run: `npm run build`
Expected: completes with no TypeScript errors.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`, open the app, navigate to the Voyage Schedule (Train Schedule) page while logged in.

Confirm:
- Monday's row shows Captain source text "DS top scorer" and First Mate source text "Canyon top scorer" (previously these were swapped).
- Tuesday's row shows Captain source text "Alliance MVP" (previously showed "Highest donator").
- Tuesday through Sunday's First Mate source text reads "Top VS scorer (...)" and Sunday's Captain source text reads "Weekly top VS scorer" — i.e. default mode still looks like Push Week, since the table seeded in Task 1 defaults to `'push'` (if Task 1 hasn't been applied yet, the hook's fetch fails silently and `weekMode` stays at its initial `'push'` state, so this still passes).

- [ ] **Step 7: Commit**

```bash
git add src/pages/TrainSchedule.tsx
git commit -m "fix: correct day-source labels and add week-mode support"
```

---

### Task 4: Push/Save Week toggle UI

**Files:**
- Modify: `src/pages/TrainSchedule.tsx:50-56` (component state), `src/pages/TrainSchedule.tsx:126-138` (header JSX)

**Interfaces:**
- Consumes: `setWeekMode` from the `useScheduleSettings()` call already present from Task 3; `WeekMode` type from Task 2.
- Produces: none consumed by later tasks — this is the final task.

**Prerequisite:** Task 1's migration must be applied and verified before testing this task's manual steps, since clicking the toggle calls `setWeekMode`, which writes to `train_schedule_settings` and will fail with a "relation does not exist" error if the table hasn't been created yet.

- [ ] **Step 1: Add local state for the toggle's save-in-flight/error handling**

In the `TrainSchedule` component, change:

```ts
  const { weekMode } = useScheduleSettings()
  const [editState, setEditState] = useState<EditState | null>(null)
  const [showR4Info, setShowR4Info] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
```

to:

```ts
  const { weekMode, setWeekMode } = useScheduleSettings()
  const [editState, setEditState] = useState<EditState | null>(null)
  const [showR4Info, setShowR4Info] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [modeSaving, setModeSaving] = useState(false)
  const [modeError, setModeError] = useState<string | null>(null)
```

- [ ] **Step 2: Add the change handler**

Directly after the existing `getMemberName` function (after its closing `}`), add:

```ts
  async function handleWeekModeChange(mode: WeekMode) {
    if (mode === weekMode || modeSaving) return
    setModeSaving(true)
    setModeError(null)
    try {
      await setWeekMode(mode)
    } catch (err) {
      setModeError(err instanceof Error ? err.message : 'Failed to update week mode')
    } finally {
      setModeSaving(false)
    }
  }
```

- [ ] **Step 3: Add the toggle pill to the header**

Replace the header block:

```tsx
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-xl font-bold text-game-gold">Voyage Schedule</h1>
        <button
          onClick={() => setShowR4Info(true)}
          className="text-game-standard hover:text-white transition-colors text-sm flex items-center gap-1"
          title="View R4 rotation list"
        >
          <span>R4 Rotation</span>
          <span>ⓘ</span>
        </button>
      </div>
      <p className="text-gray-400 text-xs mb-4">Daily voyage departs ~1:00 EST · Sun–Sun view</p>
```

with:

```tsx
      <div className="flex items-start justify-between mb-1 gap-2">
        <h1 className="text-xl font-bold text-game-gold">Voyage Schedule</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-full border border-game-accent overflow-hidden text-xs">
            {(['push', 'save'] as const).map(mode => {
              const active = mode === weekMode
              const label = mode === 'push' ? 'Push Week' : 'Save Week'
              const baseClass = `px-2 py-1 font-semibold transition-colors ${
                active ? 'bg-game-gold text-game-dark' : 'text-gray-400'
              }`
              if (!isAdmin) {
                return <span key={mode} className={baseClass}>{label}</span>
              }
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleWeekModeChange(mode)}
                  disabled={active || modeSaving}
                  className={`${baseClass} ${!active ? 'hover:text-white' : ''} disabled:cursor-default`}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setShowR4Info(true)}
            className="text-game-standard hover:text-white transition-colors text-sm flex items-center gap-1"
            title="View R4 rotation list"
          >
            <span>R4 Rotation</span>
            <span>ⓘ</span>
          </button>
        </div>
      </div>
      {modeError && <p className="text-game-highlight text-xs mb-1">{modeError}</p>}
      <p className="text-gray-400 text-xs mb-4">Daily voyage departs ~1:00 EST · Sun–Sun view</p>
```

- [ ] **Step 4: Type-check**

Run: `npm run build`
Expected: completes with no TypeScript errors.

- [ ] **Step 5: Manual verification**

Prerequisite: Task 1's migration has been applied and verified (see Task 1 Step 4).

Run: `npm run dev`, open the app, log in as an admin user, navigate to the Voyage Schedule page.

Confirm:
- The pill shows "Push Week" highlighted (gold background) and "Save Week" muted, by default.
- Clicking "Save Week" highlights it instead, and the page's day-source text updates immediately: Tuesday–Sunday First Mate text and Sunday Captain text now read "donator" instead of "VS scorer" (e.g. "Top donator (Mon)", "Weekly top donator"). Monday/Tuesday text is unchanged by the mode switch.
- Refresh the page (full reload) — "Save Week" is still the highlighted mode (confirms server-side persistence, not just local state).
- Click "Push Week" to switch back, refresh, and confirm it persists as "Push Week".
- Confirm the active segment is not clickable (disabled) and the inactive one is.
- Confirm a non-admin view is read-only: temporarily edit `src/hooks/useAuth.ts`'s returned `isAdmin` to `false` (or log in as a non-admin account if one exists), reload the page, and confirm the pill still shows the current mode but renders as plain text with no hover/click behavior. Revert any temporary edit to `useAuth.ts` afterward — confirm with `git diff src/hooks/useAuth.ts` that it shows no changes before committing.

- [ ] **Step 6: Commit**

```bash
git add src/pages/TrainSchedule.tsx
git commit -m "feat: add admin push/save week toggle to train schedule header"
```
