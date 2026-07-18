# Desert Storm Event Tracking — Design Spec

**Date:** 2026-07-18  
**Status:** Approved

---

## Overview

A new page in AllianceTracker for managing weekly Desert Storm (DS) event participation. Admins build rosters, record attendance, and monitor no-show history. All users can view rosters and history in read-only mode.

---

## Data Model

### `ds_events` table

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `week_start` | date | Sunday of the DS week (YYYY-MM-DD), unique — DS resets Sunday 10 PM Eastern (00:00 Monday server time); Sunday date used as the week identifier |
| `notes` | text | Optional |
| `created_at` | timestamptz | |

### `ds_roster` table

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `event_id` | uuid FK → ds_events | |
| `member_id` | uuid FK → members | |
| `team` | text | `'A'` or `'B'` |
| `role` | text | `'participant'` or `'substitute'` |
| `attendance` | text | `'present'`, `'no_show'`, `'subbed_in'`, or `null` (pre-event) |
| `created_at` | timestamptz | |

**Constraints:**
- Max 20 participants and 10 substitutes per team (enforced client-side)
- A member cannot be assigned to both Team A and Team B in the same event
- `week_start` is unique in `ds_events`

**No-show count** is computed client-side from the last 6 `ds_events` — no extra column needed.

**Migration file:** `scripts/ds-migration.sql`

---

## New Types (`src/lib/types.ts`)

```ts
export interface DsEvent {
  id: string
  week_start: string // YYYY-MM-DD (Sunday — DS resets at 00:00 server time)
  notes?: string
  created_at: string
}

export interface DsRosterEntry {
  id: string
  event_id: string
  member_id: string
  team: 'A' | 'B'
  role: 'participant' | 'substitute'
  attendance: 'present' | 'no_show' | 'subbed_in' | null
  created_at: string
}
```

`Page` union type extended to include `'ds'`.

---

## Page Structure

**File:** `src/pages/DesertStorm.tsx`  
**Hook:** `src/hooks/useDesertStorm.ts`

### Navigation

New nav tab added to `NavBar`: page id `'ds'`, label "Desert Storm", icon `🏜️`. Visible to all users; admin-only controls conditionally rendered.

### Layout — Three Zones

**1. Week Header**
- Displays "Week of [date]" for the current week's `week_start`
- Prev `‹` / Next `›` navigation arrows (admin only)
- "History" toggle button (switches to history view)
- Non-admins see current week only (no navigation arrows)

**2. Two Team Panels (stacked vertically)**

Each panel (Team A, Team B) contains:
- **Panel header:** Team label · slot counter (e.g. `14 / 20 participants`) · Total Team Power (sum of all assigned members' THP, participants + substitutes)
- **Participants section** (up to 20): member rows + admin-only `+ Add` button
- **Substitutes section** (up to 10): member rows + admin-only `+ Add` button

**Member row displays:** Name · Rank · THP

**Admin member row additionally shows:**
- Attendance status pill (tappable to cycle): `—` → `Present` → `No-show` → `Subbed In` → `—`
  - Colors: gray (pending) · green (present) · red (no-show) · blue (subbed in)
- Remove `×` button

**3. History View (toggled)**

Scrollable list of past events, most recent first. Each week card shows:
- Week date
- Team A and Team B side by side: slot count + attendance summary (e.g. "18 present, 2 no-shows")
- Total Team Power for each team
- Tap to expand: full read-only roster (name · rank · THP · attendance status)

History is read-only. To correct past attendance, admin navigates back via week arrows in the main view.

---

## Member Assignment UX

### Adding a Member (admin only)

Tapping `+ Add` opens a member picker modal:
- Full member list, sorted by name
- Each row: **Name · Rank · THP · no-show badge** (e.g. `2 no-shows` in orange/red if > 0 in rolling 6 weeks)
- Members already assigned to either team this week are grayed out and non-selectable
- Tapping a member adds them and closes the modal

### Event Auto-Creation

When an admin adds the first member to a future week, the `ds_events` row is created automatically. No manual "create event" step.

### Past Week Behavior

- Roster changes (add/remove members): disabled for past weeks
- Attendance status updates: allowed on past weeks (admin can record after the fact)

---

## Hook: `useDesertStorm.ts`

Responsibilities:
- Fetch `ds_events` for the navigated week
- Fetch `ds_roster` entries joined with member data for that event
- Fetch the last 6 `ds_events` and their `ds_roster` entries to compute per-member no-show counts
- Fetch full member list for the picker
- CRUD: create event + add roster entry, remove roster entry, update attendance status
- Expose computed values: no-show counts map, team power totals

---

## Access Control

- **All users:** read-only access to all views (current week and history)
- **Admins (`isAdmin`):** add/remove members, update attendance, navigate weeks
- RLS policies on both tables: read open to authenticated users; insert/update/delete restricted to admin role (matching existing pattern)

---

## Files to Create / Modify

| File | Action |
|---|---|
| `scripts/ds-migration.sql` | Create — new tables + RLS policies |
| `src/lib/types.ts` | Modify — add `DsEvent`, `DsRosterEntry`, extend `Page` |
| `src/hooks/useDesertStorm.ts` | Create |
| `src/pages/DesertStorm.tsx` | Create |
| `src/components/NavBar.tsx` | Modify — add DS tab |
| `src/App.tsx` | Modify — add DS page route |
