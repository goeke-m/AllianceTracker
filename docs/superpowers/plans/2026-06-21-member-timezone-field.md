# Member Timezone Field Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unused free-text `Availability` field on the member list with a `Timezone` field backed by a fixed dropdown of named UTC offsets.

**Architecture:** Rename the `Availability` column to `Timezone` (DB + TypeScript type), then swap the free-text `<input>` in `MemberManager.tsx`'s edit row for a `<select>` populated from a new static `TIMEZONES` const, following the same "store the display label directly" pattern already used for `Rank`/`S1_Type`/`S2_Type`.

**Tech Stack:** React + TypeScript, Supabase (Postgres), Vite. No test runner is configured in this repo (`npm run build` runs `tsc && vite build` and is the only automated check available).

## Global Constraints

- No new dependencies — this uses only plain React `<select>` and existing styling (`inputCls`).
- No sorting or filtering behavior for this field (the old `Availability` column had neither, per spec section 1).
- No DST-aware time logic — `TIMEZONES` values are static labels, not computed offsets, per spec section 3.
- Source of truth for design decisions: `docs/superpowers/specs/2026-06-21-member-timezone-design.md`.

---

### Task 1: Rename Availability → Timezone and convert to a dropdown

**Files:**
- Create: `scripts/timezone-migration.sql`
- Modify: `src/lib/types.ts:15`
- Modify: `scripts/seed-members.sql:7`
- Modify: `src/components/MemberManager.tsx` (multiple locations, listed in steps below)

**Interfaces:** None — this is a single-task plan, no cross-task interfaces.

- [ ] **Step 1: Write the DB migration script**

Create `scripts/timezone-migration.sql`:

```sql
-- Rename the unused free-text Availability column to Timezone.
-- Existing values are NULL in practice, so a plain rename preserves the column untouched.
ALTER TABLE members RENAME COLUMN "Availability" TO "Timezone";
```

- [ ] **Step 2: Rename the field in the `Member` type**

In `src/lib/types.ts`, change line 15:

```ts
  Availability?: string;
```
to:
```ts
  Timezone?: string;
```

- [ ] **Step 3: Update the seed script's column list**

In `scripts/seed-members.sql`, line 7, change:

```sql
INSERT INTO members (id, name, "Rank", "THP", "S1_Power", "S1_Type", "S2_Power", "S2_Type", "Strike_Team", "Availability", created_at, updated_at)
```
to:
```sql
INSERT INTO members (id, name, "Rank", "THP", "S1_Power", "S1_Type", "S2_Power", "S2_Type", "Strike_Team", "Timezone", created_at, updated_at)
```

(The `VALUES` rows already pass `NULL` for this column and the `ON CONFLICT ... DO UPDATE SET` clause never referenced this column, so no other line in this file changes.)

- [ ] **Step 4: Add the `TIMEZONES` const to `MemberManager.tsx`**

In `src/components/MemberManager.tsx`, immediately after line 14 (`const SQUAD_TYPES: SquadType[] = ['Tank', 'Air', 'Missile']`), add:

```ts
const TIMEZONES: string[] = [
  'Hawaii (UTC-10)',
  'Alaska (UTC-9)',
  'Pacific (UTC-8)',
  'Mountain (UTC-7)',
  'Central (UTC-6)',
  'Eastern (UTC-5)',
  'Atlantic (UTC-4)',
  'Brazil (UTC-3)',
  'UTC',
  'Central Europe (UTC+1)',
  'Eastern Europe (UTC+2)',
  'Moscow (UTC+3)',
  'Gulf (UTC+4)',
  'India (UTC+5:30)',
  'Bangladesh (UTC+6)',
  'Indochina (UTC+7)',
  'China/Singapore (UTC+8)',
  'Japan/Korea (UTC+9)',
  'Australia East (UTC+10)',
  'New Zealand (UTC+12)',
]
```

- [ ] **Step 5: Rename the field in `EditState`**

In `src/components/MemberManager.tsx`, in the `EditState` interface (around line 44), change:

```ts
  Strike_Team: boolean
  Availability: string
```
to:
```ts
  Strike_Team: boolean
  Timezone: string
```

- [ ] **Step 6: Update `memberToEditState`**

In `src/components/MemberManager.tsx`, in `memberToEditState` (around line 57), change:

```ts
    Strike_Team: m.Strike_Team ?? false,
    Availability: m.Availability ?? '',
```
to:
```ts
    Strike_Team: m.Strike_Team ?? false,
    Timezone: m.Timezone ?? '',
```

- [ ] **Step 7: Update `handleSave`**

In `src/components/MemberManager.tsx`, in `handleSave` (around line 214), change:

```ts
      Strike_Team: editState.Strike_Team,
      Availability: editState.Availability || null,
```
to:
```ts
      Strike_Team: editState.Strike_Team,
      Timezone: editState.Timezone || null,
```

- [ ] **Step 8: Replace the edit-row free-text input with a dropdown**

In `src/components/MemberManager.tsx`, around line 392, change:

```tsx
                  <td className="px-2 py-1.5">
                    <input type="text" value={editState.Availability} onChange={(e) => set('Availability', e.target.value)} placeholder="Availability" className={inputCls} />
                  </td>
```
to:
```tsx
                  <td className="px-2 py-1.5">
                    <select value={editState.Timezone} onChange={(e) => set('Timezone', e.target.value)} className={inputCls}>
                      <option value="">—</option>
                      {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                  </td>
```

- [ ] **Step 9: Rename the table header**

In `src/components/MemberManager.tsx`, around line 343, change:

```tsx
              <th className={thCls}>Availability</th>
```
to:
```tsx
              <th className={thCls}>Timezone</th>
```

- [ ] **Step 10: Update the read-only display cell**

In `src/components/MemberManager.tsx`, around line 420, change:

```tsx
                  <td className="px-3 py-2 text-gray-300 max-w-[160px] truncate" title={m.Availability ?? undefined}>{m.Availability ?? '—'}</td>
```
to:
```tsx
                  <td className="px-3 py-2 text-gray-300 max-w-[160px] truncate" title={m.Timezone ?? undefined}>{m.Timezone ?? '—'}</td>
```

- [ ] **Step 11: Verify the project builds cleanly**

Run: `npm run build`
Expected: Exits 0 with no TypeScript errors (this repo has no separate test command — `tsc` type-checking inside `build` is the available automated check). If `tsc` reports any remaining reference to `Availability`, find and fix it before proceeding.

- [ ] **Step 12: Run the DB migration against Supabase**

Run the SQL in `scripts/timezone-migration.sql` against the project's Supabase database (via the Supabase SQL editor or `psql`, matching how `game-uid-migration.sql` was applied — this project has no automated migration runner).
Expected: `ALTER TABLE` succeeds with no error; a `select "Timezone" from members limit 1;` confirms the column now exists under the new name.

- [ ] **Step 13: Manually verify in the dev server**

Run: `npm run dev`
In the browser, navigate to the Admin/Members page and confirm:
- The "Timezone" column header appears where "Availability" used to be.
- Clicking "Edit" on a member shows a dropdown with a blank `—` option followed by all 20 timezone entries.
- Selecting a value (e.g. `Eastern (UTC-5)`) and clicking "Save" persists it — the display cell shows the selected label.
- Refreshing the page still shows the saved value (confirms the DB write/read round-trip).
- Editing that member again, selecting the blank `—` option, and saving clears it back to `—` (confirms `null` is written, not the empty string).
- Add/Delete/filter/sort flows for other columns are unaffected.

- [ ] **Step 14: Commit**

```bash
git add scripts/timezone-migration.sql scripts/seed-members.sql src/lib/types.ts src/components/MemberManager.tsx
git commit -m "$(cat <<'EOF'
feat: replace member Availability field with Timezone dropdown

Rename the unused free-text Availability column to Timezone and
convert the edit input to a fixed dropdown of named UTC offsets.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```
