# Season Participation Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-only "Season" tab where admins enter, per member and per season (5 and 6), participation in the season battle and kills.

**Architecture:** A new `season_battle_stats` Supabase table (unique on `season, member_id`, admin-only RLS). Pure helpers in `src/lib/seasonStats.ts` (TDD) handle input parsing, row merging and upsert payloads. `SeasonStatsManager` loads one season's rows, lets the admin edit inline, and upserts only changed rows.

**Tech Stack:** React 18 + TypeScript, Vite, Tailwind, Supabase (`@supabase/supabase-js`), react-i18next, vitest (`src/**/*.test.ts`, node env).

**Spec:** `docs/superpowers/specs/2026-09-20-season-participation-tracker-design.md`

## Global Constraints

- Seasons come from `SEASONS = [5, 6]` in `src/lib/constants.ts`; no seasons table.
- Table `season_battle_stats`: `participation` int ≥ 0 default 0; `kills` bigint ≥ 0 default 0; unique `(season, member_id)`; `member_id` FK → `members(id)` ON DELETE CASCADE.
- RLS is admin-only for select/insert/update/delete using `(auth.jwt() -> 'user_metadata') ->> 'is_admin'` cast to boolean, same as `vs_points`.
- Upsert uses `onConflict: 'season,member_id'`; errors go through `logError('SeasonStatsManager.<fn>', error)`.
- Numbers display via `formatNumber` from `src/lib/locale.ts`.
- Strings live in all four locale files (`en`, `es`, `ko`, `pt-BR`): `admin.tabSeason` and a `seasonStats.*` namespace.
- Default row sort is rank (R5 first) then name; switching season discards unsaved edits.
- Out of scope: public leaderboard, JSON import, per-battle history, season CRUD, non-admin access.
- After modifying code run `graphify update .` (project CLAUDE.md).

## File Structure

- Create `supabase/migrations/20260920000000_season_battle_stats.sql` — table, constraints, RLS, grants.
- Create `src/lib/memberSort.ts` — `compareMembersByRankThenName` (moved out of `StormPage.tsx` so it can be shared).
- Modify `src/components/StormPage.tsx` — import the moved helper.
- Modify `src/lib/types.ts` — `SeasonBattleStat`.
- Modify `src/lib/constants.ts` — `SEASONS`.
- Create `src/lib/seasonStats.ts` + `src/lib/seasonStats.test.ts` — pure helpers.
- Create `src/components/SeasonStatsManager.tsx` — the tab UI.
- Modify `src/pages/AdminPanel.tsx` — wire the tab.
- Modify `src/locales/{en,es,ko,pt-BR}.json` — strings.

---

### Task 1: Migration, type, and season constant

**Files:**
- Create: `supabase/migrations/20260920000000_season_battle_stats.sql`
- Modify: `src/lib/types.ts` (append)
- Modify: `src/lib/constants.ts` (append)

**Interfaces:**
- Produces: `SeasonBattleStat` interface (types.ts), `SEASONS: number[]` (constants.ts), table `season_battle_stats`.

- [ ] **Step 1: Write the migration**

```sql
CREATE TABLE IF NOT EXISTS "public"."season_battle_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "season" integer NOT NULL,
    "member_id" "uuid" NOT NULL,
    "participation" integer DEFAULT 0 NOT NULL,
    "kills" bigint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "season_battle_stats_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "season_battle_stats_season_member_key" UNIQUE ("season", "member_id"),
    CONSTRAINT "season_battle_stats_participation_check" CHECK (("participation" >= 0)),
    CONSTRAINT "season_battle_stats_kills_check" CHECK (("kills" >= 0)),
    CONSTRAINT "season_battle_stats_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."season_battle_stats" OWNER TO "postgres";

ALTER TABLE "public"."season_battle_stats" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "season_battle_stats_select" ON "public"."season_battle_stats" FOR SELECT TO "authenticated" USING ((((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text"))::boolean = true));

CREATE POLICY "season_battle_stats_insert" ON "public"."season_battle_stats" FOR INSERT TO "authenticated" WITH CHECK ((((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text"))::boolean = true));

CREATE POLICY "season_battle_stats_update" ON "public"."season_battle_stats" FOR UPDATE TO "authenticated" USING ((((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text"))::boolean = true)) WITH CHECK ((((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text"))::boolean = true));

CREATE POLICY "season_battle_stats_delete" ON "public"."season_battle_stats" FOR DELETE TO "authenticated" USING ((((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text"))::boolean = true));

GRANT ALL ON TABLE "public"."season_battle_stats" TO "anon";
GRANT ALL ON TABLE "public"."season_battle_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."season_battle_stats" TO "service_role";
```

- [ ] **Step 2: Add the type**

Append to `src/lib/types.ts`:

```ts
export interface SeasonBattleStat {
  id: string;
  season: number;
  member_id: string;
  participation: number; // count, e.g. attacks/rounds joined
  kills: number;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 3: Add the constant**

Append to `src/lib/constants.ts`:

```ts
export const SEASONS: number[] = [5, 6]
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260920000000_season_battle_stats.sql src/lib/types.ts src/lib/constants.ts
git commit -m "feat(season): add season_battle_stats table, type, and SEASONS constant

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

> Applying the migration to the hosted Supabase project is a deploy step for the user (`supabase db push`); do not run it as part of this plan.

---

### Task 2: Shared member sort + season stats helpers (TDD)

**Files:**
- Create: `src/lib/memberSort.ts`
- Modify: `src/components/StormPage.tsx:43-53` (remove local `rankNum`/`compareMembersByRankThenName`, import instead)
- Create: `src/lib/seasonStats.ts`
- Test: `src/lib/seasonStats.test.ts`

**Interfaces:**
- Consumes: `Member`, `SeasonBattleStat` from `./types`.
- Produces (`memberSort.ts`): `compareMembersByRankThenName(a: Member | undefined, b: Member | undefined): number`.
- Produces (`seasonStats.ts`):
  - `type SeasonEdits = Record<string, { participation: number; kills: number }>` (keyed by member id)
  - `interface SeasonRow { memberId: string; name: string; rank: string; participation: number; kills: number; edited: boolean }`
  - `parseCount(raw: string): number | null` — blank → 0; non-negative integer string → number; anything else → `null`.
  - `buildRows(members: Member[], stats: SeasonBattleStat[], edits: SeasonEdits): SeasonRow[]` — one row per member, default sorted rank desc then name; edits override stored values.
  - `buildUpsertPayload(season: number, edits: SeasonEdits, now: string): { season: number; member_id: string; participation: number; kills: number; updated_at: string }[]`

- [ ] **Step 1: Move the sort helper**

Create `src/lib/memberSort.ts`:

```ts
import type { Member } from './types'

function rankNum(rank: string | undefined): number {
  return rank ? parseInt(rank.slice(1), 10) : 0
}

export function compareMembersByRankThenName(a: Member | undefined, b: Member | undefined): number {
  const rankDiff = rankNum(b?.Rank) - rankNum(a?.Rank)
  if (rankDiff !== 0) return rankDiff
  return (a?.name ?? '').localeCompare(b?.name ?? '')
}
```

In `src/components/StormPage.tsx`, delete the local `rankNum` and `compareMembersByRankThenName` functions (lines 43–53) and add `import { compareMembersByRankThenName } from '../lib/memberSort'` with the other imports. First run `grep -n "rankNum" src/components/StormPage.tsx`; if `rankNum` is used anywhere other than inside the deleted comparator, keep a local `rankNum` there.

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; existing tests pass.

- [ ] **Step 2: Write the failing tests**

Create `src/lib/seasonStats.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseCount, buildRows, buildUpsertPayload } from './seasonStats'
import type { Member, SeasonBattleStat } from './types'

function member(id: string, name: string, Rank: Member['Rank']): Member {
  return { id, name, Rank, created_at: '', updated_at: '' }
}

function stat(member_id: string, participation: number, kills: number): SeasonBattleStat {
  return { id: `s-${member_id}`, season: 5, member_id, participation, kills, created_at: '', updated_at: '' }
}

describe('parseCount', () => {
  it('treats blank as 0', () => {
    expect(parseCount('')).toBe(0)
    expect(parseCount('   ')).toBe(0)
  })
  it('parses non-negative integers', () => {
    expect(parseCount('0')).toBe(0)
    expect(parseCount('12')).toBe(12)
    expect(parseCount('05')).toBe(5)
    expect(parseCount('1234567890')).toBe(1234567890)
  })
  it('rejects negatives, decimals, and junk', () => {
    expect(parseCount('-1')).toBeNull()
    expect(parseCount('1.5')).toBeNull()
    expect(parseCount('abc')).toBeNull()
    expect(parseCount('1e3')).toBeNull()
  })
})

describe('buildRows', () => {
  const members = [member('a', 'Zed', 'R3'), member('b', 'Amy', 'R5'), member('c', 'Bob', 'R3')]

  it('returns one row per member sorted by rank desc then name', () => {
    const rows = buildRows(members, [], {})
    expect(rows.map(r => r.name)).toEqual(['Amy', 'Bob', 'Zed'])
  })

  it('defaults members without a record to 0/0 and not edited', () => {
    const rows = buildRows(members, [], {})
    expect(rows[0]).toMatchObject({ memberId: 'b', rank: 'R5', participation: 0, kills: 0, edited: false })
  })

  it('uses stored values and ignores stats for unknown members', () => {
    const rows = buildRows(members, [stat('a', 3, 500), stat('ghost', 9, 9)], {})
    expect(rows).toHaveLength(3)
    expect(rows.find(r => r.memberId === 'a')).toMatchObject({ participation: 3, kills: 500, edited: false })
  })

  it('lets edits override stored values and marks the row edited', () => {
    const rows = buildRows(members, [stat('a', 3, 500)], { a: { participation: 4, kills: 600 } })
    expect(rows.find(r => r.memberId === 'a')).toMatchObject({ participation: 4, kills: 600, edited: true })
  })
})

describe('buildUpsertPayload', () => {
  it('returns nothing when there are no edits', () => {
    expect(buildUpsertPayload(5, {}, 'now')).toEqual([])
  })

  it('builds one row per edited member with season and timestamp', () => {
    const payload = buildUpsertPayload(6, { a: { participation: 2, kills: 10 }, b: { participation: 0, kills: 0 } }, '2026-09-20T00:00:00.000Z')
    expect(payload).toEqual([
      { season: 6, member_id: 'a', participation: 2, kills: 10, updated_at: '2026-09-20T00:00:00.000Z' },
      { season: 6, member_id: 'b', participation: 0, kills: 0, updated_at: '2026-09-20T00:00:00.000Z' },
    ])
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/lib/seasonStats.test.ts`
Expected: FAIL — cannot resolve `./seasonStats`.

- [ ] **Step 4: Implement the helpers**

Create `src/lib/seasonStats.ts`:

```ts
import type { Member, SeasonBattleStat } from './types'
import { compareMembersByRankThenName } from './memberSort'

export type SeasonEdits = Record<string, { participation: number; kills: number }>

export interface SeasonRow {
  memberId: string
  name: string
  rank: string
  participation: number
  kills: number
  edited: boolean
}

export function parseCount(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return 0
  if (!/^\d+$/.test(trimmed)) return null
  const value = Number(trimmed)
  return Number.isSafeInteger(value) ? value : null
}

export function buildRows(members: Member[], stats: SeasonBattleStat[], edits: SeasonEdits): SeasonRow[] {
  const statByMember = new Map(stats.map(s => [s.member_id, s]))
  return [...members]
    .sort(compareMembersByRankThenName)
    .map(m => {
      const edit = edits[m.id]
      const stored = statByMember.get(m.id)
      return {
        memberId: m.id,
        name: m.name,
        rank: m.Rank,
        participation: edit?.participation ?? stored?.participation ?? 0,
        kills: edit?.kills ?? stored?.kills ?? 0,
        edited: edit !== undefined,
      }
    })
}

export function buildUpsertPayload(season: number, edits: SeasonEdits, now: string) {
  return Object.entries(edits).map(([member_id, v]) => ({
    season,
    member_id,
    participation: v.participation,
    kills: v.kills,
    updated_at: now,
  }))
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all tests PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/memberSort.ts src/components/StormPage.tsx src/lib/seasonStats.ts src/lib/seasonStats.test.ts
git commit -m "feat(season): add season stats helpers and share member sort

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Locale strings

**Files:**
- Modify: `src/locales/en.json`, `es.json`, `ko.json`, `pt-BR.json`

**Interfaces:**
- Produces keys: `admin.tabSeason`, `seasonStats.heading`, `seasonStats.seasonLabel`, `seasonStats.seasonOption` (`{{season}}`), `seasonStats.colParticipation`, `seasonStats.colKills`, `seasonStats.pendingChanges` (`{{count}}`), `seasonStats.saved`, `seasonStats.emptyNoMembers`.

- [ ] **Step 1: Add `admin.tabSeason`**

In each file's `"admin"` object (around line 164–170), add after the `"tabVsPoints"` line:

| File | Line to add |
|---|---|
| en | `"tabSeason": "Season",` |
| es | `"tabSeason": "Temporada",` |
| ko | `"tabSeason": "시즌",` |
| pt-BR | `"tabSeason": "Temporada",` |

- [ ] **Step 2: Add the `seasonStats` namespace**

In each file, insert immediately before the `"vsPoints": {` line (around line 213–214), keeping the trailing comma:

`en.json`:
```json
  "seasonStats": {
    "heading": "Season Battle Stats",
    "seasonLabel": "Season",
    "seasonOption": "Season {{season}}",
    "colParticipation": "Participation",
    "colKills": "Kills",
    "pendingChanges": "{{count}} unsaved change(s)",
    "saved": "Saved.",
    "emptyNoMembers": "No members to show."
  },
```

`es.json`:
```json
  "seasonStats": {
    "heading": "Estadísticas de batalla de temporada",
    "seasonLabel": "Temporada",
    "seasonOption": "Temporada {{season}}",
    "colParticipation": "Participación",
    "colKills": "Bajas",
    "pendingChanges": "{{count}} cambio(s) sin guardar",
    "saved": "Guardado.",
    "emptyNoMembers": "No hay miembros para mostrar."
  },
```

`ko.json`:
```json
  "seasonStats": {
    "heading": "시즌 전투 기록",
    "seasonLabel": "시즌",
    "seasonOption": "시즌 {{season}}",
    "colParticipation": "참여",
    "colKills": "처치",
    "pendingChanges": "저장되지 않은 변경 {{count}}건",
    "saved": "저장되었습니다.",
    "emptyNoMembers": "표시할 멤버가 없습니다."
  },
```

`pt-BR.json`:
```json
  "seasonStats": {
    "heading": "Estatísticas da batalha da temporada",
    "seasonLabel": "Temporada",
    "seasonOption": "Temporada {{season}}",
    "colParticipation": "Participação",
    "colKills": "Abates",
    "pendingChanges": "{{count}} alteração(ões) não salva(s)",
    "saved": "Salvo.",
    "emptyNoMembers": "Nenhum membro para exibir."
  },
```

- [ ] **Step 3: Validate JSON**

Run: `for f in en es ko pt-BR; do node -e "JSON.parse(require('fs').readFileSync('src/locales/$f.json','utf8'))" && echo "$f ok"; done`
Expected: `en ok`, `es ok`, `ko ok`, `pt-BR ok`.

- [ ] **Step 4: Commit**

```bash
git add src/locales
git commit -m "feat(season): add season stats locale strings

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: SeasonStatsManager component and admin tab

**Files:**
- Create: `src/components/SeasonStatsManager.tsx`
- Modify: `src/pages/AdminPanel.tsx:11-18` (tab type + labels), `:43-44` (tab list), `:60-63` (render)

**Interfaces:**
- Consumes: `SEASONS`; `SeasonBattleStat`, `Member`; `parseCount`, `buildRows`, `buildUpsertPayload`, `SeasonEdits`, `SeasonRow` from `../lib/seasonStats`; locale keys from Task 3; `supabase`, `logError`, `formatNumber`.
- Produces: `SeasonStatsManager({ members }: { members: Member[] })`.

- [ ] **Step 1: Write the component**

Create `src/components/SeasonStatsManager.tsx`:

```tsx
import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { logError } from '../lib/errorLog'
import { SEASONS } from '../lib/constants'
import { formatNumber } from '../lib/locale'
import { parseCount, buildRows, buildUpsertPayload } from '../lib/seasonStats'
import type { SeasonEdits, SeasonRow } from '../lib/seasonStats'
import type { Member, SeasonBattleStat } from '../lib/types'

interface SeasonStatsManagerProps {
  members: Member[]
}

type SortKey = 'default' | 'member' | 'participation' | 'kills'
type SortDir = 'asc' | 'desc'
type Field = 'participation' | 'kills'

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <span className="text-gray-600 ml-1">↕</span>
  return <span className="text-game-primary ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
}

export function SeasonStatsManager({ members }: SeasonStatsManagerProps) {
  const { t } = useTranslation()
  const [season, setSeason] = useState<number>(SEASONS[SEASONS.length - 1])
  const [stats, setStats] = useState<SeasonBattleStat[]>([])
  const [edits, setEdits] = useState<SeasonEdits>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterName, setFilterName] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('default')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const seasonRef = useRef(season)

  async function load(s: number) {
    setLoading(true)
    const { data, error } = await supabase.from('season_battle_stats').select('*').eq('season', s)
    if (seasonRef.current !== s) return // a newer season was selected; drop this response
    if (error) {
      setError(error.message)
      logError('SeasonStatsManager.load', error)
      setStats([])
    } else {
      setStats((data ?? []) as SeasonBattleStat[])
    }
    setLoading(false)
  }

  useEffect(() => {
    seasonRef.current = season
    setEdits({})
    setSaved(false)
    setError(null)
    load(season)
  }, [season])

  const rows = useMemo(() => buildRows(members, stats, edits), [members, stats, edits])

  const displayed = useMemo(() => {
    let list = [...rows]
    if (filterName.trim()) {
      const q = filterName.toLowerCase()
      list = list.filter(r => r.name.toLowerCase().includes(q))
    }
    if (sortKey !== 'default') {
      list.sort((a, b) => {
        const av = sortKey === 'member' ? a.name.toLowerCase() : a[sortKey]
        const bv = sortKey === 'member' ? b.name.toLowerCase() : b[sortKey]
        if (av < bv) return sortDir === 'asc' ? -1 : 1
        if (av > bv) return sortDir === 'asc' ? 1 : -1
        return 0
      })
    }
    return list
  }, [rows, filterName, sortKey, sortDir])

  const pendingCount = Object.keys(edits).length

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  function handleChange(row: SeasonRow, field: Field, raw: string) {
    const value = parseCount(raw)
    if (value === null) return // ignore invalid keystrokes
    setEdits(prev => ({
      ...prev,
      [row.memberId]: { participation: row.participation, kills: row.kills, [field]: value },
    }))
    setSaved(false)
  }

  async function handleSave() {
    const payload = buildUpsertPayload(season, edits, new Date().toISOString())
    if (payload.length === 0) return
    setSaving(true)
    setError(null)
    const { error } = await supabase
      .from('season_battle_stats')
      .upsert(payload, { onConflict: 'season,member_id' })
    setSaving(false)
    if (error) {
      setError(error.message)
      logError('SeasonStatsManager.handleSave', error)
      return
    }
    setEdits({})
    setSaved(true)
    load(season)
  }

  const thCls = 'text-left px-3 py-2 font-semibold text-gray-300 whitespace-nowrap select-none cursor-pointer hover:text-white'
  const inputCls = 'w-28 bg-game-dark border border-game-accent rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-game-primary'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-bold text-white">{t('seasonStats.heading')}</h2>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400 uppercase tracking-wide">{t('seasonStats.seasonLabel')}</label>
          <select
            value={season}
            onChange={e => setSeason(Number(e.target.value))}
            className="bg-game-dark border border-game-accent rounded-lg px-3 py-1.5 text-white text-sm"
          >
            {SEASONS.map(s => (
              <option key={s} value={s}>{t('seasonStats.seasonOption', { season: s })}</option>
            ))}
          </select>
          <button
            onClick={handleSave}
            disabled={saving || pendingCount === 0}
            className="text-xs bg-game-highlight text-white font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={filterName}
          onChange={e => setFilterName(e.target.value)}
          placeholder={t('common.searchMemberPlaceholder')}
          className="bg-game-dark border border-game-accent rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-game-primary w-48"
        />
        {filterName && (
          <button onClick={() => setFilterName('')} className="text-xs text-gray-500 hover:text-white transition-colors">
            {t('common.clear')}
          </button>
        )}
        {pendingCount > 0 && (
          <span className="text-xs text-yellow-400">{t('seasonStats.pendingChanges', { count: pendingCount })}</span>
        )}
        {saved && pendingCount === 0 && <span className="text-xs text-green-400">{t('seasonStats.saved')}</span>}
      </div>

      {error && (
        <p className="text-game-highlight text-xs bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</p>
      )}

      {loading && <p className="text-gray-400 text-sm animate-pulse">{t('common.loading')}</p>}

      {!loading && (
        <div className="overflow-x-auto rounded-lg border border-game-accent">
          <table className="w-full text-xs text-white border-collapse">
            <thead>
              <tr className="bg-game-card border-b border-game-accent">
                <th className={thCls} onClick={() => handleSort('member')}>
                  {t('common.member')} <SortIcon col="member" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className={thCls} onClick={() => handleSort('participation')}>
                  {t('seasonStats.colParticipation')} <SortIcon col="participation" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className={thCls} onClick={() => handleSort('kills')}>
                  {t('seasonStats.colKills')} <SortIcon col="kills" sortKey={sortKey} sortDir={sortDir} />
                </th>
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-gray-500 py-6 italic">
                    {rows.length === 0 ? t('seasonStats.emptyNoMembers') : t('common.emptyNoMembersMatch')}
                  </td>
                </tr>
              )}
              {displayed.map(r => (
                <tr
                  key={r.memberId}
                  className={`border-b border-game-accent transition-colors ${r.edited ? 'bg-yellow-900/10' : 'hover:bg-game-card/50'}`}
                >
                  <td className="px-3 py-2 font-semibold text-white whitespace-nowrap">
                    {r.name} <span className="text-gray-500 font-normal">({r.rank})</span>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      value={r.participation}
                      onFocus={e => e.target.select()}
                      onChange={e => handleChange(r, 'participation', e.target.value)}
                      className={inputCls}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      value={r.kills}
                      onFocus={e => e.target.select()}
                      onChange={e => handleChange(r, 'kills', e.target.value)}
                      className={inputCls}
                      title={formatNumber(r.kills)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wire the tab into `AdminPanel.tsx`**

Add the import after the `VsPointManager` import:

```tsx
import { SeasonStatsManager } from '../components/SeasonStatsManager'
```

Replace the `AdminTab` type and `TAB_LABEL_KEYS` (lines 11–18):

```tsx
type AdminTab = 'members' | 'demerits' | 'vs points' | 'season' | 'errors'

const TAB_LABEL_KEYS: Record<AdminTab, string> = {
  members: 'admin.tabMembers',
  demerits: 'admin.tabDemerits',
  'vs points': 'admin.tabVsPoints',
  season: 'admin.tabSeason',
  errors: 'admin.tabErrors',
}
```

Change the tab list (line 43) to:

```tsx
            {(['members', 'demerits', 'vs points', 'season'] as AdminTab[])
```

Add the render line after the `vs points` line (line 62):

```tsx
          {tab === 'season' && <SeasonStatsManager members={members} />}
```

- [ ] **Step 3: Typecheck, test, build**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: no type errors; all tests pass; build succeeds.

- [ ] **Step 4: Manual verification in the dev server**

Requires the migration applied to the Supabase project the app points at (see the note in Task 1) and an admin login.

Run: `npm run dev`, open Admin → Season, and confirm:
1. Table lists all members sorted R5 → R1, then by name, with 0 / 0 for both columns.
2. Season selector shows Season 5 / Season 6, defaulting to 6.
3. Editing a value highlights the row, shows "N unsaved change(s)", and enables Save. Typing `-` or `.` is ignored.
4. Save shows "Saved."; reloading the page and reselecting the season shows the persisted values.
5. Switching to the other season shows independent values, and unsaved edits are discarded on switch.
6. Header click sorts by Member / Participation / Kills; the name filter narrows rows.
7. A non-admin account gets no rows or an error (RLS), not data.

If the migration isn't applied yet, state that manual verification was not performed and why.

- [ ] **Step 5: Refresh the graph and commit**

```bash
graphify update .
git add src/components/SeasonStatsManager.tsx src/pages/AdminPanel.tsx
git commit -m "feat(season): add admin season participation and kills tracker

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

If `graphify update .` changes files under `graphify-out/`, commit them separately as `chore: refresh graphify knowledge graph`.
