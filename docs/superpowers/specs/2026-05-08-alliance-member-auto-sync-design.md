# Alliance Member Auto-Sync — Design Spec

**Date:** 2026-05-08  
**Status:** Approved

## Overview

Automatically sync alliance members from the lastwar.tools API into the Supabase `members` table on a MWF morning schedule. Members are matched by a stable game UID (never changes even when a player renames). A manual "Sync Now" button is available in the Admin Panel exclusively to the account `edac282d-fd53-4353-8af8-c6b7c3f7480d`.

---

## 1. Database Changes

### New column: `game_uid`

Add `game_uid TEXT UNIQUE` to the `members` table. This maps to the `uid` field returned by the lastwar.tools API. It is the stable, immutable identifier for a player — name changes do not affect it.

- Nullable initially; existing rows start as NULL.
- For any DB row with `game_uid = NULL`, the sync attempts to match it against the API response by `name` (case-insensitive). If a match is found, the row is updated with the `game_uid` and the latest stats. If no match is found, a new row is inserted.
- Once a row has a `game_uid`, all future syncs match exclusively on `game_uid` — name changes are handled automatically.
- Members with `game_uid = NULL` are never auto-deleted (protects manually-added records not yet matched).

**Migration file:** `scripts/game-uid-migration.sql`

```sql
ALTER TABLE members ADD COLUMN IF NOT EXISTS game_uid TEXT UNIQUE;
```

---

## 2. Edge Function — `sync-alliance-members`

**Location:** `supabase/functions/sync-alliance-members/index.ts`  
**Runtime:** Deno (Supabase Edge Functions)

### Authorization

- **Scheduled calls** (pg_cron via service role key): JWT is absent or uses the service role. Always authorized.
- **Manual calls** (UI button): Must include a user JWT. The function reads the `sub` claim and rejects any caller whose ID is not `edac282d-fd53-4353-8af8-c6b7c3f7480d`. Returns HTTP 403 otherwise.

### Secrets (set via Supabase Dashboard → Project Settings → Edge Functions)

| Secret | Description |
|---|---|
| `LASTWAR_API_KEY` | lastwar.tools API key (`X-API-Key` header) |
| `LASTWAR_ALLIANCE_ID` | 32-character hex alliance ID |
| `SUPABASE_URL` | Supabase project URL (auto-provided) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for DB writes (auto-provided) |

### API Call

```
GET https://api.lastwar.tools/alliance/{LASTWAR_ALLIANCE_ID}/members
Headers:
  X-API-Key: <LASTWAR_API_KEY>
```

No `session_key` parameter is passed. The shared queue system on lastwar.tools manages the game session — the user's personal game account is not involved.

### Reconciliation Logic

Given the API response list of members (`apiMembers`) and the current DB rows (`dbMembers`):

1. **Build a lookup map** of DB rows by `game_uid` and separately by `name`.
2. **For each API member:**
   - If a DB row exists with matching `game_uid` → update `name`, `Rank`, `THP`.
   - Else if a DB row exists with matching `name` (case-insensitive, for rows with null `game_uid`) → set `game_uid`, update `Rank`, `THP`.
   - Else → insert new row with `game_uid`, `name`, `Rank`, `THP`. All other fields (`S1_Power`, `S1_Type`, etc.) default to NULL and remain for manual entry.
3. **Delete departures:** DB rows whose `game_uid` is non-null and whose `game_uid` does not appear in the API response are removed. Before deletion, null out any `train_schedule` FK references (same pattern as manual member delete).

### Field Mapping

| API field | DB column | Notes |
|---|---|---|
| `uid` | `game_uid` | Stable identity key |
| `name` | `name` | Updated on every sync |
| `rank` (int 1–5) | `Rank` (R1–R5) | Mapped: `rank` → `"R" + rank` |
| `power` (int) | `THP` | Total Hero Power |

Fields not in the API (`S1_Power`, `S1_Type`, `S2_Power`, `S2_Type`, `Strike_Team`, `Availability`) are never modified by the sync.

### Response

```json
{
  "added": 2,
  "updated": 47,
  "removed": 1,
  "errors": []
}
```

Non-200 from lastwar.tools (e.g., queue busy, rate limit) is caught, logged, and returned in `errors[]`. The function returns HTTP 200 with the error detail rather than crashing, so pg_cron doesn't retry unexpectedly.

---

## 3. Scheduling — pg_cron

**Schedule:** MWF at 10:00 UTC  
**Local time:** 5:00 AM EST (winter) / 6:00 AM EDT (summer)  
**Note:** pg_cron does not adjust for DST. The job will run one hour later in summer local time — this is acceptable.

**Migration file:** `scripts/pg-cron-sync.sql`

```sql
SELECT cron.schedule(
  'sync-alliance-members',
  '0 10 * * 1,3,5',
  $$
  SELECT net.http_post(
    url      := current_setting('app.supabase_url') || '/functions/v1/sync-alliance-members',
    headers  := jsonb_build_object(
                  'Content-Type',  'application/json',
                  'Authorization', 'Bearer ' || current_setting('app.service_role_key')
                ),
    body     := '{}'::jsonb
  );
  $$
);
```

The `app.supabase_url` and `app.service_role_key` Postgres settings must be set in the SQL editor before running this script:

```sql
ALTER DATABASE postgres SET app.supabase_url = 'https://<project-ref>.supabase.co';
ALTER DATABASE postgres SET app.service_role_key = '<service-role-key>';
```

Because the call uses the service role key, no user JWT is present — the Edge Function's authorization logic treats it as a scheduled (always-authorized) run.

---

## 4. UI Changes

### `src/lib/types.ts`

Add `game_uid?: string | null` to the `Member` interface.

### `src/components/MemberManager.tsx`

- Accept the current user ID as a prop (`syncUserId?: string`).
- Render a **"Sync Now"** button next to the Add Member form when `syncUserId === 'edac282d-fd53-4353-8af8-c6b7c3f7480d'`.
- On click: call `supabase.functions.invoke('sync-alliance-members')`, show a loading state, display the result summary (e.g., `"Synced: +2 added, 47 updated, 1 removed"`) or an error message in the existing error banner.
- On success: call `onRefresh()`.

### `src/pages/AdminPanel.tsx`

- Read `user.id` from `useAuth()` and pass it to `<MemberManager syncUserId={user?.id} />`.

---

## 5. New Files Summary

| File | Purpose |
|---|---|
| `supabase/functions/sync-alliance-members/index.ts` | Edge Function |
| `scripts/game-uid-migration.sql` | Add `game_uid` column |
| `scripts/pg-cron-sync.sql` | Schedule the cron job |

---

## 6. Out of Scope

- HQ level is not synced (not in the current DB schema).
- No sync history/audit log.
- No retry logic for queue-busy errors (failures surface in the UI or Supabase function logs).
- No notification when a member is auto-removed.
