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
