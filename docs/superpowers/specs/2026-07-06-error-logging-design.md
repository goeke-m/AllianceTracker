# Error Logging Design Spec

**Date:** 2026-07-06
**Status:** Approved

## Overview

Failed user-triggered actions (Supabase save/delete/fetch calls that already surface as red error banners in the UI) currently vanish once the user dismisses or reloads the page — the only record is whatever's visible in the browser console at that moment. Add a persisted `error_logs` table that captures these failures, plus a read-only viewer page so they can be reviewed without going into the Supabase dashboard.

This does not add crash reporting (uncaught exceptions, React render errors) or auth-failure logging — only errors from the existing handled `catch` blocks that already set an `error` string for display.

---

## 1. Scope

- **In scope:**
  - New `error_logs` table, written to by a small shared helper called from existing `catch` blocks.
  - A new read-only "Errors" tab inside the existing Captain's Quarters (`AdminPanel`), visible only to the site owner.
  - Extracting the existing hardcoded owner-user-ID check in `MemberManager.tsx` into a shared constant, reused for the new tab's visibility gate.
- **Out of scope:**
  - Uncaught JS/React crashes, unhandled promise rejections, global error boundaries.
  - Login/auth failures.
  - Deleting or clearing log entries (view-only for now).
  - Any change to the existing on-screen error banners — this is purely additive logging alongside them.

## 2. Data Layer

### New table: `error_logs`

```sql
CREATE TABLE IF NOT EXISTS error_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  context    text NOT NULL,        -- e.g. 'useMarshallData.fetchData'
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

INSERT is open to any authenticated user since any member's action can fail and should still be captured, regardless of who ends up viewing it. SELECT uses the same admin-level RLS pattern as `demerits`/`vs_points` (`scripts/demerits-migration.sql`) — there's no need for tighter DB-level restriction since the owner is the only Supabase admin in practice; the UI-level gate (section 4) is what actually limits visibility to the owner specifically.

This SQL goes in a new `scripts/error-logs-migration.sql`, run manually in the Supabase SQL editor, matching how every other table in this project is provisioned.

### New type (`src/lib/types.ts`)

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

## 3. Shared owner constant (`src/lib/constants.ts`)

```ts
export const OWNER_USER_ID = 'edac282d-fd53-4353-8af8-c6b7c3f7480d'
```

`src/components/MemberManager.tsx` currently declares this same UUID locally as `SYNC_ADMIN_USER_ID` (used to gate the "Sync Now" button). Replace that local constant with an import of `OWNER_USER_ID`, so the "who is the owner" fact lives in exactly one place instead of being duplicated when the error log viewer needs the same check.

## 4. Logging helper (`src/lib/errorLog.ts`)

```ts
import { supabase } from './supabase'

export function logError(context: string, err: unknown) {
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

Fire-and-forget: callers never `await` this. It resolves the current user itself via `supabase.auth.getUser()`, so no hook or component needs to thread `user`/`isAdmin` through just to log — it's a single extra line next to the existing `setError(...)` call.

## 5. Wiring into existing catch blocks

Add one `logError('<context>', err)` call immediately next to the existing `setError(...)` call in each of these, using a `Component.method` style context string:

| File | Context strings |
|---|---|
| `src/hooks/useMarshallData.ts` | `'useMarshallData.fetchData'` |
| `src/hooks/useTrainSchedule.ts` | `'useTrainSchedule.fetchData'` (or equivalent per catch block) |
| `src/hooks/useAllianceTech.ts` | `'useAllianceTech.fetchData'` |
| `src/hooks/useOoto.ts` | `'useOoto.fetchData'` |
| `src/hooks/useScheduleSettings.ts` | `'useScheduleSettings.fetchData'` |
| `src/components/MemberManager.tsx` | `'MemberManager.handleSync'`, `'MemberManager.handleAdd'`, `'MemberManager.handleDelete'` |
| `src/components/EventLogImport.tsx` | `'EventLogImport.handleImport'` |
| `src/pages/AllianceTech.tsx` | one per existing catch block (4 total), named for the action each guards |
| `src/pages/Out.tsx` | one per existing catch block (2 total), named for the action each guards |
| `src/pages/TrainSchedule.tsx` | one per existing catch block (3 total: save, delete, week-mode change) |

Exact context strings for `AllianceTech.tsx`/`Out.tsx`/`TrainSchedule.tsx`/`useTrainSchedule.ts` are chosen during implementation to match the action each catch block actually guards (visible once reading the surrounding function names).

## 6. Viewer

### New component: `src/components/ErrorLogManager.tsx`

Styled like `DemeritManager.tsx` — fetches `error_logs` ordered by `created_at desc` on mount, renders a simple list of rows showing: relative/formatted timestamp, `user_email` (or "unknown"), `context`, `message`. Read-only — no delete/edit actions. Uses the same loading/error state shape as the other manager components.

### `AdminPanel` changes (`src/pages/AdminPanel.tsx`)

- Add `'errors'` to the `AdminTab` union.
- Only render the "Errors" tab button when `user?.id === OWNER_USER_ID` (mirrors the `syncUserId === SYNC_ADMIN_USER_ID` check already used for the sync button).
- Render `<ErrorLogManager />` when `tab === 'errors'`.

## 7. Testing

No automated test framework exists in this project (`tsc` + manual verification is the established pattern). Manual verification in the running dev app:

- Force a Supabase failure (e.g. temporarily break a query or trigger a known validation error) and confirm a row appears in `error_logs` via the Supabase dashboard.
- Confirm the "Errors" tab is visible when signed in as the owner account and absent for any other admin account.
- Confirm the Errors tab lists the logged entry with correct timestamp, email, context, and message.
- Confirm a logging failure (e.g. temporarily point the insert at a nonexistent table) does not surface any error to the end user and does not block the original action's own error banner from showing.
