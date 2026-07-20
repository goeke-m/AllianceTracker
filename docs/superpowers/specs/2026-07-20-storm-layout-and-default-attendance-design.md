# Storm Side-by-Side Layout + Default Present Attendance Design Spec

**Date:** 2026-07-20
**Status:** Approved

## Overview

Two small UX changes to the Desert Storm / Canyon Storm roster page (`src/components/StormPage.tsx`, `src/hooks/useStormEvent.ts`), reported after real usage of the shipped feature:

1. Team A and Team B panels render side by side instead of stacked, so adding players to one team doesn't require scrolling past a full-height panel for the other team (the current stacked layout also scroll-resets the page on every save, which the side-by-side layout mitigates by keeping both panels short and visible).
2. Newly-added **participants** default to `attendance: 'present'` instead of `null`, so admins only need to flag the exceptions (no-shows), not mark every attendee individually. **Substitutes** keep the current unset/`null` default — they're only relevant once actually subbed in.

## 1. Scope

- **In scope:**
  - `StormPage.tsx`: change the current-week Team A/B rendering from stacked full-width panels to a 2-column grid.
  - `useStormEvent.ts`: `addMember` inserts `attendance: 'present'` when `role === 'participant'`, `attendance: null` when `role === 'substitute'` (unchanged for subs).
- **Out of scope / unchanged:**
  - Attendance cycle order and pill/label logic (`nextAttendance`, `attendancePillClass`, `attendanceLabel` in `StormPage.tsx`) — cycling from `present` to `no_show` already takes one click, which is exactly the "flag the exceptions" behavior wanted.
  - Existing roster rows already stored with `attendance: null` — no backfill/migration; this only changes behavior for newly-added participants going forward.
  - The History view's team layout — it already uses a 2-column grid (`grid grid-cols-2 gap-2`, `StormPage.tsx:359`) and is unaffected.
  - Substitute add flow, caps, and substitute panel layout/logic.
  - No responsive breakpoint is introduced — the grid applies at all widths, matching the precedent already set by the History view's team grid.

## 2. Layout Change (`StormPage.tsx`)

Current (`StormPage.tsx:427-444`): the current-week view maps `['A', 'B']` to two `TeamPanel`s each rendered as its own full-width block (`TeamPanel`'s own wrapper is `bg-game-card ... mb-3`, full width by default).

Change: wrap the `.map()` output in a `grid grid-cols-2 gap-3` container, replacing the outer `<>...</>` fragment:

```tsx
<div className="grid grid-cols-2 gap-3">
  {(['A', 'B'] as const).map(team => (
    <TeamPanel key={team} ... />
  ))}
</div>
```

`TeamPanel`'s own `mb-3` becomes redundant once it's a grid item with `gap-3` on the parent — drop `mb-3` from the panel's outer `className` (`StormPage.tsx:121`) to avoid doubled vertical spacing between grid rows (e.g. if content wraps to multiple rows on very small screens) while keeping the `gap-3` from the grid as the single source of spacing.

No changes to `TeamPanel`'s internal content, row rendering, or the add-member modal — the panel already handles narrow widths reasonably (row content uses `truncate`, `min-w-0`, `shrink-0` throughout).

## 3. Default Attendance Change (`useStormEvent.ts`)

Current (`useStormEvent.ts:122-142`):

```ts
async function addMember(
  memberId: string,
  team: 'A' | 'B',
  role: 'participant' | 'substitute'
): Promise<void> {
  ...
  const { error } = await supabase
    .from('storm_roster')
    .insert({ event_id: eventId, member_id: memberId, team, role, attendance: null })
  if (error) throw error
  await fetchData()
}
```

Change: compute the initial attendance based on `role` before the insert:

```ts
const initialAttendance: AttendanceStatus | null = role === 'participant' ? 'present' : null
const { error } = await supabase
  .from('storm_roster')
  .insert({ event_id: eventId, member_id: memberId, team, role, attendance: initialAttendance })
```

`AttendanceStatus` is already imported in this file. No change to the `updateAttendance` function, the `nextAttendance` cycle, or the roster picker modal (`StormPage.tsx`'s "Member picker modal" section) — a participant still shows as `present` immediately after being added, admins flip it to `no_show` (or, for Desert Storm, `subbed_in`) only for the exceptions.

## 4. Error Handling

No new error paths. Both changes reuse existing Supabase call sites (`addMember`'s existing try/catch in `StormPage.handleAddMember`) and existing render logic (`attendancePillClass`/`attendanceLabel` already handle `'present'` as a valid status — it's already reachable today via manual cycling, just not as the default).

## 5. Testing

No existing automated test coverage for `StormPage.tsx` / `useStormEvent.ts` (no test files in the repo for this feature). Manual verification in the running dev app, for both Desert Storm and Canyon Storm:

- Confirm Team A and Team B panels render side by side (2 columns) on the current-week view, with reasonable spacing and no doubled gaps.
- Confirm the History view's existing 2-column team layout is unaffected.
- Add a participant to Team A: confirm it appears immediately with a green "Present" pill (no click needed).
- Add a substitute (Desert Storm only, since Canyon Storm has `substituteCap: 0`): confirm it appears with no attendance pill (unset), same as before.
- Cycle a defaulted-present participant's attendance pill: confirm it still cycles `present → no_show → subbed_in → (unset) → present` (Desert Storm) or `present → no_show → (unset) → present` (Canyon Storm), unchanged from current behavior.
- Confirm removing a member and re-adding a different member still works normally within the new grid layout.
