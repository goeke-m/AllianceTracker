# Storm Events Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Desert Storm and Canyon Storm event tracking pages with A/B team rosters, attendance recording, rolling no-show history, and a shared config-driven component.

**Architecture:** Two Supabase tables (`storm_events`, `storm_roster`) with an `event_type` discriminator serve both events. A single `useStormEvent(config)` hook and shared `StormPage` component handle all UI; `DesertStorm.tsx` and `CanyonStorm.tsx` are thin wrappers that pass config. All write operations are admin-gated.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Supabase (PostgreSQL + RLS). No frontend test framework is configured — verification is via TypeScript type checking (`npm run build`) and manual browser testing.

## Global Constraints

- All Supabase write operations gated by `(auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true` in RLS policies — match existing pattern from `scripts/demerits-migration.sql`
- Read access open to all `authenticated` users — match existing pattern
- Follow existing UI patterns: `bg-game-card`, `border-game-accent`, `text-game-gold`, `text-game-highlight`, `text-game-standard`, `bg-game-dark` Tailwind classes
- Loading state: `<p className="text-gray-400 animate-pulse">Charting the seas...</p>`
- Error state: `<p className="text-game-highlight text-sm">{error}</p>`
- All errors logged via `logError(context, err)` from `../lib/errorLog`
- Page padding: `className="p-4 pb-24"` (bottom padding for fixed NavBar)
- Week start = Sunday (the calendar Sunday when DS resets at 00:00 server time / 10 PM Eastern Saturday)

---

### Task 1: Database Migration

**Files:**
- Create: `scripts/storm-migration.sql`

**Interfaces:**
- Produces: `storm_events` table with columns `(id, event_type, week_start, notes, created_at)` and unique constraint on `(event_type, week_start)`; `storm_roster` table with columns `(id, event_id, member_id, team, role, attendance, created_at)`. RLS: authenticated read, admin write.

- [ ] **Step 1: Create the migration file**

```sql
-- Storm events tables (Desert Storm + Canyon Storm)
-- Run this in Supabase SQL Editor (Project > SQL Editor)

CREATE TABLE IF NOT EXISTS storm_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  text NOT NULL CHECK (event_type IN ('ds', 'canyon')),
  week_start  date NOT NULL,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_type, week_start)
);

CREATE TABLE IF NOT EXISTS storm_roster (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES storm_events(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  team        text NOT NULL CHECK (team IN ('A', 'B')),
  role        text NOT NULL CHECK (role IN ('participant', 'substitute')),
  attendance  text CHECK (attendance IN ('present', 'no_show', 'subbed_in')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE storm_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE storm_roster ENABLE ROW LEVEL SECURITY;

-- storm_events: authenticated read, admin write
CREATE POLICY "Authenticated users can read storm_events"
  ON storm_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert storm_events"
  ON storm_events FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can update storm_events"
  ON storm_events FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can delete storm_events"
  ON storm_events FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

-- storm_roster: authenticated read, admin write
CREATE POLICY "Authenticated users can read storm_roster"
  ON storm_roster FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert storm_roster"
  ON storm_roster FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can update storm_roster"
  ON storm_roster FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can delete storm_roster"
  ON storm_roster FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);
```

- [ ] **Step 2: Run the migration**

In Supabase dashboard → SQL Editor, paste and run `scripts/storm-migration.sql`. Confirm both tables appear in the Table Editor with the correct columns and RLS enabled.

- [ ] **Step 3: Commit**

```bash
git add scripts/storm-migration.sql
git commit -m "chore: add storm_events and storm_roster tables with RLS"
```

---

### Task 2: Types and Constants

**Files:**
- Modify: `src/lib/types.ts` (add storm types, extend `Page`)
- Modify: `src/lib/constants.ts` (add config objects)

**Interfaces:**
- Produces:
  - `StormEventType = 'ds' | 'canyon'`
  - `AttendanceStatus = 'present' | 'no_show' | 'subbed_in'`
  - `StormConfig { eventType, label, participantCap, substituteCap, attendanceStatuses }`
  - `StormEvent { id, event_type, week_start, notes?, created_at }`
  - `StormRosterEntry { id, event_id, member_id, team, role, attendance, created_at }`
  - `Page` extended with `'ds' | 'canyon'`
  - `DESERT_STORM_CONFIG: StormConfig`
  - `CANYON_STORM_CONFIG: StormConfig`

- [ ] **Step 1: Add storm types to `src/lib/types.ts`**

Append to the end of the file (after the `ErrorLogEntry` interface):

```ts
export type StormEventType = 'ds' | 'canyon'
export type AttendanceStatus = 'present' | 'no_show' | 'subbed_in'

export interface StormConfig {
  eventType: StormEventType
  label: string
  participantCap: number
  substituteCap: number
  attendanceStatuses: AttendanceStatus[]
}

export interface StormEvent {
  id: string
  event_type: StormEventType
  week_start: string // YYYY-MM-DD (Sunday — resets at 00:00 server time)
  notes?: string
  created_at: string
}

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

- [ ] **Step 2: Extend `Page` type in `src/lib/types.ts`**

Find and replace this line in `types.ts`:

```ts
export type Page = 'map' | 'schedule' | 'out' | 'admin' | 'tech' | 'kills' | 'friends';
```

Replace with:

```ts
export type Page = 'map' | 'schedule' | 'out' | 'admin' | 'tech' | 'kills' | 'friends' | 'ds' | 'canyon';
```

- [ ] **Step 3: Add config constants to `src/lib/constants.ts`**

Append to the end of the file:

```ts
import type { StormConfig } from './types'

export const DESERT_STORM_CONFIG: StormConfig = {
  eventType: 'ds',
  label: 'Desert Storm',
  participantCap: 20,
  substituteCap: 10,
  attendanceStatuses: ['present', 'no_show', 'subbed_in'],
}

export const CANYON_STORM_CONFIG: StormConfig = {
  eventType: 'canyon',
  label: 'Canyon Storm',
  participantCap: 20,
  substituteCap: 0,
  attendanceStatuses: ['present', 'no_show'],
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no TypeScript errors. Fix any type errors before continuing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/constants.ts
git commit -m "feat: add storm event types and config constants"
```

---

### Task 3: useStormEvent Hook

**Files:**
- Create: `src/hooks/useStormEvent.ts`

**Interfaces:**
- Consumes: `StormConfig` (from Task 2), `supabase` client, `logError`, `Member`, `StormEvent`, `StormRosterEntry`
- Produces: `useStormEvent(config, isAdmin)` returning `{ event, roster, members, noShowCounts, historicEvents, teamPower, weekStart, weekOffset, setWeekOffset, isPastWeek, loading, error, addMember, removeMember, updateAttendance, refresh }`
  - `event: StormEvent | null`
  - `roster: StormRosterEntry[]`
  - `members: Member[]`
  - `noShowCounts: Map<string, number>` — no-show count per member_id across last 6 events
  - `historicEvents: Array<{ event: StormEvent; roster: StormRosterEntry[] }>` — last 12 past events, newest first
  - `teamPower: { A: number; B: number }` — sum of THP for all roster entries per team
  - `weekStart: string` — YYYY-MM-DD of the Sunday being viewed
  - `weekOffset: number` — 0 = current week, negative = past, positive = future
  - `setWeekOffset: (n: number) => void`
  - `isPastWeek: boolean` — true when weekOffset < 0
  - `addMember(memberId, team, role): Promise<void>` — auto-creates event row if needed
  - `removeMember(rosterId): Promise<void>`
  - `updateAttendance(rosterId, attendance): Promise<void>`
  - `refresh(): Promise<void>`

- [ ] **Step 1: Create `src/hooks/useStormEvent.ts`**

```ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { logError } from '../lib/errorLog'
import type { Member, StormConfig, StormEvent, StormRosterEntry } from '../lib/types'

function getSundayDate(offsetWeeks = 0): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - today.getDay() + offsetWeeks * 7)
  return sunday.toISOString().slice(0, 10)
}

interface StormData {
  event: StormEvent | null
  roster: StormRosterEntry[]
  members: Member[]
  noShowCounts: Map<string, number>
  historicEvents: Array<{ event: StormEvent; roster: StormRosterEntry[] }>
}

export function useStormEvent(config: StormConfig, isAdmin: boolean) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [data, setData] = useState<StormData>({
    event: null,
    roster: [],
    members: [],
    noShowCounts: new Map(),
    historicEvents: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const weekStart = getSundayDate(weekOffset)
  const isPastWeek = weekOffset < 0

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [
        { data: membersData, error: membersError },
        { data: eventData, error: eventError },
        { data: historicEventsData, error: historicError },
      ] = await Promise.all([
        supabase.from('members').select('*').order('name'),
        supabase
          .from('storm_events')
          .select('*')
          .eq('event_type', config.eventType)
          .eq('week_start', weekStart)
          .maybeSingle(),
        supabase
          .from('storm_events')
          .select('*')
          .eq('event_type', config.eventType)
          .lt('week_start', weekStart)
          .order('week_start', { ascending: false })
          .limit(12),
      ])

      if (membersError) throw membersError
      if (eventError) throw eventError
      if (historicError) throw historicError

      const members = (membersData ?? []) as Member[]
      const event = eventData as StormEvent | null
      const historicEventList = (historicEventsData ?? []) as StormEvent[]

      // Fetch current week's roster (only if event exists)
      let roster: StormRosterEntry[] = []
      if (event) {
        const { data: rosterData, error: rosterError } = await supabase
          .from('storm_roster')
          .select('*')
          .eq('event_id', event.id)
        if (rosterError) throw rosterError
        roster = (rosterData ?? []) as StormRosterEntry[]
      }

      // Fetch historic roster for all past events
      let historicRosterAll: StormRosterEntry[] = []
      if (historicEventList.length > 0) {
        const { data: historicRosterData, error: historicRosterError } = await supabase
          .from('storm_roster')
          .select('*')
          .in('event_id', historicEventList.map(e => e.id))
        if (historicRosterError) throw historicRosterError
        historicRosterAll = (historicRosterData ?? []) as StormRosterEntry[]
      }

      // No-show counts from the last 6 past events only
      const last6Ids = new Set(historicEventList.slice(0, 6).map(e => e.id))
      const noShowCounts = new Map<string, number>()
      for (const entry of historicRosterAll) {
        if (entry.attendance === 'no_show' && last6Ids.has(entry.event_id)) {
          noShowCounts.set(entry.member_id, (noShowCounts.get(entry.member_id) ?? 0) + 1)
        }
      }

      // Group historic roster by event for the history view
      const historicEvents = historicEventList.map(ev => ({
        event: ev,
        roster: historicRosterAll.filter(r => r.event_id === ev.id),
      }))

      setData({ event, roster, members, noShowCounts, historicEvents })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load storm data')
      logError(`useStormEvent(${config.eventType}).fetchData`, err)
    } finally {
      setLoading(false)
    }
  }, [config.eventType, weekStart])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
    const { error } = await supabase
      .from('storm_roster')
      .insert({ event_id: eventId, member_id: memberId, team, role, attendance: null })
    if (error) throw error
    await fetchData()
  }

  async function removeMember(rosterId: string): Promise<void> {
    const { error } = await supabase.from('storm_roster').delete().eq('id', rosterId)
    if (error) throw error
    await fetchData()
  }

  async function updateAttendance(
    rosterId: string,
    attendance: string | null
  ): Promise<void> {
    const { error } = await supabase
      .from('storm_roster')
      .update({ attendance })
      .eq('id', rosterId)
    if (error) throw error
    await fetchData()
  }

  // Compute team power from current week's roster
  const teamPower = { A: 0, B: 0 }
  for (const entry of data.roster) {
    const member = data.members.find(m => m.id === entry.member_id)
    if (member?.THP) {
      if (entry.team === 'A') teamPower.A += member.THP
      else teamPower.B += member.THP
    }
  }

  return {
    ...data,
    teamPower,
    weekStart,
    weekOffset,
    setWeekOffset,
    isPastWeek,
    loading,
    error,
    addMember,
    removeMember,
    updateAttendance,
    refresh: fetchData,
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no new TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useStormEvent.ts
git commit -m "feat: add useStormEvent hook for storm event data and CRUD"
```

---

### Task 4: StormPage Shared Component

**Files:**
- Create: `src/components/StormPage.tsx`

**Interfaces:**
- Consumes: `useStormEvent` (Task 3), `useAuth`, `StormConfig`, `StormRosterEntry`, `AttendanceStatus`, `Member`
- Produces: `StormPage({ config: StormConfig })` — full-page React component

- [ ] **Step 1: Create `src/components/StormPage.tsx`**

```tsx
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useStormEvent } from '../hooks/useStormEvent'
import { logError } from '../lib/errorLog'
import type { AttendanceStatus, Member, StormConfig, StormRosterEntry } from '../lib/types'

function formatWeekStart(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${m}/${d}/${y.slice(2)}`
}

function nextAttendance(
  current: AttendanceStatus | null,
  statuses: AttendanceStatus[]
): AttendanceStatus | null {
  if (current === null) return statuses[0]
  const idx = statuses.indexOf(current)
  if (idx === statuses.length - 1) return null
  return statuses[idx + 1]
}

function attendancePillClass(attendance: AttendanceStatus | null): string {
  switch (attendance) {
    case 'present': return 'bg-green-700 text-white'
    case 'no_show': return 'bg-red-700 text-white'
    case 'subbed_in': return 'bg-blue-700 text-white'
    default: return 'bg-gray-700 text-gray-300'
  }
}

function attendanceLabel(attendance: AttendanceStatus | null): string {
  switch (attendance) {
    case 'present': return 'Present'
    case 'no_show': return 'No-show'
    case 'subbed_in': return 'Subbed In'
    default: return '—'
  }
}

interface AddingTo {
  team: 'A' | 'B'
  role: 'participant' | 'substitute'
}

interface TeamPanelProps {
  team: 'A' | 'B'
  config: StormConfig
  roster: StormRosterEntry[]
  members: Member[]
  totalPower: number
  isAdmin: boolean
  isPastWeek: boolean
  actionError: string | null
  onAdd: (to: AddingTo) => void
  onRemove: (rosterId: string) => void
  onCycleAttendance: (rosterId: string, current: AttendanceStatus | null) => void
}

function TeamPanel({
  team, config, roster, members, totalPower,
  isAdmin, isPastWeek, actionError,
  onAdd, onRemove, onCycleAttendance,
}: TeamPanelProps) {
  const participants = roster.filter(r => r.team === team && r.role === 'participant')
  const substitutes = roster.filter(r => r.team === team && r.role === 'substitute')

  function getMember(memberId: string): Member | undefined {
    return members.find(m => m.id === memberId)
  }

  function renderRow(entry: StormRosterEntry) {
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
              {member.THP.toLocaleString()}
            </span>
          )}
        </div>
        {isAdmin ? (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onCycleAttendance(entry.id, entry.attendance)}
              className={`text-xs px-2 py-0.5 rounded font-medium transition-opacity hover:opacity-80 ${attendancePillClass(entry.attendance)}`}
            >
              {attendanceLabel(entry.attendance)}
            </button>
            {!isPastWeek && (
              <button
                onClick={() => onRemove(entry.id)}
                className="text-gray-500 hover:text-game-highlight text-lg leading-none px-1 transition-colors"
                aria-label="Remove member"
              >
                ×
              </button>
            )}
          </div>
        ) : (
          entry.attendance && (
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${attendancePillClass(entry.attendance)}`}>
              {attendanceLabel(entry.attendance)}
            </span>
          )
        )}
      </div>
    )
  }

  return (
    <div className="bg-game-card border border-game-accent rounded-xl p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-game-gold font-bold">Team {team}</h2>
          <span className="text-gray-400 text-xs">
            {participants.length}/{config.participantCap}
            {config.substituteCap > 0 && ` · ${substitutes.length}/${config.substituteCap} subs`}
          </span>
        </div>
        <span className="text-xs text-gray-300">
          {totalPower > 0 ? `${totalPower.toLocaleString()} THP` : '—'}
        </span>
      </div>

      {actionError && <p className="text-game-highlight text-xs mb-2">{actionError}</p>}

      {/* Participants */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500 uppercase tracking-wide">Participants</span>
          {isAdmin && !isPastWeek && participants.length < config.participantCap && (
            <button
              onClick={() => onAdd({ team, role: 'participant' })}
              className="text-xs text-game-standard border border-game-standard rounded px-2 py-0.5 hover:bg-game-standard hover:text-white transition-colors"
            >
              + Add
            </button>
          )}
        </div>
        {participants.length === 0 ? (
          <p className="text-gray-600 text-xs italic">No participants assigned</p>
        ) : (
          participants.map(renderRow)
        )}
      </div>

      {/* Substitutes — only shown when config.substituteCap > 0 */}
      {config.substituteCap > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Substitutes</span>
            {isAdmin && !isPastWeek && substitutes.length < config.substituteCap && (
              <button
                onClick={() => onAdd({ team, role: 'substitute' })}
                className="text-xs text-game-standard border border-game-standard rounded px-2 py-0.5 hover:bg-game-standard hover:text-white transition-colors"
              >
                + Add
              </button>
            )}
          </div>
          {substitutes.length === 0 ? (
            <p className="text-gray-600 text-xs italic">No substitutes assigned</p>
          ) : (
            substitutes.map(renderRow)
          )}
        </div>
      )}
    </div>
  )
}

interface StormPageProps {
  config: StormConfig
}

export function StormPage({ config }: StormPageProps) {
  const { isAdmin } = useAuth()
  const {
    event: _event,
    roster,
    members,
    noShowCounts,
    historicEvents,
    teamPower,
    weekStart,
    weekOffset,
    setWeekOffset,
    isPastWeek,
    loading,
    error,
    addMember,
    removeMember,
    updateAttendance,
  } = useStormEvent(config, isAdmin)

  const [showHistory, setShowHistory] = useState(false)
  const [addingTo, setAddingTo] = useState<AddingTo | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null)

  const assignedMemberIds = new Set(roster.map(r => r.member_id))

  async function handleAddMember(memberId: string) {
    if (!addingTo) return
    setActionError(null)
    try {
      await addMember(memberId, addingTo.team, addingTo.role)
      setAddingTo(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to add member')
      logError(`StormPage(${config.eventType}).addMember`, err)
    }
  }

  async function handleRemoveMember(rosterId: string) {
    setActionError(null)
    try {
      await removeMember(rosterId)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to remove member')
      logError(`StormPage(${config.eventType}).removeMember`, err)
    }
  }

  async function handleCycleAttendance(rosterId: string, current: AttendanceStatus | null) {
    const next = nextAttendance(current, config.attendanceStatuses)
    setActionError(null)
    try {
      await updateAttendance(rosterId, next)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update attendance')
      logError(`StormPage(${config.eventType}).updateAttendance`, err)
    }
  }

  function handleToggleHistory() {
    setShowHistory(h => !h)
    setWeekOffset(0)
  }

  if (loading) {
    return (
      <div className="p-4 pb-24 flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-400 animate-pulse">Charting the seas...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 pb-24">
        <p className="text-game-highlight text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="p-4 pb-24">
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          {isAdmin && !showHistory && (
            <button
              onClick={() => setWeekOffset(weekOffset - 1)}
              className="text-gray-400 hover:text-white px-2 py-1 rounded transition-colors text-lg"
            >
              ‹
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-game-gold">{config.label}</h1>
            {!showHistory && (
              <p className="text-xs text-gray-400">
                Week of {formatWeekStart(weekStart)}
                {weekOffset === 0 && (
                  <span className="ml-1 text-game-gold font-semibold">· Current</span>
                )}
                {isPastWeek && <span className="ml-1 text-gray-500">(past)</span>}
              </p>
            )}
          </div>
          {isAdmin && !showHistory && (
            <button
              onClick={() => setWeekOffset(weekOffset + 1)}
              disabled={weekOffset >= 4}
              className="text-gray-400 hover:text-white px-2 py-1 rounded transition-colors text-lg disabled:opacity-30"
            >
              ›
            </button>
          )}
        </div>
        <button
          onClick={handleToggleHistory}
          className={`text-xs border rounded px-2 py-1 transition-colors ${
            showHistory
              ? 'border-game-gold text-game-gold'
              : 'border-gray-600 text-gray-400 hover:text-white'
          }`}
        >
          {showHistory ? 'Current Week' : 'History'}
        </button>
      </div>

      {showHistory ? (
        /* History view */
        <div className="space-y-2">
          {historicEvents.length === 0 && (
            <p className="text-gray-500 text-sm italic text-center mt-8">
              No past events recorded yet.
            </p>
          )}
          {historicEvents.map(({ event: ev, roster: evRoster }) => {
            const isExpanded = expandedWeek === ev.week_start

            function teamAttendanceSummary(t: 'A' | 'B'): string {
              const tRoster = evRoster.filter(r => r.team === t)
              const present = tRoster.filter(
                r => r.attendance === 'present' || r.attendance === 'subbed_in'
              ).length
              const noShow = tRoster.filter(r => r.attendance === 'no_show').length
              return `${tRoster.length} assigned · ${present} present · ${noShow} no-shows`
            }

            function teamPowerFor(t: 'A' | 'B'): number {
              return evRoster
                .filter(r => r.team === t)
                .reduce((sum, r) => {
                  const m = members.find(mb => mb.id === r.member_id)
                  return sum + (m?.THP ?? 0)
                }, 0)
            }

            return (
              <div
                key={ev.id}
                className="bg-game-card border border-game-accent rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedWeek(isExpanded ? null : ev.week_start)}
                  className="w-full p-3 text-left"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-game-gold font-semibold text-sm">
                      Week of {formatWeekStart(ev.week_start)}
                    </span>
                    <span className="text-gray-500 text-xs">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(['A', 'B'] as const).map(t => (
                      <div key={t}>
                        <p className="text-xs text-gray-500 font-semibold">Team {t}</p>
                        <p className="text-xs text-gray-300">{teamAttendanceSummary(t)}</p>
                        <p className="text-xs text-gray-400">
                          {teamPowerFor(t).toLocaleString()} THP
                        </p>
                      </div>
                    ))}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-game-accent px-3 pb-3 pt-2 space-y-3">
                    {(['A', 'B'] as const).map(t => {
                      const tRoster = evRoster.filter(r => r.team === t)
                      return (
                        <div key={t}>
                          <p className="text-xs text-game-gold font-semibold mb-1">Team {t}</p>
                          {tRoster.length === 0 ? (
                            <p className="text-gray-600 text-xs italic">No members recorded</p>
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
                                        {m.THP.toLocaleString()}
                                      </span>
                                    )}
                                    {entry.role === 'substitute' && (
                                      <span className="text-gray-500 text-xs shrink-0">Sub</span>
                                    )}
                                  </div>
                                  {entry.attendance && (
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${attendancePillClass(entry.attendance)}`}
                                    >
                                      {attendanceLabel(entry.attendance)}
                                    </span>
                                  )}
                                </div>
                              )
                            })
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* Current week view — Team A and Team B panels */
        <>
          {(['A', 'B'] as const).map(team => (
            <TeamPanel
              key={team}
              team={team}
              config={config}
              roster={roster}
              members={members}
              totalPower={team === 'A' ? teamPower.A : teamPower.B}
              isAdmin={isAdmin}
              isPastWeek={isPastWeek}
              actionError={actionError}
              onAdd={setAddingTo}
              onRemove={handleRemoveMember}
              onCycleAttendance={handleCycleAttendance}
            />
          ))}
        </>
      )}

      {/* Member picker modal */}
      {addingTo && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-game-card border border-game-accent rounded-2xl w-full max-w-md flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-game-accent">
              <h2 className="text-game-gold font-bold text-sm">
                Add to Team {addingTo.team} —{' '}
                {addingTo.role === 'participant' ? 'Participant' : 'Substitute'}
              </h2>
              <button
                onClick={() => setAddingTo(null)}
                className="text-gray-400 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {members.map(m => {
                const alreadyAssigned = assignedMemberIds.has(m.id)
                const noShows = noShowCounts.get(m.id) ?? 0
                return (
                  <button
                    key={m.id}
                    onClick={() => !alreadyAssigned && handleAddMember(m.id)}
                    disabled={alreadyAssigned}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                      alreadyAssigned
                        ? 'opacity-40 cursor-default'
                        : 'hover:bg-game-dark cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-white text-sm font-medium truncate">{m.name}</span>
                      <span className="text-gray-400 text-xs shrink-0">{m.Rank}</span>
                      {m.THP != null && (
                        <span className="text-gray-400 text-xs shrink-0">
                          {m.THP.toLocaleString()}
                        </span>
                      )}
                    </div>
                    {noShows > 0 && (
                      <span className="text-xs bg-red-900 text-red-300 px-1.5 py-0.5 rounded shrink-0 ml-2">
                        {noShows} no-show{noShows !== 1 ? 's' : ''}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no new TypeScript errors. The `_event` variable (prefixed with `_`) suppresses the unused-variable warning since we expose it via spread but don't use it directly in the component.

- [ ] **Step 3: Commit**

```bash
git add src/components/StormPage.tsx
git commit -m "feat: add StormPage shared component with team panels, picker modal, and history view"
```

---

### Task 5: Wire Up Pages, Navigation, and Routing

**Files:**
- Create: `src/pages/DesertStorm.tsx`
- Create: `src/pages/CanyonStorm.tsx`
- Modify: `src/components/NavBar.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `StormPage` (Task 4), `DESERT_STORM_CONFIG`, `CANYON_STORM_CONFIG` (Task 2)
- Produces: Two navigable pages accessible from the bottom nav bar

- [ ] **Step 1: Create `src/pages/DesertStorm.tsx`**

```tsx
import { StormPage } from '../components/StormPage'
import { DESERT_STORM_CONFIG } from '../lib/constants'

export function DesertStorm() {
  return <StormPage config={DESERT_STORM_CONFIG} />
}
```

- [ ] **Step 2: Create `src/pages/CanyonStorm.tsx`**

```tsx
import { StormPage } from '../components/StormPage'
import { CANYON_STORM_CONFIG } from '../lib/constants'

export function CanyonStorm() {
  return <StormPage config={CANYON_STORM_CONFIG} />
}
```

- [ ] **Step 3: Add tabs to `src/components/NavBar.tsx`**

Find the `tabs` array in `NavBar.tsx`:

```ts
const tabs: { id: Page; label: string; icon: string; adminOnly?: boolean }[] = [
  { id: 'schedule', label: 'Voyage Log', icon: '⚓' },
  { id: 'map', label: 'Treasure Map', icon: '🗺' },
  { id: 'tech', label: 'Ship Upgrades', icon: '⚔️' },
  { id: 'kills', label: 'Kill List', icon: '⚔️' },
  { id: 'friends', label: 'Friends', icon: '🤝' },
  { id: 'out', label: 'Shore Leave', icon: '🏝️', adminOnly: true },
  { id: 'admin', label: 'Captain', icon: '☠️', adminOnly: true },
]
```

Replace with:

```ts
const tabs: { id: Page; label: string; icon: string; adminOnly?: boolean }[] = [
  { id: 'schedule', label: 'Voyage Log', icon: '⚓' },
  { id: 'map', label: 'Treasure Map', icon: '🗺' },
  { id: 'tech', label: 'Ship Upgrades', icon: '⚔️' },
  { id: 'kills', label: 'Kill List', icon: '⚔️' },
  { id: 'friends', label: 'Friends', icon: '🤝' },
  { id: 'ds', label: 'Desert Storm', icon: '🏜️' },
  { id: 'canyon', label: 'Canyon Storm', icon: '🏔️' },
  { id: 'out', label: 'Shore Leave', icon: '🏝️', adminOnly: true },
  { id: 'admin', label: 'Captain', icon: '☠️', adminOnly: true },
]
```

- [ ] **Step 4: Add page routes and imports to `src/App.tsx`**

Add imports after the existing page imports:

```tsx
import { DesertStorm } from './pages/DesertStorm'
import { CanyonStorm } from './pages/CanyonStorm'
```

In the `safePage` guard line, find:

```ts
const safePage: Page = (page === 'admin' || page === 'out') && !isAdmin ? 'schedule' : page
```

This line already handles the non-admin redirect — `'ds'` and `'canyon'` are not admin-only, so no change needed here.

In the page content section, find the last page render line:

```tsx
{safePage === 'admin' && isAdmin && <AdminPanel />}
```

Add after it:

```tsx
{safePage === 'ds' && <DesertStorm />}
{safePage === 'canyon' && <CanyonStorm />}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 6: Start dev server and verify manually**

```bash
npm run dev
```

Open `http://localhost:5173` and verify:

1. "Desert Storm" and "Canyon Storm" tabs appear in the bottom nav
2. Navigating to Desert Storm shows two team panels (Team A, Team B) with "Current Week" label
3. Navigating to Canyon Storm shows the same panels but no Substitutes section
4. As admin: `‹` / `›` arrows appear; navigating to a past week disables `+ Add` but allows attendance cycling
5. `+ Add` opens the member picker with name · rank · THP visible; assigning a member closes the modal and adds them to the roster
6. A member assigned to Team A is grayed out in the picker when adding to Team B
7. Tapping the attendance pill cycles through statuses (DS: — → Present → No-show → Subbed In → —; Canyon: — → Present → No-show → —)
8. "History" toggle switches to the history view; past week cards expand to show full rosters
9. Total Team Power updates as members are added/removed
10. As non-admin: no `+ Add`, no `×`, no week navigation arrows; attendance pills are read-only labels

- [ ] **Step 7: Commit**

```bash
git add src/pages/DesertStorm.tsx src/pages/CanyonStorm.tsx src/components/NavBar.tsx src/App.tsx
git commit -m "feat: add Desert Storm and Canyon Storm pages with shared StormPage component"
```
