# Storm Roster Sort + Add-Member Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the Storm roster page, sort each team's Participants/Substitutes lists by rank descending then name ascending, and add a live "contains" search box to the add-member picker modal.

**Architecture:** Two independent edits to `src/components/StormPage.tsx` (a pure sort-comparator addition, and a search-input + filtered-list addition), plus translation-key additions across all four locale files for the search feature's new UI strings. No new files, no backend/schema changes.

**Tech Stack:** React + TypeScript, Vite, Tailwind CSS, react-i18next. No test runner is configured in this repo (`package.json` has no `test` script) — verification is `tsc --noEmit` plus manual exercise of the running dev app, consistent with prior Storm-page work (see `docs/superpowers/specs/2026-07-20-storm-roster-sort-and-member-search-design.md`, Testing section). Note: this worktree has no `.env.local` (no Supabase credentials configured), so the dev app cannot authenticate or load real data here — manual verification of runtime behavior is not possible in this environment and should be flagged, not skipped silently.

## Global Constraints

- No automated test coverage exists for `StormPage.tsx` — do not introduce a new test framework or files; verify via `tsc --noEmit`.
- Do not touch the History view (`StormPage.tsx:315-424`), the add/remove/attendance-cycle logic, the no-show badge, or the already-assigned graying-out behavior.
- The rank sort applies only to the Team A/B panel lists (`TeamPanel`'s `participants`/`substitutes`) — the add-member picker modal's list stays name-sorted (from the existing DB query) and is only filtered, never re-sorted, by this plan.
- No new shared/exported rank-parsing utility — add a local helper in `StormPage.tsx`, matching the existing pattern of independent local `rankNum`-style helpers already in `wad.ts:4` and `MemberManager.tsx:90`.
- No debounce on the search input — a plain controlled input re-filtering every keystroke is sufficient at this app's roster size.
- All four locale files (`src/locales/en.json`, `es.json`, `pt-BR.json`, `ko.json`) must stay in parity — any new user-facing string added to one must be added, translated, to all four.
- Both tasks are independent of each other; either can be done first.

---

### Task 1: Sort team roster lists by rank descending, then name ascending

**Files:**
- Modify: `src/components/StormPage.tsx:34-41` (add helper functions after `attendanceLabel`)
- Modify: `src/components/StormPage.tsx:68-69` (`TeamPanel`'s participants/substitutes computation)

**Interfaces:**
- Consumes: `Member` type (already imported at `StormPage.tsx:8`); `TeamPanel`'s existing `getMember(memberId: string): Member | undefined` (defined at `StormPage.tsx:71-73`, a hoisted function declaration — callable before its textual definition within the same component function).
- Produces: two new module-level helpers, `rankNum(rank: string | undefined): number` and `compareMembersByRankThenName(a: Member | undefined, b: Member | undefined): number` — not consumed by Task 2, no interface contract to preserve for it.

- [ ] **Step 1: Add the two sort helper functions**

In `src/components/StormPage.tsx`, immediately after the `attendanceLabel` function (ends around line 41, right before the blank line and `interface AddingTo`):

```tsx
function attendanceLabel(attendance: AttendanceStatus | null, t: TFunction): string {
  switch (attendance) {
    case 'present': return t('storm.present')
    case 'no_show': return t('storm.noShow')
    case 'subbed_in': return t('storm.subbedIn')
    default: return '—'
  }
}
```

Add directly below it:

```tsx
function rankNum(rank: string | undefined): number {
  return rank ? parseInt(rank.slice(1), 10) : 0
}

function compareMembersByRankThenName(a: Member | undefined, b: Member | undefined): number {
  const rankDiff = rankNum(b?.Rank) - rankNum(a?.Rank)
  if (rankDiff !== 0) return rankDiff
  return (a?.name ?? '').localeCompare(b?.name ?? '')
}
```

- [ ] **Step 2: Sort the participants and substitutes lists in `TeamPanel`**

Find this block (around lines 68-69):

```tsx
  const participants = roster.filter(r => r.team === team && r.role === 'participant')
  const substitutes = roster.filter(r => r.team === team && r.role === 'substitute')
```

Replace with:

```tsx
  const participants = roster
    .filter(r => r.team === team && r.role === 'participant')
    .sort((a, b) => compareMembersByRankThenName(getMember(a.member_id), getMember(b.member_id)))
  const substitutes = roster
    .filter(r => r.team === team && r.role === 'substitute')
    .sort((a, b) => compareMembersByRankThenName(getMember(a.member_id), getMember(b.member_id)))
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Attempt manual verification, document if infeasible**

Try: `npm run dev`, sign in as admin, navigate to Desert Storm and Canyon Storm, confirm Participants/Substitutes render R5 first through R1 last, alphabetized within same rank.

If this worktree has no `.env.local` (check with `ls .env.local` — if it errors "No such file", credentials are not configured), the app cannot authenticate or load real data, and this manual check cannot be performed. In that case, do not claim it was verified — state clearly in your report that it could not be exercised in this environment and why, matching how the prior Storm layout task's report was handled.

Stop the dev server if you started it.

- [ ] **Step 5: Commit**

```bash
git add src/components/StormPage.tsx
git commit -m "feat(storm): sort team rosters by rank descending, then name"
```

---

### Task 2: Add-member picker search + translations

**Files:**
- Modify: `src/components/StormPage.tsx:207-210` (add `memberSearch` state)
- Modify: `src/components/StormPage.tsx:212` (add `filteredMembers` derived list)
- Modify: `src/components/StormPage.tsx:214-224` and `:439` (add `handleOpenAdd`, wire it to `onAdd`)
- Modify: `src/components/StormPage.tsx:447-500` (member picker modal: search input, empty state, `filteredMembers` instead of `members`)
- Modify: `src/locales/en.json`, `src/locales/es.json`, `src/locales/pt-BR.json`, `src/locales/ko.json` (two new `storm` namespace keys each)

**Interfaces:**
- Consumes: `AddingTo` interface (already defined at `StormPage.tsx:43-46`); `Member` type; existing `members: Member[]` from `useStormEvent(config)`.
- Produces: `memberSearch` (state) and `filteredMembers` (derived array) are local to `StormPage` — not consumed by Task 1 or any other file.

- [ ] **Step 1: Add `memberSearch` state**

Find this block (around lines 207-210):

```tsx
  const [showHistory, setShowHistory] = useState(false)
  const [addingTo, setAddingTo] = useState<AddingTo | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null)
```

Add a new line after it:

```tsx
  const [showHistory, setShowHistory] = useState(false)
  const [addingTo, setAddingTo] = useState<AddingTo | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null)
  const [memberSearch, setMemberSearch] = useState('')
```

- [ ] **Step 2: Add `filteredMembers` and `handleOpenAdd`**

Find this line (around line 212):

```tsx
  const assignedMemberIds = new Set(roster.map(r => r.member_id))
```

Add directly below it:

```tsx
  const assignedMemberIds = new Set(roster.map(r => r.member_id))
  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(memberSearch.trim().toLowerCase())
  )

  function handleOpenAdd(to: AddingTo) {
    setAddingTo(to)
    setMemberSearch('')
  }
```

- [ ] **Step 3: Wire `handleOpenAdd` into the panel's `onAdd` prop**

Find this line (around line 439, inside the `<TeamPanel ... />` JSX):

```tsx
              onAdd={setAddingTo}
```

Replace with:

```tsx
              onAdd={handleOpenAdd}
```

- [ ] **Step 4: Add the search input and empty state to the picker modal**

Find this block (around lines 464-497):

```tsx
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
                          {formatNumber(m.THP)}
                        </span>
                      )}
                    </div>
                    {noShows > 0 && (
                      <span className="text-xs bg-red-900 text-red-300 px-1.5 py-0.5 rounded shrink-0 ml-2">
                        {t('storm.noShowCount', { count: noShows })}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
```

Replace with:

```tsx
            <div className="p-2 border-b border-game-accent">
              <input
                type="text"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                placeholder={t('storm.searchMembersPlaceholder')}
                autoFocus
                className="w-full bg-game-dark border border-game-accent rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-game-primary"
              />
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {filteredMembers.length === 0 ? (
                <p className="text-gray-600 text-xs italic text-center py-4">{t('storm.noMembersFound')}</p>
              ) : (
                filteredMembers.map(m => {
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
                            {formatNumber(m.THP)}
                          </span>
                        )}
                      </div>
                      {noShows > 0 && (
                        <span className="text-xs bg-red-900 text-red-300 px-1.5 py-0.5 rounded shrink-0 ml-2">
                          {t('storm.noShowCount', { count: noShows })}
                        </span>
                      )}
                    </button>
                  )
                })
              )}
            </div>
```

- [ ] **Step 5: Add the two new translation keys to all four locale files**

In each of `src/locales/en.json`, `src/locales/es.json`, `src/locales/pt-BR.json`, `src/locales/ko.json`, find the `storm` namespace object and add two new keys. Use `addToTeamTitle` as the anchor — insert the new keys directly after it (before `participantRole`) in each file, matching that file's existing quoting/escaping style:

`en.json`, inside `"storm": { ... }`, after the `"addToTeamTitle"` entry:
```json
    "searchMembersPlaceholder": "Search members…",
    "noMembersFound": "No members found",
```

`es.json`, same position:
```json
    "searchMembersPlaceholder": "Buscar miembros…",
    "noMembersFound": "No se encontraron miembros",
```

`pt-BR.json`, same position:
```json
    "searchMembersPlaceholder": "Buscar membros…",
    "noMembersFound": "Nenhum membro encontrado",
```

`ko.json`, same position:
```json
    "searchMembersPlaceholder": "멤버 검색…",
    "noMembersFound": "멤버를 찾을 수 없습니다",
```

After editing, validate all four files are still well-formed JSON:

```bash
for f in src/locales/en.json src/locales/es.json src/locales/pt-BR.json src/locales/ko.json; do
  python3 -c "import json,sys; json.load(open('$f')); print('$f OK')"
done
```

Expected output: `OK` for all four files, no `json.decoder.JSONDecodeError`.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Attempt manual verification, document if infeasible**

Try: `npm run dev`, sign in as admin, open the add-member modal on Desert Storm, type a partial member name (any case), confirm the list narrows live; clear it and confirm the full list returns; type a nonsense query and confirm the "No members found" state renders; close and reopen the modal and confirm the search box is empty again.

If this worktree has no `.env.local` (check with `ls .env.local`), this cannot be exercised — state that clearly in your report rather than claiming it passed, matching how the prior Storm layout task's report was handled.

Stop the dev server if you started it.

- [ ] **Step 8: Commit**

```bash
git add src/components/StormPage.tsx src/locales/en.json src/locales/es.json src/locales/pt-BR.json src/locales/ko.json
git commit -m "feat(storm): add live search to add-member picker"
```
