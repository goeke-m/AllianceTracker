# Storm "Requested, Not Selected" Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins record, per Desert Storm / Canyon Storm team, which members requested to battle in-game but weren't selected that week, and have those members automatically carry forward onto the following week's request list.

**Architecture:** Extend the existing `storm_roster` table with a third `role` value (`'requested'`, alongside `'participant'`/`'substitute'`) instead of adding new tables. `team` stays required on every role since a request is for a specific team (A/B run at different times). Promotion from requested → selected updates the existing row in place (the `UNIQUE (event_id, member_id)` constraint already guarantees a member can't be both at once). Carry-forward runs automatically inside `useStormEvent`'s fetch, gated by the `UNIQUE (event_type, week_start)` constraint on `storm_events` itself acting as a one-time-per-week marker — no new idempotency table needed. UI-wise, each `TeamPanel` gains a third "Requested, not selected" zone alongside Participants/Substitutes, and History view cards gain a per-team requested count/list.

**Tech Stack:** React + TypeScript, Vite, Tailwind CSS, react-i18next, Supabase (Postgres + RLS), Supabase CLI migrations. No test runner is configured in this repo (`package.json` has no `test` script) — verification is `tsc --noEmit` plus manual exercise of the running dev app, consistent with prior Storm-page work. Note: this environment has no `.env.local` (no Supabase credentials) and no running Docker daemon (`docker ps` fails to reach the Docker API) — neither `npm run dev` against real data nor `npx supabase db reset` can be executed here. Every manual-verification step below must be attempted, and if it fails for either of those reasons, the report must say so explicitly rather than claiming success.

Design reference: `docs/superpowers/specs/2026-07-22-storm-requested-not-selected-design.md`

## Global Constraints

- No automated test coverage exists for `StormPage.tsx` / `useStormEvent.ts` — do not introduce a new test framework or files; verify via `tsc --noEmit`.
- `team` on `storm_roster` remains `NOT NULL` for every role, including `'requested'` — do not make it nullable. A request always names a specific team.
- Never edit an existing, already-applied migration file — this feature is a new migration file only (per `README.md`'s migration guidance).
- Promotion from `'requested'` to `'participant'`/`'substitute'` must `UPDATE` the existing `storm_roster` row, never `INSERT` a second row for the same `(event_id, member_id)` — the unique constraint would reject a duplicate anyway, but the update-in-place is also what makes a promoted member disappear from the Requested zone without a separate delete step.
- Carry-forward must only run for the live current week (`weekOffset === 0`), only as an admin (matches RLS: writes are admin-only), and only once per `(event_type, week_start)` — gated by the existing `storm_events` unique constraint, not a new marker table.
- `teamPower` and the History view's per-team attendance summary / power total must exclude `role === 'requested'` rows — they aren't part of the active roster.
- All four locale files (`src/locales/en.json`, `es.json`, `pt-BR.json`, `ko.json`) must stay in parity — any new user-facing string added to one must be added, translated, to all four.
- Do not add a separate "promote" button — promotion happens through the existing Participants/Substitutes `+Add` picker, which transparently updates a matching `'requested'` row if one exists.

---

### Task 1: Migration — allow `'requested'` as a `storm_roster.role` value

**Files:**
- Create: `supabase/migrations/20260722000000_storm_roster_requested_role.sql`

**Interfaces:**
- Consumes: existing `storm_roster_role_check` CHECK constraint, defined in `supabase/migrations/20260101000000_base_schema.sql:674` as `CHECK (("role" = ANY (ARRAY['participant'::"text", 'substitute'::"text"])))`.
- Produces: `storm_roster.role` now accepts `'requested'` in addition to `'participant'`/`'substitute'` — every later task's DB writes with `role: 'requested'` depend on this.

- [ ] **Step 1: Create the migration file**

```bash
cd /home/shadowmohawk/Repos/AllianceTracker
npx supabase migration new storm_roster_requested_role
```

Expected: creates an empty file at `supabase/migrations/<timestamp>_storm_roster_requested_role.sql`. Note the actual generated timestamp — if it differs from `20260722000000`, use the CLI-generated filename for the rest of this task instead.

- [ ] **Step 2: Write the constraint change**

Replace the generated file's contents with:

```sql
ALTER TABLE "public"."storm_roster" DROP CONSTRAINT "storm_roster_role_check";

ALTER TABLE "public"."storm_roster" ADD CONSTRAINT "storm_roster_role_check" CHECK (("role" = ANY (ARRAY['participant'::"text", 'substitute'::"text", 'requested'::"text"])));
```

- [ ] **Step 3: Attempt local verification, document if infeasible**

Try: `npx supabase db reset` (applies all migrations, including this one, to a local Postgres instance via Docker).

If this fails because Docker isn't reachable (check with `docker ps` — if it errors "failed to connect to the docker API", Docker is not running), state clearly in your report that local migration verification could not be performed in this environment, rather than claiming it passed. Do not attempt to start Docker yourself.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(storm): allow 'requested' as a storm_roster role"
```

---

### Task 2: Widen `StormRosterEntry.role` in shared types

**Files:**
- Modify: `src/lib/types.ts:155-163`

**Interfaces:**
- Consumes: nothing new.
- Produces: `StormRosterEntry.role: 'participant' | 'substitute' | 'requested'` — every later task that reads/writes `storm_roster` rows through this type depends on it.

- [ ] **Step 1: Widen the `role` field**

Find (around `src/lib/types.ts:155-163`):

```ts
export interface StormRosterEntry {
  id: string
  event_id: string
  member_id: string
  team: 'A' | 'B'
  role: 'participant' | 'substitute'
  attendance: AttendanceStatus | null
  created_at: string
}
```

Replace with:

```ts
export interface StormRosterEntry {
  id: string
  event_id: string
  member_id: string
  team: 'A' | 'B'
  role: 'participant' | 'substitute' | 'requested'
  attendance: AttendanceStatus | null
  created_at: string
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (this type is only read elsewhere, not yet written with `'requested'`, so widening it is backward compatible).

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(storm): widen StormRosterEntry.role to include 'requested'"
```

---

### Task 3: `useStormEvent` — promote-in-place `addMember`, `teamPower` role filter, `isAdmin` param

**Files:**
- Modify: `src/hooks/useStormEvent.ts:23` (hook signature)
- Modify: `src/hooks/useStormEvent.ts:122-143` (`addMember`)
- Modify: `src/hooks/useStormEvent.ts:163-171` (`teamPower` computation)
- Modify: `src/components/StormPage.tsx:219` (call site — must pass `isAdmin`, already destructured at `StormPage.tsx:202`)

**Interfaces:**
- Consumes: `StormRosterEntry.role` now includes `'requested'` (Task 2).
- Produces: `useStormEvent(config: StormConfig, isAdmin: boolean)` — new required second parameter, consumed by Task 4 (carry-forward, same file) and the `StormPage.tsx` call site updated in this task. `addMember(memberId: string, team: 'A' | 'B', role: 'participant' | 'substitute' | 'requested'): Promise<void>` — new widened `role` param, consumed by Task 5 (`StormPage.tsx` Requested zone `+Add`).

- [ ] **Step 1: Widen `addMember`'s `role` param and add promote-in-place logic**

Find (around `src/hooks/useStormEvent.ts:122-143`):

```ts
  async function addMember(
    memberId: string,
    team: 'A' | 'B',
    role: 'participant' | 'substitute'
  ): Promise<void> {
    let eventId = data.event?.id
    if (!eventId) {
      const { data: newEvent, error } = await supabase
        .from('storm_events')
        .insert({ event_type: config.eventType, week_start: weekStart })
        .select('id')
        .single()
      if (error) throw error
      eventId = newEvent.id
    }
    const initialAttendance: AttendanceStatus | null = role === 'participant' ? 'present' : null
    const { error } = await supabase
      .from('storm_roster')
      .insert({ event_id: eventId, member_id: memberId, team, role, attendance: initialAttendance })
    if (error) throw error
    await fetchData()
  }
```

Replace with:

```ts
  async function addMember(
    memberId: string,
    team: 'A' | 'B',
    role: 'participant' | 'substitute' | 'requested'
  ): Promise<void> {
    let eventId = data.event?.id
    if (!eventId) {
      const { data: newEvent, error } = await supabase
        .from('storm_events')
        .insert({ event_type: config.eventType, week_start: weekStart })
        .select('id')
        .single()
      if (error) throw error
      eventId = newEvent.id
    }
    const initialAttendance: AttendanceStatus | null = role === 'participant' ? 'present' : null
    const existingRequest = data.roster.find(
      r => r.member_id === memberId && r.role === 'requested'
    )
    if (existingRequest) {
      const { error } = await supabase
        .from('storm_roster')
        .update({ team, role, attendance: initialAttendance })
        .eq('id', existingRequest.id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('storm_roster')
        .insert({ event_id: eventId, member_id: memberId, team, role, attendance: initialAttendance })
      if (error) throw error
    }
    await fetchData()
  }
```

This means: if the member already has a `'requested'` row for this week's event, adding them to a team (or re-adding them to the Requested zone under a different team) updates that same row instead of inserting a duplicate — the `UNIQUE (event_id, member_id)` constraint would reject a second row for the same member anyway.

- [ ] **Step 2: Exclude `'requested'` rows from `teamPower`**

Find (around `src/hooks/useStormEvent.ts:163-171`):

```ts
  // Compute team power from current week's roster
  const teamPower = { A: 0, B: 0 }
  for (const entry of data.roster) {
    const member = data.members.find(m => m.id === entry.member_id)
    if (member && member.THP != null) {
      if (entry.team === 'A') teamPower.A += member.THP
      else teamPower.B += member.THP
    }
  }
```

Replace with:

```ts
  // Compute team power from current week's roster (excludes not-yet-selected 'requested' rows)
  const teamPower = { A: 0, B: 0 }
  for (const entry of data.roster) {
    if (entry.role === 'requested') continue
    const member = data.members.find(m => m.id === entry.member_id)
    if (member && member.THP != null) {
      if (entry.team === 'A') teamPower.A += member.THP
      else teamPower.B += member.THP
    }
  }
```

- [ ] **Step 3: Add the `isAdmin` parameter to the hook signature**

Find (around `src/hooks/useStormEvent.ts:23`):

```ts
export function useStormEvent(config: StormConfig) {
```

Replace with:

```ts
export function useStormEvent(config: StormConfig, isAdmin: boolean) {
```

- [ ] **Step 4: Update the call site in `StormPage.tsx`**

Find (around `src/components/StormPage.tsx:219`, inside the destructuring block that starts at line 203):

```tsx
  } = useStormEvent(config)
```

Replace with:

```tsx
  } = useStormEvent(config, isAdmin)
```

(`isAdmin` is already destructured from `useAuth()` at `StormPage.tsx:202`, above this call.)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (The `isAdmin` param isn't read yet inside `useStormEvent.ts` — that's Task 4. `tsconfig.json` doesn't set `noUnusedParameters`, so this won't error.)

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useStormEvent.ts src/components/StormPage.tsx
git commit -m "feat(storm): promote-in-place addMember, exclude requested rows from teamPower"
```

---

### Task 4: `useStormEvent` — automatic carry-forward of not-selected requesters

**Files:**
- Modify: `src/hooks/useStormEvent.ts:1-13` (add `addDays` helper)
- Modify: `src/hooks/useStormEvent.ts:39-116` (`fetchData` — carry-forward logic)

**Interfaces:**
- Consumes: `useStormEvent(config, isAdmin)` signature (Task 3); `StormRosterEntry` with widened `role` (Task 2).
- Produces: nothing new consumed by later tasks — this closes out the hook's data-layer work.

- [ ] **Step 1: Add an `addDays` helper next to `getSundayDate`**

Find (around `src/hooks/useStormEvent.ts:7-13`):

```ts
function getSundayDate(offsetWeeks = 0): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - today.getDay() + offsetWeeks * 7)
  return sunday.toISOString().slice(0, 10)
}
```

Add directly below it:

```ts
function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
```

- [ ] **Step 2: Add the carry-forward logic inside `fetchData`**

Find (around `src/hooks/useStormEvent.ts:64-73`):

```ts
      if (membersError) throw membersError
      if (eventError) throw eventError
      if (historicError) throw historicError

      const members = (membersData ?? []) as Member[]
      const event = eventData as StormEvent | null
      const historicEventList = (historicEventsData ?? []) as StormEvent[]

      // Fetch current week's roster (only if event exists)
      let roster: StormRosterEntry[] = []
```

Replace with:

```ts
      if (membersError) throw membersError
      if (eventError) throw eventError
      if (historicError) throw historicError

      const members = (membersData ?? []) as Member[]
      let event = eventData as StormEvent | null
      const historicEventList = (historicEventsData ?? []) as StormEvent[]

      // Carry forward last week's not-selected requesters into this week, once,
      // the first time this (still-eventless) current week is loaded by an admin.
      if (!event && weekOffset === 0 && isAdmin) {
        const prevWeekStart = addDays(weekStart, -7)
        const { data: prevEventData, error: prevEventError } = await supabase
          .from('storm_events')
          .select('*')
          .eq('event_type', config.eventType)
          .eq('week_start', prevWeekStart)
          .maybeSingle()
        if (prevEventError) throw prevEventError

        if (prevEventData) {
          const { data: prevRosterData, error: prevRosterError } = await supabase
            .from('storm_roster')
            .select('*')
            .eq('event_id', prevEventData.id)
            .eq('role', 'requested')
          if (prevRosterError) throw prevRosterError

          const notSelected = (prevRosterData ?? []) as StormRosterEntry[]
          if (notSelected.length > 0) {
            const { data: newEvent, error: newEventError } = await supabase
              .from('storm_events')
              .insert({ event_type: config.eventType, week_start: weekStart })
              .select('*')
              .single()
            if (newEventError) throw newEventError
            event = newEvent as StormEvent

            const { error: carryError } = await supabase.from('storm_roster').insert(
              notSelected.map(r => ({
                event_id: event!.id,
                member_id: r.member_id,
                team: r.team,
                role: 'requested',
                attendance: null,
              }))
            )
            if (carryError) throw carryError
          }
        }
      }

      // Fetch current week's roster (only if event exists)
      let roster: StormRosterEntry[] = []
```

- [ ] **Step 3: Add `weekOffset` and `isAdmin` to the `fetchData` dependency array**

Find (around `src/hooks/useStormEvent.ts:116`, the end of the `fetchData` `useCallback`):

```ts
  }, [config.eventType, weekStart])
```

Replace with:

```ts
  }, [config.eventType, weekStart, weekOffset, isAdmin])
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Attempt manual verification, document if infeasible**

This requires a real Supabase connection to exercise end-to-end (create a `'requested'` row for last week with no matching roster entry, then load the current week as admin and confirm it's carried forward, then confirm reloading again — or deleting the carried row and reloading — doesn't duplicate/resurrect it via the `storm_events` unique-constraint gate).

Check `ls .env.local` — if it errors "No such file", there are no Supabase credentials in this environment and `npm run dev` cannot authenticate or load real data. State that clearly in your report rather than claiming this was verified.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useStormEvent.ts
git commit -m "feat(storm): auto-carry-forward not-selected requesters into next week"
```

---

### Task 5: `StormPage.tsx` — "Requested, not selected" zone in `TeamPanel`

**Files:**
- Modify: `src/components/StormPage.tsx:53-56` (`AddingTo` interface)
- Modify: `src/components/StormPage.tsx:78-83` (participants/substitutes computation — add `requested`)
- Modify: `src/components/StormPage.tsx:89-132` (add `renderRequestedRow`, after `renderRow`)
- Modify: `src/components/StormPage.tsx:171-191` (add the Requested zone, after the Substitutes section)
- Modify: `src/components/StormPage.tsx:476-479` (modal title role ternary)
- Modify: `src/locales/en.json`, `src/locales/es.json`, `src/locales/pt-BR.json`, `src/locales/ko.json` (three new `storm` namespace keys each)

**Interfaces:**
- Consumes: `addMember(memberId, team, role: 'participant' | 'substitute' | 'requested')` (Task 3).
- Produces: `TeamPanel` now renders a third zone; `AddingTo.role` widened — consumed by Task 6 only insofar as History rendering must stay consistent with what this task establishes (no direct code dependency).

- [ ] **Step 1: Widen `AddingTo.role`**

Find (around `src/components/StormPage.tsx:53-56`):

```tsx
interface AddingTo {
  team: 'A' | 'B'
  role: 'participant' | 'substitute'
}
```

Replace with:

```tsx
interface AddingTo {
  team: 'A' | 'B'
  role: 'participant' | 'substitute' | 'requested'
}
```

- [ ] **Step 2: Compute the sorted `requested` list in `TeamPanel`**

Find (around `src/components/StormPage.tsx:78-83`):

```tsx
  const participants = roster
    .filter(r => r.team === team && r.role === 'participant')
    .sort((a, b) => compareMembersByRankThenName(getMember(a.member_id), getMember(b.member_id)))
  const substitutes = roster
    .filter(r => r.team === team && r.role === 'substitute')
    .sort((a, b) => compareMembersByRankThenName(getMember(a.member_id), getMember(b.member_id)))
```

Replace with:

```tsx
  const participants = roster
    .filter(r => r.team === team && r.role === 'participant')
    .sort((a, b) => compareMembersByRankThenName(getMember(a.member_id), getMember(b.member_id)))
  const substitutes = roster
    .filter(r => r.team === team && r.role === 'substitute')
    .sort((a, b) => compareMembersByRankThenName(getMember(a.member_id), getMember(b.member_id)))
  const requested = roster
    .filter(r => r.team === team && r.role === 'requested')
    .sort((a, b) => compareMembersByRankThenName(getMember(a.member_id), getMember(b.member_id)))
```

- [ ] **Step 3: Add `renderRequestedRow`, right after `renderRow`'s closing brace**

Find (around `src/components/StormPage.tsx:130-133`, the end of `renderRow` and the blank line before the component's `return`):

```tsx
      </div>
    )
  }

  return (
```

Replace with:

```tsx
      </div>
    )
  }

  function renderRequestedRow(entry: StormRosterEntry) {
    const member = getMember(entry.member_id)
    return (
      <div
        key={entry.id}
        className="flex items-center justify-between py-1.5 border-b border-game-accent last:border-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-white text-sm font-medium truncate">{member?.name ?? '—'}</span>
          <span className="text-gray-400 text-xs shrink-0">{member?.Rank}</span>
          {member?.THP != null && (
            <span className="text-gray-400 text-xs shrink-0">
              {formatNumber(member.THP)}
            </span>
          )}
        </div>
        {isAdmin && !isPastWeek && (
          <button
            onClick={() => onRemove(entry.id)}
            className="text-gray-500 hover:text-game-highlight text-lg leading-none px-1 transition-colors shrink-0"
            aria-label={t('storm.removeMemberAriaLabel')}
          >
            ×
          </button>
        )}
      </div>
    )
  }

  return (
```

Note: `'requested'` rows never carry an attendance value (always `null`), so this row has no attendance pill and no cycle-attendance handler — just identity info and, for admins, a remove button.

- [ ] **Step 4: Add the Requested zone after the Substitutes section**

Find (around `src/components/StormPage.tsx:171-193`):

```tsx
      {/* Substitutes — only shown when config.substituteCap > 0 */}
      {config.substituteCap > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 uppercase tracking-wide">{t('storm.substitutesLabel')}</span>
            {isAdmin && !isPastWeek && substitutes.length < config.substituteCap && (
              <button
                onClick={() => onAdd({ team, role: 'substitute' })}
                className="text-xs text-game-standard border border-game-standard rounded px-2 py-0.5 hover:bg-game-standard hover:text-white transition-colors"
              >
                {t('common.addButton')}
              </button>
            )}
          </div>
          {substitutes.length === 0 ? (
            <p className="text-gray-600 text-xs italic">{t('storm.noSubstitutesAssigned')}</p>
          ) : (
            substitutes.map(renderRow)
          )}
        </div>
      )}
    </div>
  )
}
```

Replace with:

```tsx
      {/* Substitutes — only shown when config.substituteCap > 0 */}
      {config.substituteCap > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 uppercase tracking-wide">{t('storm.substitutesLabel')}</span>
            {isAdmin && !isPastWeek && substitutes.length < config.substituteCap && (
              <button
                onClick={() => onAdd({ team, role: 'substitute' })}
                className="text-xs text-game-standard border border-game-standard rounded px-2 py-0.5 hover:bg-game-standard hover:text-white transition-colors"
              >
                {t('common.addButton')}
              </button>
            )}
          </div>
          {substitutes.length === 0 ? (
            <p className="text-gray-600 text-xs italic">{t('storm.noSubstitutesAssigned')}</p>
          ) : (
            substitutes.map(renderRow)
          )}
        </div>
      )}

      {/* Requested, not selected — uncapped; hidden entirely for non-admins when empty */}
      {(isAdmin || requested.length > 0) && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 uppercase tracking-wide">{t('storm.requestedLabel')}</span>
            {isAdmin && !isPastWeek && (
              <button
                onClick={() => onAdd({ team, role: 'requested' })}
                className="text-xs text-game-standard border border-game-standard rounded px-2 py-0.5 hover:bg-game-standard hover:text-white transition-colors"
              >
                {t('common.addButton')}
              </button>
            )}
          </div>
          {requested.length === 0 ? (
            isAdmin && <p className="text-gray-600 text-xs italic">{t('storm.noRequestsRecorded')}</p>
          ) : (
            requested.map(renderRequestedRow)
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Extend the modal title role ternary**

Find (around `src/components/StormPage.tsx:476-479`):

```tsx
                {t('storm.addToTeamTitle', {
                  team: addingTo.team,
                  role: addingTo.role === 'participant' ? t('storm.participantRole') : t('storm.substituteRole'),
                })}
```

Replace with:

```tsx
                {t('storm.addToTeamTitle', {
                  team: addingTo.team,
                  role:
                    addingTo.role === 'participant'
                      ? t('storm.participantRole')
                      : addingTo.role === 'substitute'
                        ? t('storm.substituteRole')
                        : t('storm.requestedRole'),
                })}
```

- [ ] **Step 6: Add three new translation keys to all four locale files**

In each locale file, find the `storm` namespace and add the new keys directly after `"substituteRole"` (before `"noShowCount_one"`/`"noShowCount_other"`), matching each file's existing style:

`src/locales/en.json`:
```json
    "requestedLabel": "Requested",
    "noRequestsRecorded": "No requests recorded",
    "requestedRole": "Requested",
```

`src/locales/es.json`:
```json
    "requestedLabel": "Solicitados",
    "noRequestsRecorded": "Ninguna solicitud registrada",
    "requestedRole": "Solicitado",
```

`src/locales/pt-BR.json`:
```json
    "requestedLabel": "Solicitados",
    "noRequestsRecorded": "Nenhuma solicitação registrada",
    "requestedRole": "Solicitado",
```

`src/locales/ko.json`:
```json
    "requestedLabel": "요청됨",
    "noRequestsRecorded": "기록된 요청이 없습니다",
    "requestedRole": "요청됨",
```

After editing, validate all four files are still well-formed JSON:

```bash
for f in src/locales/en.json src/locales/es.json src/locales/pt-BR.json src/locales/ko.json; do
  python3 -c "import json,sys; json.load(open('$f')); print('$f OK')"
done
```

Expected output: `OK` for all four files.

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Attempt manual verification, document if infeasible**

Try: `npm run dev`, sign in as admin, open Desert Storm, use `+Add` under the new "Requested" zone on Team A to add a member, confirm they appear there with just Name/Rank/THP and a `×` (no attendance pill). Then use `+Add` under Team A's Participants for that same member; confirm they move into Participants and disappear from Requested (single row updated, not duplicated — check there's no leftover Requested entry). Confirm the Requested zone doesn't affect the participant/substitute cap count or Total Team Power. Confirm a non-admin view shows the Requested zone read-only (no `+`/`×`) when non-empty, and hides it entirely when empty.

If this worktree has no `.env.local` (check with `ls .env.local`), this cannot be exercised — state that clearly in your report.

Stop the dev server if you started it.

- [ ] **Step 9: Commit**

```bash
git add src/components/StormPage.tsx src/locales/en.json src/locales/es.json src/locales/pt-BR.json src/locales/ko.json
git commit -m "feat(storm): add Requested, not selected zone to team panels"
```

---

### Task 6: `StormPage.tsx` — History view: exclude requested from summaries, add per-team requested list

**Files:**
- Modify: `src/components/StormPage.tsx:349-365` (`teamAttendanceSummary`, `teamPowerFor` — exclude `role === 'requested'`; add `teamRequestedSummary`)
- Modify: `src/components/StormPage.tsx:382-392` (collapsed card header — show requested count when present)
- Modify: `src/components/StormPage.tsx:397-441` (expanded section — split assigned roster from requested list)
- Modify: `src/locales/en.json`, `src/locales/es.json`, `src/locales/pt-BR.json`, `src/locales/ko.json` (one new `storm` namespace key each)

**Interfaces:**
- Consumes: `StormRosterEntry.role` including `'requested'` (Task 2); `t('storm.requestedLabel')` (Task 5, already added to all four locale files).
- Produces: nothing consumed by other tasks — this is the last UI task.

- [ ] **Step 1: Fix `teamAttendanceSummary`/`teamPowerFor` and add `teamRequestedSummary`**

Find (around `src/components/StormPage.tsx:349-365`):

```tsx
            function teamAttendanceSummary(team: 'A' | 'B'): string {
              const tRoster = evRoster.filter(r => r.team === team)
              const present = tRoster.filter(
                r => r.attendance === 'present' || r.attendance === 'subbed_in'
              ).length
              const noShow = tRoster.filter(r => r.attendance === 'no_show').length
              return t('storm.assignedSummary', { count: tRoster.length, present, noShow })
            }

            function teamPowerFor(team: 'A' | 'B'): number {
              return evRoster
                .filter(r => r.team === team)
                .reduce((sum, r) => {
                  const m = members.find(mb => mb.id === r.member_id)
                  return sum + (m?.THP ?? 0)
                }, 0)
            }
```

Replace with:

```tsx
            function teamAttendanceSummary(team: 'A' | 'B'): string {
              const tRoster = evRoster.filter(r => r.team === team && r.role !== 'requested')
              const present = tRoster.filter(
                r => r.attendance === 'present' || r.attendance === 'subbed_in'
              ).length
              const noShow = tRoster.filter(r => r.attendance === 'no_show').length
              return t('storm.assignedSummary', { count: tRoster.length, present, noShow })
            }

            function teamPowerFor(team: 'A' | 'B'): number {
              return evRoster
                .filter(r => r.team === team && r.role !== 'requested')
                .reduce((sum, r) => {
                  const m = members.find(mb => mb.id === r.member_id)
                  return sum + (m?.THP ?? 0)
                }, 0)
            }

            function teamRequestedSummary(team: 'A' | 'B'): string {
              const count = evRoster.filter(r => r.team === team && r.role === 'requested').length
              return t('storm.requestedNotSelectedCount', { count })
            }
```

- [ ] **Step 2: Show the requested count in the collapsed card header**

Find (around `src/components/StormPage.tsx:382-392`):

```tsx
                  <div className="grid grid-cols-2 gap-2">
                    {(['A', 'B'] as const).map(team => (
                      <div key={team}>
                        <p className="text-xs text-gray-500 font-semibold">{t('storm.teamLabel', { team })}</p>
                        <p className="text-xs text-gray-300">{teamAttendanceSummary(team)}</p>
                        <p className="text-xs text-gray-400">
                          {formatNumber(teamPowerFor(team))} {t('storm.thpUnit')}
                        </p>
                      </div>
                    ))}
                  </div>
```

Replace with:

```tsx
                  <div className="grid grid-cols-2 gap-2">
                    {(['A', 'B'] as const).map(team => (
                      <div key={team}>
                        <p className="text-xs text-gray-500 font-semibold">{t('storm.teamLabel', { team })}</p>
                        <p className="text-xs text-gray-300">{teamAttendanceSummary(team)}</p>
                        <p className="text-xs text-gray-400">
                          {formatNumber(teamPowerFor(team))} {t('storm.thpUnit')}
                        </p>
                        {evRoster.some(r => r.team === team && r.role === 'requested') && (
                          <p className="text-xs text-gray-500">{teamRequestedSummary(team)}</p>
                        )}
                      </div>
                    ))}
                  </div>
```

- [ ] **Step 3: Split the expanded per-team roster from the requested list**

Find (around `src/components/StormPage.tsx:397-441`):

```tsx
                    {(['A', 'B'] as const).map(team => {
                      const tRoster = evRoster.filter(r => r.team === team)
                      return (
                        <div key={team}>
                          <p className="text-xs text-game-primary font-semibold mb-1">{t('storm.teamLabel', { team })}</p>
                          {tRoster.length === 0 ? (
                            <p className="text-gray-600 text-xs italic">{t('storm.noMembersRecorded')}</p>
                          ) : (
                            tRoster.map(entry => {
                              const m = members.find(mb => mb.id === entry.member_id)
                              return (
                                <div
                                  key={entry.id}
                                  className="flex items-center justify-between py-1 border-b border-game-accent last:border-0"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-white text-sm truncate">
                                      {m?.name ?? '—'}
                                    </span>
                                    <span className="text-gray-400 text-xs shrink-0">
                                      {m?.Rank}
                                    </span>
                                    {m?.THP != null && (
                                      <span className="text-gray-400 text-xs shrink-0">
                                        {formatNumber(m.THP)}
                                      </span>
                                    )}
                                    {entry.role === 'substitute' && (
                                      <span className="text-gray-500 text-xs shrink-0">{t('storm.subBadge')}</span>
                                    )}
                                  </div>
                                  {entry.attendance && (
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${attendancePillClass(entry.attendance)}`}
                                    >
                                      {attendanceLabel(entry.attendance, t)}
                                    </span>
                                  )}
                                </div>
                              )
                            })
                          )}
                        </div>
                      )
                    })}
```

Replace with:

```tsx
                    {(['A', 'B'] as const).map(team => {
                      const tRoster = evRoster.filter(r => r.team === team && r.role !== 'requested')
                      const tRequested = evRoster.filter(r => r.team === team && r.role === 'requested')
                      return (
                        <div key={team}>
                          <p className="text-xs text-game-primary font-semibold mb-1">{t('storm.teamLabel', { team })}</p>
                          {tRoster.length === 0 ? (
                            <p className="text-gray-600 text-xs italic">{t('storm.noMembersRecorded')}</p>
                          ) : (
                            tRoster.map(entry => {
                              const m = members.find(mb => mb.id === entry.member_id)
                              return (
                                <div
                                  key={entry.id}
                                  className="flex items-center justify-between py-1 border-b border-game-accent last:border-0"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-white text-sm truncate">
                                      {m?.name ?? '—'}
                                    </span>
                                    <span className="text-gray-400 text-xs shrink-0">
                                      {m?.Rank}
                                    </span>
                                    {m?.THP != null && (
                                      <span className="text-gray-400 text-xs shrink-0">
                                        {formatNumber(m.THP)}
                                      </span>
                                    )}
                                    {entry.role === 'substitute' && (
                                      <span className="text-gray-500 text-xs shrink-0">{t('storm.subBadge')}</span>
                                    )}
                                  </div>
                                  {entry.attendance && (
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${attendancePillClass(entry.attendance)}`}
                                    >
                                      {attendanceLabel(entry.attendance, t)}
                                    </span>
                                  )}
                                </div>
                              )
                            })
                          )}
                          {tRequested.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{t('storm.requestedLabel')}</p>
                              {tRequested.map(entry => {
                                const m = members.find(mb => mb.id === entry.member_id)
                                return (
                                  <div
                                    key={entry.id}
                                    className="flex items-center gap-2 py-1 border-b border-game-accent last:border-0 min-w-0"
                                  >
                                    <span className="text-white text-sm truncate">{m?.name ?? '—'}</span>
                                    <span className="text-gray-400 text-xs shrink-0">{m?.Rank}</span>
                                    {m?.THP != null && (
                                      <span className="text-gray-400 text-xs shrink-0">
                                        {formatNumber(m.THP)}
                                      </span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
```

- [ ] **Step 4: Add one new translation key to all four locale files**

In each locale file, find the `storm` namespace and add the new key directly after `"assignedSummary"`, matching each file's existing style:

`src/locales/en.json`:
```json
    "requestedNotSelectedCount": "{{count}} requested, not selected",
```

`src/locales/es.json`:
```json
    "requestedNotSelectedCount": "{{count}} solicitados, no seleccionados",
```

`src/locales/pt-BR.json`:
```json
    "requestedNotSelectedCount": "{{count}} solicitados, não selecionados",
```

`src/locales/ko.json`:
```json
    "requestedNotSelectedCount": "{{count}}명 요청, 미선택",
```

After editing, validate all four files are still well-formed JSON:

```bash
for f in src/locales/en.json src/locales/es.json src/locales/pt-BR.json src/locales/ko.json; do
  python3 -c "import json,sys; json.load(open('$f')); print('$f OK')"
done
```

Expected output: `OK` for all four files.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Attempt manual verification, document if infeasible**

Try: `npm run dev`, sign in as admin, open History on Desert Storm for a week that has at least one `'requested'`-role row left over from earlier manual testing. Confirm the collapsed card shows a "requested, not selected" line only for teams that actually have one, confirm the count matches, and confirm expanding the card shows the assigned roster and the Requested sub-list as separate groups (no requested member mixed into the main list with a blank attendance badge). Confirm a week with zero `'requested'` rows shows no such line at all.

If this worktree has no `.env.local` (check with `ls .env.local`), this cannot be exercised — state that clearly in your report.

Stop the dev server if you started it.

- [ ] **Step 7: Commit**

```bash
git add src/components/StormPage.tsx src/locales/en.json src/locales/es.json src/locales/pt-BR.json src/locales/ko.json
git commit -m "feat(storm): show requested-not-selected members in History view"
```
