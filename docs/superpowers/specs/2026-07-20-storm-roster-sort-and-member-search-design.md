# Storm Roster Sort + Add-Member Search Design Spec

**Date:** 2026-07-20
**Status:** Approved

## Overview

Two independent additions to the Storm roster page (`src/components/StormPage.tsx`), following up on the side-by-side layout / default-present-attendance change:

1. The Participants and Substitutes lists inside each Team A/B panel sort by rank descending (R5 → R1), then by name ascending, instead of insertion order.
2. The "add a member" picker modal gets a live, case-insensitive "contains" search box filtering the list by name, to make finding a specific member faster as the roster grows.

## 1. Scope

- **In scope:**
  - `TeamPanel`'s `participants`/`substitutes` computation (`StormPage.tsx:68-69`): sort by rank desc, name asc.
  - The member picker modal (`StormPage.tsx:447-500`): add a search input, filter the rendered list by substring match on name, add an empty-state message when the filter matches nothing, reset the search text each time the modal is opened.
  - Two new translation keys added to all four locale files (`src/locales/en.json`, `es.json`, `pt-BR.json`, `ko.json`) under the existing `storm` namespace, matching the repo's established full-locale-parity practice.
- **Out of scope / unchanged:**
  - The History view (`StormPage.tsx:315-424`) — its per-week roster lists are read-only summaries and are not touched.
  - The rank sort does **not** apply to the picker modal's list — that list stays name-sorted (as it already is, via the existing `.order('name')` Supabase query in `useStormEvent.ts`) and is only filtered, not re-sorted.
  - No new shared/exported rank-parsing utility — the codebase already has two independent local `rankNum`-style helpers (`wad.ts:4`, `MemberManager.tsx:90`), so a third local helper in `StormPage.tsx` follows the existing pattern rather than introducing a new cross-file dependency.
  - No debounce on the search input — the member list size in this app is small (alliance roster, not thousands of rows), so a plain controlled input re-filtering on every keystroke is sufficient.
  - No change to the "no-show count" badge, disabled/grayed-out styling for already-assigned members, or the add/remove/attendance-cycle logic.

## 2. Roster Sort (`StormPage.tsx`)

Add two module-level helper functions, alongside the existing helpers (`formatWeekStart`, `nextAttendance`, `attendancePillClass`, `attendanceLabel`):

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

In `TeamPanel`, change the participants/substitutes computation (`StormPage.tsx:68-69`) from:

```tsx
const participants = roster.filter(r => r.team === team && r.role === 'participant')
const substitutes = roster.filter(r => r.team === team && r.role === 'substitute')
```

to:

```tsx
const participants = roster
  .filter(r => r.team === team && r.role === 'participant')
  .sort((a, b) => compareMembersByRankThenName(getMember(a.member_id), getMember(b.member_id)))
const substitutes = roster
  .filter(r => r.team === team && r.role === 'substitute')
  .sort((a, b) => compareMembersByRankThenName(getMember(a.member_id), getMember(b.member_id)))
```

`getMember` (`StormPage.tsx:71-73`) is a function declaration inside `TeamPanel` and is therefore hoisted — calling it before its textual definition within the same component function is valid. `Member` is already imported (`StormPage.tsx:8`).

Rank values are `'R1'..'R5'` (`RankValue` in `lib/types.ts`); `rankNum` parses the trailing digit, so R5 sorts first (descending). A roster entry whose `member_id` doesn't resolve to a member (orphaned reference — not expected in practice, but `getMember` returns `undefined`) sorts as rank 0 (last) with an empty-string name, so it doesn't throw and lands at the bottom rather than corrupting the sort.

## 3. Add-Member Search (`StormPage.tsx`)

### State

Add a new piece of state in `StormPage`, alongside the existing `addingTo`/`actionError`/etc. state (`StormPage.tsx:207-210`):

```tsx
const [memberSearch, setMemberSearch] = useState('')
```

### Reset on open

The modal's "Add" buttons currently call `onAdd={setAddingTo}` directly (`StormPage.tsx:439`). Replace with a wrapper that also clears the search text, so reopening the modal never shows a stale filter from a previous session:

```tsx
function handleOpenAdd(to: AddingTo) {
  setAddingTo(to)
  setMemberSearch('')
}
```

Change `onAdd={setAddingTo}` to `onAdd={handleOpenAdd}` at `StormPage.tsx:439`.

### Filtered list

Add a derived list near the existing `assignedMemberIds` computation (`StormPage.tsx:212`):

```tsx
const filteredMembers = members.filter(m =>
  m.name.toLowerCase().includes(memberSearch.trim().toLowerCase())
)
```

### Modal UI

In the member picker modal (`StormPage.tsx:447-500`), insert a search input between the header block and the scrollable list block, and swap `members.map(...)` for `filteredMembers.map(...)` with an empty-state branch:

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
      // ...existing per-member button body, unchanged...
    })
  )}
</div>
```

The existing per-member `<button>` body (already-assigned graying, no-show badge, name/rank/THP display) is unchanged — only the source array (`filteredMembers` instead of `members`) and the wrapping empty-state check are new.

## 4. Translations

Add two new keys to the `storm` namespace in all four locale files:

| Key | en | es | pt-BR | ko |
|---|---|---|---|---|
| `searchMembersPlaceholder` | Search members… | Buscar miembros… | Buscar membros… | 멤버 검색… |
| `noMembersFound` | No members found | No se encontraron miembros | Nenhum membro encontrado | 멤버를 찾을 수 없습니다 |

Inserted alongside the existing `storm.*` keys (e.g. after `addToTeamTitle`/`participantRole`/`substituteRole`, before the attendance-status keys), matching the key ordering convention already used in `en.json`.

## 5. Error Handling

No new error paths. The sort is a pure client-side computation over already-fetched data (no new Supabase calls). The search filter is a pure client-side string match over already-fetched `members`.

## 6. Testing

No existing automated test coverage for `StormPage.tsx` (consistent with prior Storm-page changes). Manual verification in the running dev app, for both Desert Storm and Canyon Storm:

- Confirm Participants and Substitutes lists render R5 members first, then R4, R3, R2, R1, with same-rank members alphabetized by name.
- Add a new participant/substitute and confirm it lands in the correct sorted position (not appended at the end).
- Open the add-member modal, type a substring of a member's name (any case), confirm the list narrows to matching names live as you type.
- Clear the search box, confirm the full list returns.
- Type a query matching no member, confirm the "No members found" empty state renders instead of a blank list.
- Close and reopen the modal, confirm the search box is empty again (not showing the previous query).
- Confirm already-assigned members still appear grayed-out/disabled within filtered results, and the no-show badge still renders correctly.
- Confirm the History view is unaffected (still shows roster entries in their prior order, no sort/search applied).
