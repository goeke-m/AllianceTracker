# Hero Power Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The owner uploads a saved lastwarrank.com alliance page (`.html`) on the admin Members tab, previews the THP changes, and applies them.

**Architecture:** The browser imports the existing `parseHeroPower`/`matchHeroPower` straight from `supabase/functions/sync-alliance-members/heropower.ts`, so there is one copy. That file is dependency-free TS, and Vite/tsc follow the relative import. A new pure helper builds the preview (changed / unchanged / not on page). A new `HeroPowerUpload` component renders the button, preview and apply, and `MemberManager` shows it only to the owner.

**Tech Stack:** React 18 + TypeScript, Vite, Vitest, Supabase JS client, react-i18next.

**Spec:** `docs/superpowers/specs/2026-11-25-hero-power-upload-design.md`

## Global Constraints

- Owner-only: render only when `syncUserId === OWNER_USER_ID` (same gate as the Sync button).
- Apply writes only `members.THP`, and only for members whose value changes. No name changes, inserts or deletes.
- One copy of the parsing/matching code: import from `supabase/functions/sync-alliance-members/heropower.ts`. Don't copy it into `src/`.
- Name matching ignores case, leading/trailing whitespace, and repeated internal whitespace.
- All new user-facing strings go in `src/locales/{en,es,ko,pt-BR}.json` under `members.heroPowerImport`.
- Tests are Vitest under `src/**/*.test.ts`. CI runs `npm test` and `npm run build`. The Deno tests are not run in CI.

## Review Focus

1. **Wrong file** (any other page, or a page with no members table): `parseHeroPower` throws. Show its message as an error, with no preview and no Apply. Pinned in Task 1 (throws) and Task 3 (UI shows the error).
2. **A different alliance's page:** it parses fine but matches nothing, or very little. The preview shows 0 changes, and Apply is disabled when there are no changes. Pinned in Task 2 (`changes` is empty → `[]`).
3. **Re-uploading the same file**, or a file whose values are all current: no writes, Apply disabled. Pinned in Task 2 (unchanged values are counted, not included in `changes`).
4. **Choosing the same file again after Cancel:** reset the file input's `value` so `onChange` fires again. Task 3 manual check.
5. **A partial failure during apply:** keep going, report "N updated, errors: …", and refresh the list anyway. Task 3.

---

### Task 1: Whitespace-tolerant name matching, covered by Vitest from `src`

**Files:**
- Modify: `supabase/functions/sync-alliance-members/heropower.ts` (the `normalize` const)
- Create: `src/lib/heroPower.test.ts`

**Interfaces:**
- Produces (unchanged signatures, imported by later tasks via `'../../supabase/functions/sync-alliance-members/heropower.ts'` from `src/lib/` and `'../../supabase/functions/sync-alliance-members/heropower.ts'` from `src/components/`):
  - `parseHeroPower(html: string): HeroPowerRow[]` (throws on a missing table or columns)
  - `matchHeroPower(rows: HeroPowerRow[], dbMembers: { id: string; name: string }[]): HeroPowerMatch`
  - types `HeroPowerRow { name; heroPower }`, `HeroPowerUpdate { dbId; THP }`, `HeroPowerMatch { updates; unmatched }`

- [ ] **Step 1: Write the failing tests** in `src/lib/heroPower.test.ts`. Build page HTML with a small helper, as in `heropower_test.ts` (header `['#','Commander','Rank','Country','Hero Power','Power','Base']`).
  - `parseHeroPower reads rows`: a page with `Tricky100original` / `284.48M` → `[{ name: 'Tricky100original', heroPower: 284480000 }]`
  - `parseHeroPower throws on a page without a members table`: `expect(() => parseHeroPower('<html><body>nope</body></html>')).toThrow(/no members table/)`
  - `matchHeroPower ignores repeated internal whitespace`: rows `[{ name: 'Chainsaw  Man', heroPower: 136770000 }]`, db `[{ id: 'a', name: 'chainsaw man' }]` → `updates` equals `[{ dbId: 'a', THP: 136770000 }]`, `unmatched` equals `[]`

- [ ] **Step 2: Run it and check that only the whitespace test fails**

Run: `npx vitest run src/lib/heroPower.test.ts`
Expected: 2 pass, the whitespace test fails (`unmatched: ['chainsaw man']`). If the import itself fails, fix the relative path before going on.

- [ ] **Step 3: Change `normalize`** to `name.trim().replace(/\s+/g, ' ').toLowerCase()`.

- [ ] **Step 4: Run the tests and the type check**

Run: `npx vitest run src/lib/heroPower.test.ts && npx tsc --noEmit`
Expected: 3 pass, and tsc exits 0.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/sync-alliance-members/heropower.ts src/lib/heroPower.test.ts
git commit -m "fix(heropower): match names ignoring repeated whitespace"
```

### Task 2: Preview builder

**Files:**
- Create: `src/lib/heroPowerImport.ts`, `src/lib/heroPowerImport.test.ts`

**Interfaces:**
- Consumes: `parseHeroPower`, `matchHeroPower` from Task 1.
- Produces:
  ```ts
  export interface HeroPowerChange { id: string; name: string; oldTHP: number | null; newTHP: number }
  export interface HeroPowerPreview {
    rowCount: number          // rows parsed from the page
    matchedCount: number      // DB members found on the page
    changes: HeroPowerChange[] // matched members whose THP differs, sorted by newTHP desc
    unmatched: string[]       // DB member names not on the page, sorted alphabetically
  }
  export function buildHeroPowerPreview(html: string, members: Pick<Member, 'id' | 'name' | 'THP'>[]): HeroPowerPreview
  ```
  It throws whatever `parseHeroPower` throws. `oldTHP` is `members[i].THP ?? null`.

- [ ] **Step 1: Write the failing tests** (reuse a page helper; members `A`(THP 100), `B`(THP 200000000), `C`(THP undefined), `D`(THP 5)):
  - page rows `A 150M`, `B 200M`, `C 1.5B`, `Stranger 99M` → `rowCount` 4, `matchedCount` 3, `changes` equals `[{id:C,name:'C',oldTHP:null,newTHP:1500000000},{id:A,name:'A',oldTHP:100,newTHP:150000000}]` (B is unchanged and left out), `unmatched` equals `['D']`
  - a page whose names match no member → `matchedCount` 0, `changes` `[]`
  - a non-alliance page → `toThrow(/no members table/)`

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/lib/heroPowerImport.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `buildHeroPowerPreview`** in `src/lib/heroPowerImport.ts` (parse → match → join updates back to members by id → keep those where `newTHP !== oldTHP`).

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/heroPowerImport.ts src/lib/heroPowerImport.test.ts
git commit -m "feat(members): build hero power import preview"
```

### Task 3: Upload UI, owner gate, locales, changelog

**Files:**
- Create: `src/components/HeroPowerUpload.tsx`
- Modify: `src/components/MemberManager.tsx` (header around line 258: wrap the Sync button and the new component in one owner-gated `flex gap-2` group)
- Modify: `src/locales/en.json`, `es.json`, `ko.json`, `pt-BR.json` (`members.heroPowerImport`)
- Modify: `CHANGELOG.md` (new `## 2026-11-25` → `### Added` entry)

**Interfaces:**
- Consumes: `buildHeroPowerPreview`, `HeroPowerPreview` from Task 2; `supabase` from `src/lib/supabase`; `logError` from `src/lib/errorLog`; `formatPower` (if it isn't exported from MemberManager, export it).
- Produces: `export function HeroPowerUpload({ members, onDone }: { members: Member[]; onDone: () => void })`

Behavior:
- The button (same classes as Sync) opens a hidden `<input type="file" accept=".html,.htm,text/html">`. On change: `await file.text()` → `buildHeroPowerPreview` → show the preview panel, or the thrown message as an error. Always reset `input.value = ''` afterwards.
- Preview panel (card style like the rest of MemberManager): summary line `rowCount / matchedCount / changes.length`; a list of changes `name: formatPower(old) → formatPower(new)`; a collapsed or small list of `unmatched` names labelled "not on page (THP kept)". The buttons are Apply, disabled when `changes.length === 0` or while applying, and Cancel.
- Apply: for each change, `supabase.from('members').update({ THP: newTHP }).eq('id', id)`. Collect errors and keep going. Then close the preview, call `onDone()`, and show a result line ("Updated N hero power values", plus errors if any). Log failures with `logError('HeroPowerUpload.apply', err)`.

English copy for `members.heroPowerImport`: `button` "Import Hero Power", `reading` "Reading…", `summary` "{{rows}} on page · {{matched}} matched · {{changes}} changes", `noChanges` "No hero power changes", `notOnPage` "Not on page (THP kept): {{names}}", `apply` "Apply", `applying` "Applying…", `cancel` "Cancel", `result` "Updated {{count}} hero power values", `errorsPrefix` "Import errors: {{errors}}". Translate these for es, ko and pt-BR.

CHANGELOG entry: **Hero Power Upload** — Owner can upload a saved lastwarrank.com alliance page in the Members tab to update THP with a preview, replacing the automatic scrape that lastwarrank.com's bot check now blocks.

- [ ] **Step 1: Build the component, wire it in, add locales and the changelog entry.**

- [ ] **Step 2: Check the type check, tests and build**

Run: `npm test && npm run build`
Expected: all pass, and the build succeeds.

- [ ] **Step 3: Manual check in the running app** (`npm run dev`, signed in as the owner, Members tab):
  - Upload `~/Downloads/WPNz Weaponz 무기 · Server 1520 – Last War alliance.html`. The preview shows 95 on page, with a sensible number matched and changes listed.
  - Cancel, then choose the same file again. The preview reappears.
  - Upload any other `.html` file. You get an error and no Apply button.
  - Apply. The table's THP values update. Uploading again then shows "No hero power changes" with Apply disabled.
  - Signed in as a non-owner admin, the button isn't there.

- [ ] **Step 4: Commit**

```bash
git add src/components/HeroPowerUpload.tsx src/components/MemberManager.tsx src/locales CHANGELOG.md
git commit -m "feat(members): owner hero power upload from saved lastwarrank page"
```

### After merge (owner action, not code)

Remove the `LASTWARRANK_ALLIANCE_ID` secret: `supabase secrets unset LASTWARRANK_ALLIANCE_ID`. The sync then stops trying the blocked scrape.
