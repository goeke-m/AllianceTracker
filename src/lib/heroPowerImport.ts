import { parseHeroPower, matchHeroPower } from '../../supabase/functions/sync-alliance-members/heropower.ts'
import type { Member } from './types'

export interface HeroPowerChange {
  id: string
  name: string
  oldTHP: number | null
  newTHP: number
}

export interface HeroPowerPreview {
  rowCount: number
  matchedCount: number
  // Matched members whose THP differs, highest new THP first.
  changes: HeroPowerChange[]
  // DB member names not on the page, alphabetical.
  unmatched: string[]
}

// Builds the preview for an uploaded lastwarrank.com alliance page. Throws if the page has no members table.
export function buildHeroPowerPreview(
  html: string,
  members: Pick<Member, 'id' | 'name' | 'THP'>[]
): HeroPowerPreview {
  const rows = parseHeroPower(html)
  const { updates, unmatched } = matchHeroPower(rows, members)
  const byId = new Map(members.map((m) => [m.id, m]))

  const changes: HeroPowerChange[] = []
  for (const u of updates) {
    const m = byId.get(u.dbId)!
    const oldTHP = m.THP ?? null
    if (oldTHP !== u.THP) changes.push({ id: m.id, name: m.name, oldTHP, newTHP: u.THP })
  }
  changes.sort((a, b) => b.newTHP - a.newTHP)

  return {
    rowCount: rows.length,
    matchedCount: updates.length,
    changes,
    unmatched: [...unmatched].sort((a, b) => a.localeCompare(b)),
  }
}
