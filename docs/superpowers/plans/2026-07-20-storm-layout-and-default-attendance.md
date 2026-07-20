# Storm Side-by-Side Layout + Default Present Attendance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the Storm roster page (Desert Storm / Canyon Storm), render Team A and Team B side by side instead of stacked, and default newly-added participants to `present` attendance so admins only need to flag no-shows.

**Architecture:** Two independent, surgical edits to existing files — a Tailwind grid wrapper change in `StormPage.tsx` for layout, and a one-line conditional in `useStormEvent.ts`'s `addMember` for the attendance default. No new files, no data migration, no new dependencies.

**Tech Stack:** React + TypeScript, Vite, Tailwind CSS, Supabase client, react-i18next. No test runner is configured in this repo (`package.json` has no `test` script) — verification is `tsc` typecheck plus manual exercise of the running dev app (`npm run dev`), consistent with how this component area has always been verified (see `docs/superpowers/specs/2026-07-20-storm-layout-and-default-attendance-design.md`, Testing section).

## Global Constraints

- No automated test coverage exists for `StormPage.tsx` / `useStormEvent.ts` — do not introduce a new test framework or files; verify via `tsc --noEmit` and manual exercise in the dev server, per the spec.
- Do not touch `nextAttendance`, `attendancePillClass`, `attendanceLabel`, the History view, or the substitute add/cap logic — all out of scope per spec.
- Do not backfill existing roster rows — the attendance default change only affects rows inserted after this change ships.
- Both tasks are independent of each other; either can be done first.

---

### Task 1: Team A/B side-by-side grid layout

**Files:**
- Modify: `src/components/StormPage.tsx:121` (drop `TeamPanel`'s `mb-3`)
- Modify: `src/components/StormPage.tsx:426-444` (wrap current-week team map in a grid)

**Interfaces:**
- Consumes: existing `TeamPanel` component (`StormPage.tsx:62-180`) and its existing props — no signature changes.
- Produces: no new exports; purely a rendering change local to `StormPage`.

- [ ] **Step 1: Remove the now-redundant bottom margin from `TeamPanel`'s outer wrapper**

In `src/components/StormPage.tsx`, find this line (around line 121):

```tsx
    <div className="bg-game-card border border-game-accent rounded-xl p-3 mb-3">
```

Change it to:

```tsx
    <div className="bg-game-card border border-game-accent rounded-xl p-3">
```

- [ ] **Step 2: Wrap the current-week Team A/B map in a 2-column grid**

In the same file, find this block (around lines 426-444):

```tsx
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
```

Replace it with:

```tsx
        /* Current week view — Team A and Team B panels, side by side */
        <div className="grid grid-cols-2 gap-3">
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
        </div>
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (this is a JSX/className-only change, no type surface touched).

- [ ] **Step 4: Manually verify in the dev app**

Run: `npm run dev`, open the app, sign in as an admin, navigate to Desert Storm (and separately Canyon Storm).

Confirm:
- Team A and Team B panels render as two columns side by side (not stacked), with a single consistent gap between them and no doubled spacing above/below either panel.
- Panel content (member rows, add buttons, attendance pills) still reads cleanly at the narrower per-panel width — names truncate rather than overflow, attendance pills and remove buttons stay on one line.
- Toggle to the History view and confirm its existing 2-column team layout (`grid grid-cols-2 gap-2` block) is unchanged.
- Stop the dev server (Ctrl+C) once confirmed.

- [ ] **Step 5: Commit**

```bash
git add src/components/StormPage.tsx
git commit -m "feat(storm): render Team A and Team B side by side"
```

---

### Task 2: Default new participants to `present` attendance

**Files:**
- Modify: `src/hooks/useStormEvent.ts:122-142` (`addMember` function)

**Interfaces:**
- Consumes: `AttendanceStatus` type (already imported at `useStormEvent.ts:5`); `role: 'participant' | 'substitute'` parameter already on `addMember`.
- Produces: no signature change to `addMember` — same call sites in `StormPage.tsx` (`handleAddMember`) work unchanged.

- [ ] **Step 1: Compute the initial attendance value from `role` and use it in the insert**

In `src/hooks/useStormEvent.ts`, find `addMember` (around lines 122-142):

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
    const { error } = await supabase
      .from('storm_roster')
      .insert({ event_id: eventId, member_id: memberId, team, role, attendance: null })
    if (error) throw error
    await fetchData()
  }
```

Change the insert to compute attendance based on role:

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

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manually verify in the dev app**

Run: `npm run dev`, sign in as admin, navigate to Desert Storm.

Confirm:
- Adding a participant to Team A or B immediately shows a green "Present" pill on that row, with no manual click needed.
- Adding a substitute (Desert Storm has `substituteCap: 10`; Canyon Storm has `substituteCap: 0` so its substitute section won't appear) shows no attendance pill (still unset), same as before this change.
- Clicking a defaulted-present participant's attendance pill cycles it: Desert Storm `present → no_show → subbed_in → (blank/unset) → present`; Canyon Storm `present → no_show → (blank/unset) → present`.
- Stop the dev server (Ctrl+C) once confirmed.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useStormEvent.ts
git commit -m "feat(storm): default new participants to present attendance"
```
