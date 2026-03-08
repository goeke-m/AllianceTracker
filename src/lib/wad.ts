import type { Member, DamageLog, MemberWithWAD } from './types'

const RING1_CAPACITY = 8
const RING2_STRATEGIC_SLOTS = 3
const RING2_STANDARD_SLOTS = 13

function rankToNum(rank: string): number {
  return parseInt(rank.slice(1)) || 1
}

export function calculateWAD(damages: number[]): number {
  const weights = [0.6, 0.25, 0.15]
  return damages
    .slice(0, 3)
    .reduce((sum, dmg, i) => sum + dmg * weights[i], 0)
}

export function assignRingPositions(
  members: Member[],
  damageLogs: DamageLog[]
): MemberWithWAD[] {
  // Most recent 10 event dates across all members
  const ATTENDANCE_WINDOW = 10
  const recentEventDates = [...new Set(damageLogs.map((l) => l.event_date))]
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    .slice(0, ATTENDANCE_WINDOW)
  const recentEventSet = new Set(recentEventDates)
  const windowSize = recentEventDates.length

  const memberWADs = members.map((member) => {
    const logs = damageLogs
      .filter((log) => log.member_id === member.id)
      .sort(
        (a, b) =>
          new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
      )
    const wad = calculateWAD(logs.map((l) => l.damage))
    const attendedRecent = logs.filter((l) => recentEventSet.has(l.event_date)).length
    const attendance = windowSize > 0 ? attendedRecent / windowSize : 1
    const score = wad * attendance
    const rankNum = rankToNum(member.Rank)
    return { id: member.id, name: member.name, Rank: member.Rank, rankNum, wad: score }
  })

  const leadership = [...memberWADs.filter((m) => m.rankNum >= 4)].sort(
    (a, b) => b.wad - a.wad
  )
  const standard = [...memberWADs.filter((m) => m.rankNum < 4)].sort(
    (a, b) => b.wad - a.wad
  )

  const positions: MemberWithWAD[] = []

  // Ring 1: top 8 leadership (R4/R5) by WAD
  leadership.slice(0, RING1_CAPACITY).forEach((m, i) => {
    positions.push({ ...m, ring: 1, slotIndex: i, isStrategicCore: true })
  })

  // Ring 2 strategic core: leadership ranks 9-11 (closest to Marshall)
  const ring2Leadership = leadership.slice(
    RING1_CAPACITY,
    RING1_CAPACITY + RING2_STRATEGIC_SLOTS
  )
  ring2Leadership.forEach((m, i) => {
    positions.push({ ...m, ring: 2, slotIndex: i, isStrategicCore: true })
  })

  // Ring 2 outer: top standard (R1-R3) members fill remaining slots
  const usedStrategic = ring2Leadership.length
  const ring2StandardMax =
    RING2_STRATEGIC_SLOTS + RING2_STANDARD_SLOTS - usedStrategic
  standard.slice(0, ring2StandardMax).forEach((m, i) => {
    positions.push({
      ...m,
      ring: 2,
      slotIndex: usedStrategic + i,
      isStrategicCore: false,
    })
  })

  // Ring 3+: remaining standard members by WAD
  standard.slice(ring2StandardMax).forEach((m, i) => {
    positions.push({ ...m, ring: 3, slotIndex: i, isStrategicCore: false })
  })

  return positions
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return n.toFixed(0)
}
