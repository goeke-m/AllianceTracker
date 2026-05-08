# Alliance Member Auto-Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sync alliance members from lastwar.tools API into Supabase on a MWF 10:00 UTC schedule, using a stable `game_uid` to survive player name changes, with a Sync Now button gated to user `edac282d-fd53-4353-8af8-c6b7c3f7480d`.

**Architecture:** A Supabase Edge Function (`sync-alliance-members`) handles the full sync cycle — auth, API fetch, DB reconciliation, and deletes. pg_cron triggers it via `pg_net` on schedule; the Admin Panel button invokes the same function via the Supabase JS client. A pure reconciliation module (`reconcile.ts`) is tested with Deno's built-in test runner.

**Tech Stack:** Deno (Edge Functions), `@supabase/supabase-js@2` (ESM), pg_cron + pg_net (Supabase), React + TypeScript (UI)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `supabase/functions/sync-alliance-members/reconcile.ts` | Pure reconciliation logic (testable, no side effects) |
| Create | `supabase/functions/sync-alliance-members/reconcile_test.ts` | Deno unit tests |
| Create | `supabase/functions/sync-alliance-members/index.ts` | Edge Function entry point: auth, API fetch, DB ops |
| Create | `scripts/game-uid-migration.sql` | Add `game_uid` column to `members` table |
| Create | `scripts/pg-cron-sync.sql` | Schedule the cron job via pg_cron + pg_net |
| Modify | `src/lib/types.ts` | Add `game_uid` to `Member` interface |
| Modify | `src/components/MemberManager.tsx` | Add `syncUserId` prop and conditional Sync Now button |
| Modify | `src/pages/AdminPanel.tsx` | Pass `user?.id` as `syncUserId` to `MemberManager` |

---

## Task 1: DB Migration — Add `game_uid` Column

**Files:**
- Create: `scripts/game-uid-migration.sql`

- [ ] **Step 1: Create the migration file**

Create `scripts/game-uid-migration.sql` with this content:

```sql
-- Add stable game UID column for lastwar.tools API matching.
-- Nullable so existing rows are unaffected until first sync.
ALTER TABLE members ADD COLUMN IF NOT EXISTS game_uid TEXT UNIQUE;
```

- [ ] **Step 2: Run the migration in Supabase**

In the Supabase Dashboard → SQL Editor, paste and run the file contents. Expected result: no error, query returns successfully.

To verify: run `SELECT column_name FROM information_schema.columns WHERE table_name = 'members' AND column_name = 'game_uid';` — should return one row.

- [ ] **Step 3: Commit**

```bash
git add scripts/game-uid-migration.sql
git commit -m "feat: add game_uid column to members table"
```

---

## Task 2: Update TypeScript `Member` Type

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add `game_uid` to the `Member` interface**

In `src/lib/types.ts`, add `game_uid` to the `Member` interface so it reads:

```typescript
export interface Member {
  id: string;
  game_uid?: string | null;
  name: string;
  Rank: RankValue;
  THP?: number;
  S1_Power?: number;
  S1_Type?: SquadType;
  S2_Power?: number;
  S2_Type?: SquadType;
  Strike_Team?: boolean;
  Availability?: string;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add game_uid to Member type"
```

---

## Task 3: Reconciliation Logic (TDD)

**Files:**
- Create: `supabase/functions/sync-alliance-members/reconcile.ts`
- Create: `supabase/functions/sync-alliance-members/reconcile_test.ts`

**Prerequisite:** Deno must be installed. Check with `deno --version`. If missing: https://docs.deno.com/runtime/getting_started/installation/

- [ ] **Step 1: Create the `supabase/functions` directory structure**

```bash
mkdir -p supabase/functions/sync-alliance-members
```

- [ ] **Step 2: Write the failing tests first**

Create `supabase/functions/sync-alliance-members/reconcile_test.ts`:

```typescript
import { assertEquals, assertThrows } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { reconcile, mapRank } from './reconcile.ts'

Deno.test('mapRank converts integer 1-5 to R-string', () => {
  assertEquals(mapRank(1), 'R1')
  assertEquals(mapRank(3), 'R3')
  assertEquals(mapRank(5), 'R5')
})

Deno.test('mapRank throws for out-of-range values', () => {
  assertThrows(() => mapRank(0), Error, 'Invalid rank')
  assertThrows(() => mapRank(6), Error, 'Invalid rank')
})

Deno.test('reconcile: updates member matched by game_uid', () => {
  const result = reconcile(
    [{ uid: 'abc123', name: 'NewName', rank: 4, power: 85400000 }],
    [{ id: 'db-1', game_uid: 'abc123', name: 'OldName' }]
  )
  assertEquals(result.toUpdate, [{
    game_uid: 'abc123', name: 'NewName', Rank: 'R4', THP: 85.4
  }])
  assertEquals(result.toInsert, [])
  assertEquals(result.toMatchByName, [])
  assertEquals(result.toDelete, [])
})

Deno.test('reconcile: matches null-game_uid row by name (case-insensitive)', () => {
  const result = reconcile(
    [{ uid: 'abc123', name: 'ShadowMohawk', rank: 4, power: 31700000 }],
    [{ id: 'db-1', game_uid: null, name: 'shadowmohawk' }]
  )
  assertEquals(result.toMatchByName, [{
    dbId: 'db-1', game_uid: 'abc123', name: 'ShadowMohawk', Rank: 'R4', THP: 31.7
  }])
  assertEquals(result.toInsert, [])
  assertEquals(result.toUpdate, [])
  assertEquals(result.toDelete, [])
})

Deno.test('reconcile: inserts member not found in DB', () => {
  const result = reconcile(
    [{ uid: 'new-uid', name: 'NewPlayer', rank: 3, power: 20000000 }],
    []
  )
  assertEquals(result.toInsert, [{
    game_uid: 'new-uid', name: 'NewPlayer', Rank: 'R3', THP: 20.0
  }])
  assertEquals(result.toMatchByName, [])
  assertEquals(result.toUpdate, [])
  assertEquals(result.toDelete, [])
})

Deno.test('reconcile: deletes DB member with game_uid absent from API', () => {
  const result = reconcile(
    [],
    [{ id: 'db-1', game_uid: 'gone-uid', name: 'OldMember' }]
  )
  assertEquals(result.toDelete, ['db-1'])
  assertEquals(result.toInsert, [])
  assertEquals(result.toUpdate, [])
  assertEquals(result.toMatchByName, [])
})

Deno.test('reconcile: never deletes member with null game_uid', () => {
  const result = reconcile(
    [],
    [{ id: 'db-1', game_uid: null, name: 'ManualMember' }]
  )
  assertEquals(result.toDelete, [])
})

Deno.test('reconcile: handles mix of all four cases', () => {
  const result = reconcile(
    [
      { uid: 'uid-1', name: 'Updated', rank: 4, power: 50000000 },
      { uid: 'uid-2', name: 'NameMatch', rank: 3, power: 30000000 },
      { uid: 'uid-3', name: 'Brand New', rank: 2, power: 10000000 },
    ],
    [
      { id: 'db-1', game_uid: 'uid-1', name: 'Old Name' },
      { id: 'db-2', game_uid: null, name: 'namematch' },
      { id: 'db-3', game_uid: 'departed', name: 'Gone' },
      { id: 'db-4', game_uid: null, name: 'Manual Entry' },
    ]
  )
  assertEquals(result.toUpdate.length, 1)
  assertEquals(result.toMatchByName.length, 1)
  assertEquals(result.toInsert.length, 1)
  assertEquals(result.toDelete, ['db-3'])
})
```

- [ ] **Step 3: Run tests — verify they fail (reconcile.ts doesn't exist yet)**

```bash
deno test supabase/functions/sync-alliance-members/reconcile_test.ts
```

Expected: error like `Cannot resolve module './reconcile.ts'` — this is correct, we haven't written it yet.

- [ ] **Step 4: Write the reconciliation implementation**

Create `supabase/functions/sync-alliance-members/reconcile.ts`:

```typescript
export type RankValue = 'R1' | 'R2' | 'R3' | 'R4' | 'R5'

export interface ApiMember {
  uid: string
  name: string
  rank: number
  power: number
}

export interface DbMember {
  id: string
  game_uid: string | null
  name: string
}

export interface SyncUpdate {
  game_uid: string
  name: string
  Rank: RankValue
  THP: number
}

export interface NameMatch extends SyncUpdate {
  dbId: string
}

export interface ReconcileResult {
  toInsert: SyncUpdate[]
  toUpdate: SyncUpdate[]
  toMatchByName: NameMatch[]
  toDelete: string[]
}

export function mapRank(rank: number): RankValue {
  if (rank < 1 || rank > 5) throw new Error(`Invalid rank: ${rank}`)
  return `R${rank}` as RankValue
}

export function reconcile(apiMembers: ApiMember[], dbMembers: DbMember[]): ReconcileResult {
  const toInsert: SyncUpdate[] = []
  const toUpdate: SyncUpdate[] = []
  const toMatchByName: NameMatch[] = []
  const toDelete: string[] = []

  const apiUids = new Set(apiMembers.map((m) => m.uid))

  const dbByUid = new Map(
    dbMembers.filter((m) => m.game_uid !== null).map((m) => [m.game_uid!, m])
  )
  const dbByNameLower = new Map(
    dbMembers.filter((m) => m.game_uid === null).map((m) => [m.name.toLowerCase(), m])
  )

  for (const api of apiMembers) {
    const update: SyncUpdate = {
      game_uid: api.uid,
      name: api.name,
      Rank: mapRank(api.rank),
      THP: Math.round((api.power / 1_000_000) * 10) / 10,
    }

    if (dbByUid.has(api.uid)) {
      toUpdate.push(update)
    } else if (dbByNameLower.has(api.name.toLowerCase())) {
      const db = dbByNameLower.get(api.name.toLowerCase())!
      toMatchByName.push({ ...update, dbId: db.id })
    } else {
      toInsert.push(update)
    }
  }

  for (const db of dbMembers) {
    if (db.game_uid !== null && !apiUids.has(db.game_uid)) {
      toDelete.push(db.id)
    }
  }

  return { toInsert, toUpdate, toMatchByName, toDelete }
}
```

- [ ] **Step 5: Run tests — verify they all pass**

```bash
deno test supabase/functions/sync-alliance-members/reconcile_test.ts
```

Expected output:
```
running 8 tests from ./supabase/functions/sync-alliance-members/reconcile_test.ts
mapRank converts integer 1-5 to R-string ... ok (Xms)
mapRank throws for out-of-range values ... ok (Xms)
reconcile: updates member matched by game_uid ... ok (Xms)
reconcile: matches null-game_uid row by name (case-insensitive) ... ok (Xms)
reconcile: inserts member not found in DB ... ok (Xms)
reconcile: deletes DB member with game_uid absent from API ... ok (Xms)
reconcile: never deletes member with null game_uid ... ok (Xms)
reconcile: handles mix of all four cases ... ok (Xms)

ok | 8 passed | 0 failed
```

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/sync-alliance-members/
git commit -m "feat: add reconciliation logic with Deno tests"
```

---

## Task 4: Edge Function — `sync-alliance-members`

**Files:**
- Create: `supabase/functions/sync-alliance-members/index.ts`

- [ ] **Step 1: Write the Edge Function**

Create `supabase/functions/sync-alliance-members/index.ts`:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { reconcile } from './reconcile.ts'

const SYNC_USER_ID = 'edac282d-fd53-4353-8af8-c6b7c3f7480d'
const LASTWAR_BASE = 'https://api.lastwar.tools'

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''

    // Allow service role key (pg_cron scheduled calls). Anything else must be
    // the specific sync user's JWT.
    if (token !== serviceRoleKey) {
      const supabaseForUser = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      )
      const { data: { user } } = await supabaseForUser.auth.getUser()
      if (!user || user.id !== SYNC_USER_ID) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    const apiKey = Deno.env.get('LASTWAR_API_KEY')!
    const allianceId = Deno.env.get('LASTWAR_ALLIANCE_ID')!

    // Fetch members from lastwar.tools shared queue (no session_key)
    const apiResp = await fetch(
      `${LASTWAR_BASE}/alliance/${allianceId}/members`,
      { headers: { 'X-API-Key': apiKey } }
    )

    if (!apiResp.ok) {
      const body = await apiResp.text().catch(() => '(no body)')
      return new Response(
        JSON.stringify({
          added: 0, updated: 0, removed: 0,
          errors: [`lastwar.tools API error ${apiResp.status}: ${body}`],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const apiData = await apiResp.json()
    const apiMembers = apiData.members ?? []

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const { data: dbRows, error: dbError } = await supabaseAdmin
      .from('members')
      .select('id, game_uid, name')

    if (dbError) throw dbError

    const result = reconcile(apiMembers, dbRows ?? [])

    const errors: string[] = []
    let added = 0
    let updated = 0
    let removed = 0

    // Insert brand-new members
    if (result.toInsert.length > 0) {
      const { error } = await supabaseAdmin.from('members').insert(
        result.toInsert.map((m) => ({
          game_uid: m.game_uid,
          name: m.name,
          Rank: m.Rank,
          THP: m.THP,
        }))
      )
      if (error) errors.push(`insert error: ${error.message}`)
      else added = result.toInsert.length
    }

    // Set game_uid + update stats for name-matched rows (null game_uid → now identified)
    for (const m of result.toMatchByName) {
      const { error } = await supabaseAdmin
        .from('members')
        .update({ game_uid: m.game_uid, name: m.name, Rank: m.Rank, THP: m.THP, updated_at: new Date().toISOString() })
        .eq('id', m.dbId)
      if (error) errors.push(`name-match update error for "${m.name}": ${error.message}`)
      else updated++
    }

    // Update stats for game_uid-matched rows
    for (const m of result.toUpdate) {
      const { error } = await supabaseAdmin
        .from('members')
        .update({ name: m.name, Rank: m.Rank, THP: m.THP, updated_at: new Date().toISOString() })
        .eq('game_uid', m.game_uid)
      if (error) errors.push(`update error for "${m.name}": ${error.message}`)
      else updated++
    }

    // Delete departed members (clear train_schedule FKs first)
    for (const dbId of result.toDelete) {
      await supabaseAdmin.from('train_schedule').update({ Conductor: null }).eq('Conductor', dbId)
      await supabaseAdmin.from('train_schedule').update({ VIP: null }).eq('VIP', dbId)
      const { error } = await supabaseAdmin.from('members').delete().eq('id', dbId)
      if (error) errors.push(`delete error for id "${dbId}": ${error.message}`)
      else removed++
    }

    return new Response(
      JSON.stringify({ added, updated, removed, errors }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ added: 0, updated: 0, removed: 0, errors: [String(err)] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/sync-alliance-members/index.ts
git commit -m "feat: add sync-alliance-members Edge Function"
```

---

## Task 5: Admin UI — Sync Now Button

**Files:**
- Modify: `src/components/MemberManager.tsx`
- Modify: `src/pages/AdminPanel.tsx`

- [ ] **Step 1: Add `syncUserId` prop and Sync Now button to `MemberManager`**

In `src/components/MemberManager.tsx`, make these changes:

**a) Add `syncUserId` to the props interface** (around line 5):

```typescript
interface MemberManagerProps {
  members: Member[]
  onRefresh: () => void
  syncUserId?: string
}
```

**b) Destructure it in the function signature** (line 67):

```typescript
export function MemberManager({ members, onRefresh, syncUserId }: MemberManagerProps) {
```

**c) Add sync state variables** after the existing `const [error, setError] = useState<string | null>(null)` (around line 92):

```typescript
const [syncing, setSyncing] = useState(false)
const [syncResult, setSyncResult] = useState<string | null>(null)
```

**d) Add the sync handler** after the `handleAdd` function (after line 152):

```typescript
async function handleSync() {
  setSyncing(true)
  setSyncResult(null)
  setError(null)
  try {
    const { data, error } = await supabase.functions.invoke('sync-alliance-members')
    if (error) throw error
    const { added, updated, removed, errors } = data as {
      added: number; updated: number; removed: number; errors: string[]
    }
    if (errors.length > 0) {
      setError(`Sync errors: ${errors.join('; ')}`)
    } else {
      setSyncResult(`Synced: +${added} added, ${updated} updated, ${removed} removed`)
      onRefresh()
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Sync failed')
  }
  setSyncing(false)
}
```

**e) Add the Sync Now button** in the form/header area. Replace the existing `<h2>` element (around line 197) with:

```typescript
<div className="flex items-center justify-between">
  <h2 className="text-lg font-bold text-white">Members ({displayed.length} / {members.length})</h2>
  {syncUserId === 'edac282d-fd53-4353-8af8-c6b7c3f7480d' && (
    <button
      onClick={handleSync}
      disabled={syncing}
      className="bg-game-card border border-game-accent text-gray-300 font-semibold px-4 py-1.5 rounded-lg text-sm hover:border-game-gold hover:text-white transition-colors disabled:opacity-50"
    >
      {syncing ? 'Syncing…' : 'Sync Now'}
    </button>
  )}
</div>
```

**f) Show the sync result below the error banner.** After the existing error `<p>` block (around line 224), add:

```typescript
{syncResult && (
  <p className="text-green-400 text-sm bg-green-900/20 border border-green-800 rounded-lg px-3 py-2">{syncResult}</p>
)}
```

- [ ] **Step 2: Pass `syncUserId` from `AdminPanel`**

In `src/pages/AdminPanel.tsx`, update the `useMarshallData` destructure to also get `user`, and pass it:

First, check how `useAuth` is imported elsewhere in the project:

```bash
grep -r "useAuth" src/
```

Then import and use it in `AdminPanel.tsx`. The file at `src/pages/AdminPanel.tsx` line 1 should be updated to include the auth hook import and pass the prop:

```typescript
import { useState } from 'react'
import { MemberManager } from '../components/MemberManager'
import { DemeritManager } from '../components/DemeritManager'
import { VsPointManager } from '../components/VsPointManager'
import { useMarshallData } from '../hooks/useMarshallData'
import { useAuth } from '../hooks/useAuth'

type AdminTab = 'members' | 'demerits' | 'vs points'

export function AdminPanel() {
  const { members, loading, error, refresh } = useMarshallData()
  const { user } = useAuth()
  const [tab, setTab] = useState<AdminTab>('members')

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-xl font-bold text-game-gold">☠️ Captain's Quarters</h1>

      {loading && (
        <div className="text-center py-8 text-game-gold animate-pulse">Loading...</div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-game-highlight text-sm">
          {error}
        </div>
      )}

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
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/MemberManager.tsx src/pages/AdminPanel.tsx
git commit -m "feat: add admin-only Sync Now button to MemberManager"
```

---

## Task 6: pg_cron Schedule Script

**Files:**
- Create: `scripts/pg-cron-sync.sql`

- [ ] **Step 1: Create the pg_cron setup script**

Create `scripts/pg-cron-sync.sql`:

```sql
-- Schedule the alliance member sync to run MWF at 10:00 UTC
-- (5 AM EST / 6 AM EDT — pg_cron does not adjust for DST)
--
-- Prerequisites:
--   1. pg_cron extension enabled (Supabase Dashboard → Database → Extensions → pg_cron)
--   2. pg_net extension enabled (same location)
--   3. Edge Function deployed: supabase functions deploy sync-alliance-members
--   4. Replace <PROJECT_REF> with your Supabase project reference
--      (found in: Project Settings → General → Reference ID)
--   5. Replace <SERVICE_ROLE_KEY> with your service role key
--      (found in: Project Settings → API → service_role key)
--
-- Run this in the Supabase SQL Editor.

SELECT cron.schedule(
  'sync-alliance-members',
  '0 10 * * 1,3,5',
  $$
  SELECT
    net.http_post(
      url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/sync-alliance-members',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
      ),
      body    := '{}'::jsonb
    ) AS request_id;
  $$
);

-- To verify the job was created:
-- SELECT * FROM cron.job;

-- To remove the job if needed:
-- SELECT cron.unschedule('sync-alliance-members');
```

- [ ] **Step 2: Commit**

```bash
git add scripts/pg-cron-sync.sql
git commit -m "feat: add pg_cron schedule script for alliance member sync"
```

---

## Task 7: Deploy, Configure Secrets, and Verify

This task requires the Supabase CLI. Steps are manual (no automated test runner).

- [ ] **Step 1: Install Supabase CLI (if not already installed)**

```bash
supabase --version
```

If missing, install via npm:
```bash
npm install -g supabase
```

- [ ] **Step 2: Initialize Supabase project structure and link**

```bash
supabase init
```

This creates `supabase/config.toml`. When prompted, answer no to sample functions.

Then link to your project (find your project ref in Supabase Dashboard → Project Settings → General → Reference ID):

```bash
supabase link --project-ref <YOUR_PROJECT_REF>
```

It will prompt for your database password (from Supabase Dashboard → Project Settings → Database).

- [ ] **Step 3: Set Edge Function secrets**

In the Supabase Dashboard → Project Settings → Edge Functions → Add new secret, set:

| Secret Name | Value |
|---|---|
| `LASTWAR_API_KEY` | Your lastwar.tools API key |
| `LASTWAR_ALLIANCE_ID` | Your 32-character hex alliance ID |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are automatically injected by Supabase — do not set them manually.

- [ ] **Step 4: Deploy the Edge Function**

```bash
supabase functions deploy sync-alliance-members --no-verify-jwt
```

The `--no-verify-jwt` flag is required because pg_cron calls bypass the standard Supabase JWT verification — our function handles auth manually.

Expected output:
```
Bundling supabase/functions/sync-alliance-members/index.ts...
Deploying function sync-alliance-members (script size: ~Xkb)
Done. Function deployed successfully!
```

- [ ] **Step 5: Run pg_cron setup script**

In Supabase Dashboard → SQL Editor: open `scripts/pg-cron-sync.sql`, fill in `<PROJECT_REF>` and `<SERVICE_ROLE_KEY>`, and run it.

Verify: `SELECT jobname, schedule, active FROM cron.job;` — should show one row for `sync-alliance-members`.

- [ ] **Step 6: Test the Edge Function manually via curl**

Get your service role key from Supabase Dashboard → Project Settings → API.

```bash
curl -X POST \
  https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/sync-alliance-members \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected response (values will vary):
```json
{"added":0,"updated":47,"removed":0,"errors":[]}
```

If `errors` is non-empty, check Supabase Dashboard → Edge Functions → Logs for the full stack trace.

- [ ] **Step 7: Test the UI Sync Now button**

Start the dev server:
```bash
npm run dev
```

Log in as the admin account (`edac282d-fd53-4353-8af8-c6b7c3f7480d`). Navigate to Admin Panel → Members tab. Verify the "Sync Now" button appears. Click it — it should show "Syncing…" briefly then display a green result banner. `onRefresh` will re-fetch the member list.

Log in as a different admin account (or use another test account with `is_admin = true` but a different user ID). Navigate to the same page. Verify the "Sync Now" button does **not** appear.

- [ ] **Step 8: Commit Supabase config**

```bash
git add supabase/config.toml supabase/.gitignore
git commit -m "chore: add Supabase CLI project config"
```

---

## Notes

- **THP scale:** The `THP` column stores values in millions (e.g., `85.4` = 85.4M). The sync converts API `power` (raw integer) via `power / 1_000_000` rounded to 1 decimal. Existing manually-entered THP values use the same scale, so display remains consistent.
- **pg_cron DST:** The job runs at 10:00 UTC always — 5 AM EST in winter, 6 AM EDT in summer. This is intentional.
- **First-run behavior:** Existing DB members with `game_uid = NULL` are matched by name (case-insensitive) on every sync until they get a UID assigned. After that, name changes are tracked automatically via `game_uid`.
- **Members with `game_uid = NULL` are never auto-deleted** — manually-added records are always protected.
