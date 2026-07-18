# Desert Storm Event Tracking — Design Spec

**Date:** 2026-07-18  
**Status:** Approved (updated to reflect shared architecture with Canyon Storm)

---

## Overview

A new page in AllianceTracker for managing weekly Desert Storm (DS) event participation. Admins build rosters, record attendance, and monitor no-show history. All users can view rosters and history in read-only mode.

Canyon Storm shares all infrastructure via a config-driven approach. See `2026-07-18-canyon-storm-tracking-design.md`.

---

## Shared Architecture

Both Desert Storm and Canyon Storm use a config-driven shared implementation:

- **Database:** `storm_events` and `storm_roster` tables with an `event_type` column (`'ds'` or `'canyon'`)
- **Hook:** `useStormEvent(config: StormConfig)` — parameterized by event type
- **Page component:** `src/components/StormPage.tsx` — shared UI, configured via props
- **Thin wrappers:** `src/pages/DesertStorm.tsx` and `src/pages/CanyonStorm.tsx`

### `StormConfig` type

```ts
export type StormEventType = 'ds' | 'canyon'
export type AttendanceStatus = 'present' | 'no_show' | 'subbed_in'

export interface StormConfig {
  eventType: StormEventType
  label: string          // e.g. "Desert Storm"
  participantCap: number // 20
  substituteCap: number  // 10 for DS, 0 for Canyon
  attendanceStatuses: AttendanceStatus[]
}
```

### Desert Storm config

```ts
export const DESERT_STORM_CONFIG: StormConfig = {
  eventType: 'ds',
  label: 'Desert Storm',
  participantCap: 20,
  substituteCap: 10,
  attendanceStatuses: ['present', 'no_show', 'subbed_in'],
}
```

---

## Data Model

### `storm_events` table

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `event_type` | text | `'ds'` or `'canyon'` |
| `week_start` | date | Sunday of the week (YYYY-MM-DD) — resets at 00:00 server time (10 PM Eastern Saturday night) |
| `notes` | text | Optional |
| `created_at` | timestamptz | |

**Unique constraint:** `(event_type, week_start)` — one event per type per week.

### `storm_roster` table

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `event_id` | uuid FK → storm_events | |
| `member_id` | uuid FK → members | |
| `team` | text | `'A'` or `'B'` |
| `role` | text | `'participant'` or `'substitute'` |
| `attendance` | text | `'present'`, `'no_show'`, `'subbed_in'`, or `null` (pre-event) |
| `created_at` | timestamptz | |

**Constraints:**
- Participant/substitute caps enforced client-side per config
- A member cannot be assigned to both Team A and Team B in the same event
- For Canyon Storm, `role` is always `'participant'` (no substitutes)

**No-show count** is computed client-side from the last 6 events of the same `event_type`.

**Migration file:** `scripts/storm-migration.sql`

---

## New Types (`src/lib/types.ts`)

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
  week_start: string // YYYY-MM-DD (Sunday)
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

`Page` union type extended to include `'ds'` and `'canyon'`.

---

## Page Structure

**Shared component:** `src/components/StormPage.tsx`  
**Wrapper pages:** `src/pages/DesertStorm.tsx`, `src/pages/CanyonStorm.tsx`  
**Hook:** `src/hooks/useStormEvent.ts`

### Navigation

Two new nav tabs:
- Page id `'ds'`, label "Desert Storm", icon `🏜️`
- Page id `'canyon'`, label "Canyon Storm", icon `🏔️`

Both visible to all users; admin-only controls conditionally rendered.

### Layout — Three Zones

**1. Week Header**
- Displays "Week of [date]" for the current week's `week_start`
- Prev `‹` / Next `›` navigation arrows (admin only)
- "History" toggle button (switches to history view)
- Non-admins see current week only (no navigation arrows)

**2. Two Team Panels (stacked vertically)**

Each panel (Team A, Team B) contains:
- **Panel header:** Team label · slot counter (e.g. `14 / 20 participants`) · Total Team Power (sum of all assigned members' THP, participants + substitutes)
- **Participants section** (up to `config.participantCap`): member rows + admin-only `+ Add` button
- **Substitutes section** (up to `config.substituteCap`, hidden if 0): member rows + admin-only `+ Add` button

**Member row displays:** Name · Rank · THP

**Admin member row additionally shows:**
- Attendance status pill (tappable to cycle through `config.attendanceStatuses`, plus `null`): `—` → `Present` → `No-show` → [`Subbed In` →] back to `—`
  - Colors: gray (null/pending) · green (present) · red (no-show) · blue (subbed_in)
- Remove `×` button

**3. History View (toggled)**

Scrollable list of past events, most recent first. Each week card shows:
- Week date
- Team A and Team B side by side: slot count + attendance summary (e.g. "18 present, 2 no-shows")
- Total Team Power for each team
- Tap to expand: full read-only roster (name · rank · THP · attendance status)

History is read-only. To correct past attendance, admin navigates back via week arrows on the main view.

---

## Member Assignment UX

### Adding a Member (admin only)

Tapping `+ Add` opens a member picker modal:
- Full member list, sorted by name
- Each row: **Name · Rank · THP · no-show badge** (e.g. `2 no-shows` in orange/red if > 0 in rolling 6 weeks for this event type)
- Members already assigned to either team this week are grayed out and non-selectable
- Tapping a member adds them and closes the modal

### Event Auto-Creation

When an admin adds the first member to a week with no existing event row, the `storm_events` row is created automatically. No manual "create event" step.

### Past Week Behavior

- Roster changes (add/remove members): disabled for past weeks
- Attendance status updates: allowed on past weeks (admin can record after the fact)

---

## Hook: `useStormEvent.ts`

Signature: `useStormEvent(config: StormConfig, isAdmin: boolean)`

Responsibilities:
- Derive `week_start` (current Sunday) and support week offset navigation (admin only)
- Fetch `storm_events` for the navigated week filtered by `event_type`
- Fetch `storm_roster` entries with member data for that event
- Fetch the last 6 events of the same `event_type` and their roster entries to compute per-member no-show counts
- Fetch full member list for the picker
- CRUD: upsert event + add roster entry, remove roster entry, update attendance status
- Expose: `event`, `roster`, `members`, `noShowCounts`, `teamPower`, `weekStart`, `weekOffset`, `setWeekOffset`, `loading`, `error`

---

## Access Control

- **All users:** read-only access to all views (current week and history)
- **Admins (`isAdmin`):** add/remove members, update attendance, navigate weeks
- RLS policies: read open to authenticated users; insert/update/delete restricted to admin role

---

## Files to Create / Modify

| File | Action |
|---|---|
| `scripts/storm-migration.sql` | Create — `storm_events` + `storm_roster` tables + RLS policies |
| `src/lib/types.ts` | Modify — add storm types, extend `Page` |
| `src/lib/constants.ts` | Modify — add `DESERT_STORM_CONFIG`, `CANYON_STORM_CONFIG` |
| `src/hooks/useStormEvent.ts` | Create |
| `src/components/StormPage.tsx` | Create — shared UI component |
| `src/pages/DesertStorm.tsx` | Create — thin wrapper |
| `src/pages/CanyonStorm.tsx` | Create — thin wrapper |
| `src/components/NavBar.tsx` | Modify — add DS and Canyon tabs |
| `src/App.tsx` | Modify — add DS and Canyon page routes |
