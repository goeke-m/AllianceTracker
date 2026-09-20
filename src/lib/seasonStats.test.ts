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
