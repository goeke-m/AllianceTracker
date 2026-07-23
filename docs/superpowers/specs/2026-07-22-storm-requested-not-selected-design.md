# Storm "Requested, Not Selected" Tracking — Design Spec

**Date:** 2026-07-22
**Status:** Approved

## Overview

Desert Storm and Canyon Storm rosters (`src/components/StormPage.tsx`, `src/hooks/useStormEvent.ts`) currently only track members who were actually placed on a team (`storm_roster` rows with `role = 'participant' | 'substitute'`). There is no record of who asked to battle in-game but wasn't picked that week — the in-game request process itself has poor historical visibility, and today the only way to "carry" an unselected member forward is to manually re-add them the following week, which leaves no trace of what happened.

This feature adds a per-team "Requested, not selected" list to each week's roster. It remains fully admin-managed: members request to battle in-game as they do today (out of band), and an admin transcribes that into the app. The app's job is purely to track the outcome (selected vs. not) and automatically carry forward anyone left unselected into the following week, so admins have a clear week-over-week picture instead of losing that information at rollover.

Each team (A/B) runs at a different time of day, so a request is **for a specific team**, not team-agnostic — a member may have better availability for one team's time slot.

## Data Model

No new tables. Extend the existing `storm_roster` table:

- `role` CHECK constraint gains a third allowed value: `'requested'` (alongside existing `'participant'`, `'substitute'`).
- `team` stays `NOT NULL` for all roles, including `'requested'` — the request is always for a specific team.
- `attendance` stays `null` for `'requested'` rows; it's never cycled (attendance only applies once someone is actually placed on the roster).
- No change to the existing `UNIQUE (event_id, member_id)` constraint — this is what makes "promote in place" work (see below), since a member can never simultaneously have a `'requested'` row and a `'participant'`/`'substitute'` row for the same event.

```ts
// src/lib/types.ts
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

Migration: extend the `storm_roster_role_check` CHECK constraint in a new migration file under `supabase/migrations/`.

## Selection: Promote In Place

When an admin adds a member onto Team A/B via the existing `+Add` picker (Participants or Substitutes section), `addMember()` in `useStormEvent.ts` first checks whether a `storm_roster` row already exists for `(event_id, member_id)`:

- If it exists with `role = 'requested'`, `UPDATE` that row's `role`, `team`, and `attendance` (rather than inserting a new row). This normally means role changes from `'requested'` to `'participant'`/`'substitute'` on the same team they requested — but if the admin adds them via the *other* team's panel instead, `team` changes too. That's an intentional admin override, not blocked.
- If no row exists, `INSERT` as today.

This is what makes a promoted member "disappear" from the Requested zone and appear in Participants/Substitutes — no separate delete step, no duplicate-row risk (the unique constraint already prevents it).

Removing a member from the Requested zone (admin didn't end up giving them a slot, or they opted out) is a plain `DELETE` on that `storm_roster` row, same as today's `removeMember()`.

## Carry-Forward (Automatic on Rollover)

No new idempotency-marker table needed — the existing `UNIQUE (event_type, week_start)` constraint on `storm_events` is itself the one-time gate.

In `useStormEvent.fetchData()`, when the hook is loading the **current** week (`weekOffset === 0`) for an **admin** user and no `storm_events` row exists yet for `(event_type, weekStart)`:

1. Look up last week's event (`week_start = weekStart - 7d`) for the same `event_type`.
2. If it exists, take its roster rows still at `role = 'requested'` — by definition, anyone who *was* selected got promoted out of `'requested'` in place (see above), so whatever's left in that state is exactly "requested, not selected."
3. Create this week's `storm_events` row, then insert those members as new `role = 'requested'` rows on the new event, preserving their `team`.
4. Continue the normal fetch, which now picks up the carried-forward rows.

Because event creation is gated by the unique constraint, this can only run once per `(event_type, week_start)` — even if an admin later deletes some or all of the carried-over rows, the event row persists and the carry-forward won't re-fire on a subsequent page load.

Non-admin viewers never attempt this path (writes would fail RLS anyway); they simply see whatever already exists for the week.

If last week had zero `'requested'`-state rows, no event is auto-created just for this check — the current lean behavior (no `storm_events` row until something actually happens that week) is preserved.

## UI/UX

Each `TeamPanel` (`StormPage.tsx`) gains a third zone, alongside the existing Participants and Substitutes zones:

**Requested, not selected**
- Uncapped list of member rows: Name · Rank · THP, sorted rank-desc/name-asc (same `compareMembersByRankThenName` helper already used for the other zones).
- Admin-only `+ Add` button opens the same member-picker modal pattern used for Participants/Substitutes (search box, already-assigned members grayed out), scoped to this team and this role.
- Admin-only `×` remove button per row.
- Non-admins see the list read-only (name/rank/THP, no controls) when non-empty; hidden entirely when empty. This keeps the backlog visible to everyone without exposing edit controls.
- Disabled for past weeks, matching the existing rule that roster changes (add/remove) are admin-only and only allowed on the current week.

No new "promote" button — promotion happens by using the existing Participants/Substitutes `+Add` flow, which transparently updates the existing `'requested'` row in place if one exists for that member.

**History view:** each past week's card gains a "Requested, not selected" count per team (e.g. "3 requested, not selected"), expandable to the member list, computed from that week's `role = 'requested'` rows in the already-fetched `historicEvents` data — no new query shape required.

## Side Effects to Handle in Implementation

- `teamPower` computation in `useStormEvent.ts` currently sums THP per team without filtering by role; it should explicitly exclude `role === 'requested'` rows (they aren't part of the active roster's power total).
- `TeamPanel`'s existing `participants`/`substitutes` filters (`role === 'participant'` / `role === 'substitute'`) already naturally exclude `'requested'` rows — no change needed there beyond adding the new `requested` filter.
- `noShowCounts` computation already keys off `attendance === 'no_show'`; since `'requested'` rows always have `attendance = null`, they're naturally excluded — no change needed.

## Access Control

Unchanged from existing Storm pages: all authenticated users get read access; admin-only writes (add/remove requested members, and the automatic carry-forward insert) via the existing RLS policies on `storm_roster` (no new policies needed — the extended `role` CHECK is the only schema change, and RLS is column-agnostic).

## Files to Create / Modify

| File | Action |
|---|---|
| `supabase/migrations/<timestamp>_storm_roster_requested_role.sql` | Create — extend `storm_roster_role_check` CHECK constraint |
| `src/lib/types.ts` | Modify — extend `StormRosterEntry.role` union |
| `src/hooks/useStormEvent.ts` | Modify — promote-in-place logic in `addMember`, carry-forward logic in `fetchData`, `teamPower` role filter |
| `src/components/StormPage.tsx` | Modify — add "Requested, not selected" zone to `TeamPanel`, extend member-picker usage, extend History view cards |
| `src/locales/en.json`, `es.json`, `pt-BR.json`, `ko.json` | Modify — new translation keys under `storm` namespace (e.g. `requestedSectionTitle`, `requestedNotSelected`, `addRequestFailed`, `removeRequestFailed`) |

## Testing

No existing automated test coverage for `StormPage.tsx`/`useStormEvent.ts` (consistent with prior Storm changes). Manual verification in the running dev app, for both Desert Storm and Canyon Storm:

- Add a member to a team's "Requested" zone; confirm it appears under that team, sorted correctly, and doesn't count toward the participant/substitute cap or Total Team Power.
- Use the normal `+Add` under Participants for a member who's currently in that team's Requested zone; confirm they move into Participants (single row updated, not duplicated) and disappear from Requested.
- Add the same requested member via the *other* team's Participants `+Add`; confirm their team reassigns correctly and they still disappear from the original team's Requested zone.
- Remove a member from Requested via `×`; confirm the row is deleted and they don't reappear.
- With one or more members left in a team's Requested zone at week's end, navigate to the following week (or wait for date rollover) as an admin; confirm those members auto-appear in the correct team's Requested zone for the new week, and that a `storm_events` row was created for the new week even though no team member was manually added yet.
- As an admin, delete a carried-over Requested entry, then reload the page; confirm it does **not** reappear (idempotency via the `storm_events` unique constraint).
- View the app as a non-admin; confirm Requested zones are read-only (visible when non-empty, no `+Add`/`×` controls) and no writes are attempted.
- Expand a past week in History; confirm the "Requested, not selected" count and member list per team match that week's `role = 'requested'` rows.
- Confirm past-week Requested zones (on the live roster view, not History) are non-editable, consistent with existing past-week roster rules.
