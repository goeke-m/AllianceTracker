# Error Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist handled user-action errors (the same failures that already surface as red error banners) to a new `error_logs` table, and add a read-only "Errors" viewer tab in Captain's Quarters, visible only to the site owner.

**Architecture:** A new `error_logs` table (admin-readable, any-authenticated-user-writable RLS) stores each error. A self-contained `logError(context, err)` helper resolves the current user via `supabase.auth.getUser()` and fire-and-forget inserts a row — it is called as one extra line next to each existing `setError(...)`/`setSaveError(...)` call across the app's hooks and components. A new `ErrorLogManager` component lists the log, added as a new `AdminTab` gated to a single hardcoded owner UUID (extracted from `MemberManager.tsx`'s existing `SYNC_ADMIN_USER_ID` pattern into a shared constant).

**Tech Stack:** React + TypeScript + Vite, Supabase (Postgres + supabase-js), Tailwind utility classes. No test framework in this repo — verification is `npm run build` (tsc + vite build) plus manual checks in the running dev app.

## Global Constraints

- New table is `error_logs`: `id uuid PK`, `context text NOT NULL`, `message text NOT NULL`, `user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL`, `user_email text`, `created_at timestamptz NOT NULL DEFAULT now()`.
- RLS: any authenticated user can INSERT (`WITH CHECK (true)`); only admins can SELECT (`(auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true`), matching `scripts/demerits-migration.sql`. No UPDATE/DELETE policy — the log is append-only and view-only.
- `logError(context, err)` must never throw or reject in a way that reaches the caller — swallow all failures (console.error only). Callers never `await` it.
- The "Errors" tab is visible only when `user?.id === OWNER_USER_ID`, where `OWNER_USER_ID` is the same UUID currently hardcoded as `SYNC_ADMIN_USER_ID` in `src/components/MemberManager.tsx:5` (`'edac282d-fd53-4353-8af8-c6b7c3f7480d'`), moved to a shared constant.
- `src/pages/TrainSchedule.tsx` has uncommitted local changes already in progress (per `git status`) — edits to it in this plan add only the one-line `logError(...)` calls next to its three existing catch blocks; do not touch any other line in that file.
- Migration SQL files in this repo are applied manually via the Supabase SQL Editor — there is no automated migration runner and no service-role key available locally. Do not attempt to execute schema changes programmatically.
- Spec reference: `docs/superpowers/specs/2026-07-06-error-logging-design.md`.

---

### Task 1: Database migration and `ErrorLogEntry` type

**Files:**
- Create: `scripts/error-logs-migration.sql`
- Modify: `src/lib/types.ts`

**Interfaces:**
- Produces: a Postgres table `error_logs(id, context, message, user_id, user_email, created_at)` with the RLS policies above. `export interface ErrorLogEntry` in `src/lib/types.ts`, consumed by Task 6's `ErrorLogManager`.

- [ ] **Step 1: Write the migration file**

Create `scripts/error-logs-migration.sql`:

```sql
-- Error Logs table — captures handled user-action failures
-- Run this in Supabase SQL Editor (Project > SQL Editor)

CREATE TABLE IF NOT EXISTS error_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  context    text NOT NULL,
  message    text NOT NULL,
  user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert error_logs"
  ON error_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read error_logs"
  ON error_logs FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);
```

- [ ] **Step 2: Add the `ErrorLogEntry` type**

In `src/lib/types.ts`, add this at the end of the file (after the existing `JsonImportEntry` interface):

```ts

export interface ErrorLogEntry {
  id: string;
  context: string;
  message: string;
  user_id: string | null;
  user_email: string | null;
  created_at: string;
}
```

- [ ] **Step 3: Type-check**

Run: `npm run build`
Expected: completes with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add scripts/error-logs-migration.sql src/lib/types.ts
git commit -m "feat: add error_logs table migration and ErrorLogEntry type"
```

- [ ] **Step 5: Run the migration against the live Supabase project**

This is a schema change to shared infrastructure — ask the user (project owner) to run it themselves, the same way every other `scripts/*-migration.sql` in this repo is applied:

1. Open the Supabase project dashboard → SQL Editor.
2. Paste the contents of `scripts/error-logs-migration.sql`.
3. Run it.

- [ ] **Step 6: Verify the migration**

Ask the user to run this query in the same SQL Editor and confirm it returns zero rows with no error (confirms the table and policies exist):

```sql
SELECT * FROM error_logs;
```

Expected: empty result set, no error. Do not block later tasks on this — Tasks 2–5 don't require the table to exist yet (writes will just silently fail inside `logError`'s own swallowed error path), but Task 6's manual verification and Step 6 of Task 4/5 need it applied.

---

### Task 2: Shared `OWNER_USER_ID` constant

**Files:**
- Create: `src/lib/constants.ts`
- Modify: `src/components/MemberManager.tsx:1-11`

**Interfaces:**
- Produces: `export const OWNER_USER_ID: string` from `src/lib/constants.ts`. Consumed by `MemberManager.tsx` (this task) and by `AdminPanel.tsx` in Task 6.

- [ ] **Step 1: Write the constant file**

Create `src/lib/constants.ts`:

```ts
export const OWNER_USER_ID = 'edac282d-fd53-4353-8af8-c6b7c3f7480d'
```

- [ ] **Step 2: Update `MemberManager.tsx` to use the shared constant**

In `src/components/MemberManager.tsx`, change:

```ts
import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Member, RankValue, SquadType } from '../lib/types'

const SYNC_ADMIN_USER_ID = 'edac282d-fd53-4353-8af8-c6b7c3f7480d'
```

to:

```ts
import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { OWNER_USER_ID } from '../lib/constants'
import type { Member, RankValue, SquadType } from '../lib/types'
```

Then, further down in the same file, change the one usage:

```ts
        {syncUserId === SYNC_ADMIN_USER_ID && (
```

to:

```ts
        {syncUserId === OWNER_USER_ID && (
```

- [ ] **Step 3: Type-check**

Run: `npm run build`
Expected: completes with no TypeScript errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, log in as the owner account, open Captain's Quarters → Members tab. Confirm the "Sync Now" button is still visible (unchanged behavior — this step is a pure rename/extraction, not a logic change).

- [ ] **Step 5: Commit**

```bash
git add src/lib/constants.ts src/components/MemberManager.tsx
git commit -m "refactor: extract OWNER_USER_ID into shared constant"
```

---

### Task 3: `logError` helper

**Files:**
- Create: `src/lib/errorLog.ts`

**Interfaces:**
- Consumes: `supabase` client from `src/lib/supabase.ts`.
- Produces: `export function logError(context: string, err: unknown): void` — fire-and-forget, never throws. Consumed by Tasks 4 and 5.

- [ ] **Step 1: Write the helper**

Create `src/lib/errorLog.ts`:

```ts
import { supabase } from './supabase'

export function logError(context: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err)
  supabase.auth.getUser()
    .then(({ data }) =>
      supabase.from('error_logs').insert({
        context,
        message,
        user_id: data.user?.id ?? null,
        user_email: data.user?.email ?? null,
      })
    )
    .then(({ error }) => {
      if (error) console.error('Failed to log error:', error)
    })
    .catch(() => {
      // Logging must never break the calling code path.
    })
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: completes with no TypeScript errors.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`, open the app in a browser, log in, open the browser dev console, and run:

```js
import('/src/lib/errorLog.ts').then(m => m.logError('manual-smoke-test', new Error('test error')))
```

(Vite serves TS modules directly in dev, so this dynamic import works from the console.) Confirm no exception is thrown in the console. If Task 1's migration has been applied, ask the user to confirm a row with `context = 'manual-smoke-test'` appears in `error_logs` via the Supabase dashboard; if not yet applied, confirm instead that the console logged `Failed to log error: ...` rather than throwing.

- [ ] **Step 4: Commit**

```bash
git add src/lib/errorLog.ts
git commit -m "feat: add logError helper for persisting handled errors"
```

---

### Task 4: Wire `logError` into data hooks

**Files:**
- Modify: `src/hooks/useMarshallData.ts:1-4,30-31`
- Modify: `src/hooks/useTrainSchedule.ts:1-3,54-55`
- Modify: `src/hooks/useAllianceTech.ts:1-3,22-23`
- Modify: `src/hooks/useOoto.ts:1-3,24-25`
- Modify: `src/hooks/useScheduleSettings.ts:1-3,21-22`

**Interfaces:**
- Consumes: `logError` from Task 3 (`import { logError } from '../lib/errorLog'`).
- Produces: none consumed by later tasks — this task is independent of Task 5 and Task 6.

- [ ] **Step 1: `useMarshallData.ts`**

Change the import block:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { assignRingPositions } from '../lib/wad'
import type { Member, DamageLog, MemberWithWAD } from '../lib/types'
```

to:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { assignRingPositions } from '../lib/wad'
import { logError } from '../lib/errorLog'
import type { Member, DamageLog, MemberWithWAD } from '../lib/types'
```

Change:

```ts
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
```

to:

```ts
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      logError('useMarshallData.fetchData', err)
    } finally {
```

- [ ] **Step 2: `useTrainSchedule.ts`**

Change the import block:

```ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Member, TrainEntry } from '../lib/types'
```

to:

```ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { logError } from '../lib/errorLog'
import type { Member, TrainEntry } from '../lib/types'
```

Change:

```ts
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule')
    } finally {
```

to:

```ts
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule')
      logError('useTrainSchedule.fetchData', err)
    } finally {
```

- [ ] **Step 3: `useAllianceTech.ts`**

Change the import block:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { AllianceTechQueueItem } from '../lib/types'
```

to:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { logError } from '../lib/errorLog'
import type { AllianceTechQueueItem } from '../lib/types'
```

Change:

```ts
    } catch (err) {
      setError((err as { message?: string }).message ?? 'Failed to load tech queue')
    } finally {
```

to:

```ts
    } catch (err) {
      setError((err as { message?: string }).message ?? 'Failed to load tech queue')
      logError('useAllianceTech.fetchData', err)
    } finally {
```

- [ ] **Step 4: `useOoto.ts`**

Change the import block:

```ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Member, OotoEntry } from '../lib/types'
```

to:

```ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { logError } from '../lib/errorLog'
import type { Member, OotoEntry } from '../lib/types'
```

Change:

```ts
    } catch (err) {
      setError((err as { message?: string }).message ?? 'Failed to load OOTO data')
    } finally {
```

to:

```ts
    } catch (err) {
      setError((err as { message?: string }).message ?? 'Failed to load OOTO data')
      logError('useOoto.fetchData', err)
    } finally {
```

- [ ] **Step 5: `useScheduleSettings.ts`**

Change the import block:

```ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { WeekMode } from '../lib/types'
```

to:

```ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { logError } from '../lib/errorLog'
import type { WeekMode } from '../lib/types'
```

Change:

```ts
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule settings')
    } finally {
```

to:

```ts
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule settings')
      logError('useScheduleSettings.fetchData', err)
    } finally {
```

- [ ] **Step 6: Type-check**

Run: `npm run build`
Expected: completes with no TypeScript errors.

- [ ] **Step 7: Manual verification**

Prerequisite: Task 1's migration applied. Run: `npm run dev`, open the app, log in. Temporarily break one hook to force a failure — e.g. in `src/hooks/useOoto.ts`, change `.from('ooto')` to `.from('ooto_nonexistent')` in the `fetchData` function, save, reload the app, and confirm:
- The existing red error banner still appears on the Out page (unchanged behavior).
- A new row appears in `error_logs` (check via Supabase dashboard) with `context = 'useOoto.fetchData'`.

Revert the temporary change afterward — confirm with `git diff src/hooks/useOoto.ts` that it shows only the intended import/logError changes from Steps 4 and 6, no leftover typo.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useMarshallData.ts src/hooks/useTrainSchedule.ts src/hooks/useAllianceTech.ts src/hooks/useOoto.ts src/hooks/useScheduleSettings.ts
git commit -m "feat: log handled data-fetch errors to error_logs"
```

---

### Task 5: Wire `logError` into component/page action handlers

**Files:**
- Modify: `src/components/MemberManager.tsx:1-4,184-185,202-203,219-220`
- Modify: `src/components/EventLogImport.tsx:1-3,77-78`
- Modify: `src/pages/AllianceTech.tsx:1-14,86-87,98-99,110-111,161-163`
- Modify: `src/pages/Out.tsx:1-5,73-74,86-87`
- Modify: `src/pages/TrainSchedule.tsx` (imports, and the three catch blocks at 94-95, 107-108, 124-125)

**Interfaces:**
- Consumes: `logError` from Task 3 (`import { logError } from '../lib/errorLog'`).
- Produces: none consumed by later tasks.

- [ ] **Step 1: `MemberManager.tsx`**

Change the import block (already modified by Task 2 — this continues from that state):

```ts
import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { OWNER_USER_ID } from '../lib/constants'
import type { Member, RankValue, SquadType } from '../lib/types'
```

to:

```ts
import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { OWNER_USER_ID } from '../lib/constants'
import { logError } from '../lib/errorLog'
import type { Member, RankValue, SquadType } from '../lib/types'
```

Change:

```ts
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }
```

to:

```ts
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
      logError('MemberManager.handleSync', err)
    } finally {
      setSyncing(false)
    }
  }
```

Change:

```ts
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member')
    }
    setAdding(false)
  }
```

to:

```ts
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member')
      logError('MemberManager.handleAdd', err)
    }
    setAdding(false)
  }
```

Change:

```ts
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete member')
    }
    setDeletingId(null)
  }
```

to:

```ts
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete member')
      logError('MemberManager.handleDelete', err)
    }
    setDeletingId(null)
  }
```

- [ ] **Step 2: `EventLogImport.tsx`**

Change the import block:

```ts
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Member, JsonImportEntry } from '../lib/types'
```

to:

```ts
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { logError } from '../lib/errorLog'
import type { Member, JsonImportEntry } from '../lib/types'
```

Change:

```ts
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Import failed')
        setLoading(false)
        return
      }
```

to:

```ts
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Import failed')
        logError('EventLogImport.handleImport', err)
        setLoading(false)
        return
      }
```

- [ ] **Step 3: `AllianceTech.tsx`**

Change the import block:

```ts
import { useAllianceTech } from '../hooks/useAllianceTech'
import { useAuth } from '../hooks/useAuth'
import { SortableTechRow } from '../components/SortableTechRow'
import type { AllianceTechQueueItem } from '../lib/types'
```

to:

```ts
import { useAllianceTech } from '../hooks/useAllianceTech'
import { useAuth } from '../hooks/useAuth'
import { SortableTechRow } from '../components/SortableTechRow'
import { logError } from '../lib/errorLog'
import type { AllianceTechQueueItem } from '../lib/types'
```

Change:

```ts
    } catch (err) {
      setSaveError((err as { message?: string }).message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleComplete() {
```

to:

```ts
    } catch (err) {
      setSaveError((err as { message?: string }).message ?? 'Save failed')
      logError('AllianceTech.handleSelect', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleComplete() {
```

Change:

```ts
    } catch (err) {
      setSaveError((err as { message?: string }).message ?? 'Failed to complete')
    } finally {
      setCompleting(false)
    }
  }

  async function handleDemote() {
```

to:

```ts
    } catch (err) {
      setSaveError((err as { message?: string }).message ?? 'Failed to complete')
      logError('AllianceTech.handleComplete', err)
    } finally {
      setCompleting(false)
    }
  }

  async function handleDemote() {
```

Change:

```ts
    } catch (err) {
      setSaveError((err as { message?: string }).message ?? 'Reorder failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
```

to:

```ts
    } catch (err) {
      setSaveError((err as { message?: string }).message ?? 'Reorder failed')
      logError('AllianceTech.handleDemote', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
```

Change:

```ts
    try {
      await reorderUpcoming(reordered.map(item => item.id))
    } catch (err) {
      setLocalUpcoming(null)
      setSaveError((err as { message?: string }).message ?? 'Reorder failed')
    }
  }
```

to:

```ts
    try {
      await reorderUpcoming(reordered.map(item => item.id))
    } catch (err) {
      setLocalUpcoming(null)
      setSaveError((err as { message?: string }).message ?? 'Reorder failed')
      logError('AllianceTech.handleDragEnd', err)
    }
  }
```

- [ ] **Step 4: `Out.tsx`**

Change the import block:

```ts
import { useState } from 'react'
import type { ReactNode } from 'react'
import { useOoto } from '../hooks/useOoto'
import { useAuth } from '../hooks/useAuth'
import type { OotoEntry } from '../lib/types'
```

to:

```ts
import { useState } from 'react'
import type { ReactNode } from 'react'
import { useOoto } from '../hooks/useOoto'
import { useAuth } from '../hooks/useAuth'
import { logError } from '../lib/errorLog'
import type { OotoEntry } from '../lib/types'
```

Change:

```ts
    } catch (err) {
      setSaveError((err as { message?: string }).message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
```

to:

```ts
    } catch (err) {
      setSaveError((err as { message?: string }).message ?? 'Save failed')
      logError('Out.handleSave', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
```

Change:

```ts
    } catch (err) {
      setSaveError((err as { message?: string }).message ?? 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
```

to:

```ts
    } catch (err) {
      setSaveError((err as { message?: string }).message ?? 'Delete failed')
      logError('Out.handleDelete', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
```

- [ ] **Step 5: `TrainSchedule.tsx`**

Change the import block:

```ts
import { useState } from 'react'
import { useTrainSchedule } from '../hooks/useTrainSchedule'
import { useScheduleSettings } from '../hooks/useScheduleSettings'
import { useAuth } from '../hooks/useAuth'
import type { TrainEntry, WeekMode } from '../lib/types'
```

to:

```ts
import { useState } from 'react'
import { useTrainSchedule } from '../hooks/useTrainSchedule'
import { useScheduleSettings } from '../hooks/useScheduleSettings'
import { useAuth } from '../hooks/useAuth'
import { logError } from '../lib/errorLog'
import type { TrainEntry, WeekMode } from '../lib/types'
```

Change:

```ts
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
```

to:

```ts
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
      logError('TrainSchedule.handleSave', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
```

Change:

```ts
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  function getMemberName(id: string): string {
```

to:

```ts
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Delete failed')
      logError('TrainSchedule.handleDelete', err)
    } finally {
      setSaving(false)
    }
  }

  function getMemberName(id: string): string {
```

Change:

```ts
    } catch (err) {
      setModeError(err instanceof Error ? err.message : 'Failed to update week mode')
    } finally {
      setModeSaving(false)
    }
  }
```

to:

```ts
    } catch (err) {
      setModeError(err instanceof Error ? err.message : 'Failed to update week mode')
      logError('TrainSchedule.handleWeekModeChange', err)
    } finally {
      setModeSaving(false)
    }
  }
```

- [ ] **Step 6: Type-check**

Run: `npm run build`
Expected: completes with no TypeScript errors.

- [ ] **Step 7: Manual verification**

Prerequisite: Task 1's migration applied. Run: `npm run dev`, log in as an admin.

Force one failure end-to-end as a spot check: on the Out page, click "+ Add", leave the Member field unset, and click Save — this hits the existing client-side validation path (`setSaveError('Member, start date, and end date are required.')`), which is a validation message, not a caught exception, so it does **not** call `logError` (there's no `catch` block for that branch) — confirm no new row appears in `error_logs` for this case (validation is intentionally out of scope; only real thrown errors are logged).

Then force an actual thrown error: temporarily change `src/hooks/useOoto.ts`'s `saveEntry` to insert into a nonexistent table (`.from('ooto_nonexistent')` in `saveEntry`, not `fetchData`), save a valid Out entry, and confirm:
- The existing red `saveError` banner appears in the modal (unchanged behavior).
- A new row appears in `error_logs` with `context = 'Out.handleSave'`.

Revert the temporary change afterward — confirm with `git diff src/hooks/useOoto.ts` that it shows no leftover changes beyond what Task 4 committed.

- [ ] **Step 8: Commit**

```bash
git add src/components/MemberManager.tsx src/components/EventLogImport.tsx src/pages/AllianceTech.tsx src/pages/Out.tsx src/pages/TrainSchedule.tsx
git commit -m "feat: log handled action errors to error_logs"
```

---

### Task 6: `ErrorLogManager` viewer and `AdminPanel` wiring

**Files:**
- Create: `src/components/ErrorLogManager.tsx`
- Modify: `src/pages/AdminPanel.tsx`

**Interfaces:**
- Consumes: `ErrorLogEntry` type from Task 1, `OWNER_USER_ID` from Task 2.
- Produces: none consumed by later tasks — this is the final task.

- [ ] **Step 1: Write `ErrorLogManager.tsx`**

Create `src/components/ErrorLogManager.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ErrorLogEntry } from '../lib/types'

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function ErrorLogManager() {
  const [logs, setLogs] = useState<ErrorLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })
    if (fetchError) {
      setError(fetchError.message)
    } else {
      setLogs((data ?? []) as ErrorLogEntry[])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Errors ({logs.length})</h2>
        <button
          onClick={load}
          className="text-xs bg-game-card border border-game-accent text-gray-300 font-semibold px-3 py-1.5 rounded-lg hover:border-game-gold hover:text-white transition-colors"
        >
          Refresh
        </button>
      </div>

      {loading && <p className="text-gray-400 text-sm animate-pulse">Loading...</p>}

      {error && (
        <p className="text-game-highlight text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</p>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-lg border border-game-accent">
          <table className="w-full text-xs text-white border-collapse">
            <thead>
              <tr className="bg-game-card border-b border-game-accent">
                <th className="text-left px-3 py-2 font-semibold text-gray-300 whitespace-nowrap">When</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-300 whitespace-nowrap">User</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-300 whitespace-nowrap">Context</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-300">Message</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-gray-500 py-6 italic">No errors logged.</td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-game-accent hover:bg-game-card/50 transition-colors">
                  <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{formatTimestamp(log.created_at)}</td>
                  <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{log.user_email ?? 'unknown'}</td>
                  <td className="px-3 py-2 text-gray-300 whitespace-nowrap font-mono">{log.context}</td>
                  <td className="px-3 py-2 text-gray-300">{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wire the tab into `AdminPanel.tsx`**

Change:

```ts
import { useState } from 'react'
import { MemberManager } from '../components/MemberManager'
import { DemeritManager } from '../components/DemeritManager'
import { VsPointManager } from '../components/VsPointManager'
import { useMarshallData } from '../hooks/useMarshallData'
import { useAuth } from '../hooks/useAuth'

type AdminTab = 'members' | 'demerits' | 'vs points'
```

to:

```ts
import { useState } from 'react'
import { MemberManager } from '../components/MemberManager'
import { DemeritManager } from '../components/DemeritManager'
import { VsPointManager } from '../components/VsPointManager'
import { ErrorLogManager } from '../components/ErrorLogManager'
import { useMarshallData } from '../hooks/useMarshallData'
import { useAuth } from '../hooks/useAuth'
import { OWNER_USER_ID } from '../lib/constants'

type AdminTab = 'members' | 'demerits' | 'vs points' | 'errors'
```

Change:

```tsx
      {!loading && !error && (
        <>
          <div className="flex gap-1 border-b border-game-accent">
            {(['members', 'demerits', 'vs points'] as AdminTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${
                  tab === t
                    ? 'border-game-gold text-game-gold'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'members' && <MemberManager members={members} onRefresh={refresh} syncUserId={user?.id} />}
          {tab === 'demerits' && <DemeritManager members={members} />}
          {tab === 'vs points' && <VsPointManager members={members} />}
        </>
      )}
```

to:

```tsx
      {!loading && !error && (
        <>
          <div className="flex gap-1 border-b border-game-accent">
            {(['members', 'demerits', 'vs points'] as AdminTab[])
              .concat(user?.id === OWNER_USER_ID ? ['errors'] : [])
              .map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${
                    tab === t
                      ? 'border-game-gold text-game-gold'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {t}
                </button>
              ))}
          </div>

          {tab === 'members' && <MemberManager members={members} onRefresh={refresh} syncUserId={user?.id} />}
          {tab === 'demerits' && <DemeritManager members={members} />}
          {tab === 'vs points' && <VsPointManager members={members} />}
          {tab === 'errors' && user?.id === OWNER_USER_ID && <ErrorLogManager />}
        </>
      )}
```

- [ ] **Step 3: Type-check**

Run: `npm run build`
Expected: completes with no TypeScript errors.

- [ ] **Step 4: Manual verification**

Prerequisite: Task 1's migration applied, and Tasks 4/5 have produced at least one row in `error_logs` (from their own manual verification steps, or run the Task 3 smoke test again).

Run: `npm run dev`, log in as the owner account (`user.id === OWNER_USER_ID`), open Captain's Quarters.

Confirm:
- An "Errors" tab is visible alongside Members/Demerits/Vs Points.
- Clicking it shows a table with at least one row: timestamp, user email, context string, and message populated correctly.
- Clicking "Refresh" re-fetches without error.

Then confirm owner-only gating: temporarily edit `src/lib/constants.ts` to a different UUID (e.g. append an extra character), reload, and confirm the "Errors" tab disappears entirely (not just its content) for what is now a "non-owner" identity. Revert the temporary edit — confirm with `git diff src/lib/constants.ts` that it shows no changes before committing.

- [ ] **Step 5: Commit**

```bash
git add src/components/ErrorLogManager.tsx src/pages/AdminPanel.tsx
git commit -m "feat: add owner-only error log viewer to Captain's Quarters"
```
