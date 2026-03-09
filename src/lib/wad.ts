import type { Member, DamageLog, MemberWithWAD } from './types'


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

  // All R4/R5 members sorted by WAD: slotIndex 0 = rank 1 (best)
  leadership.forEach((m, i) => {
    positions.push({ ...m, ring: 1, slotIndex: i, isStrategicCore: true })
  })

  // All standard members sorted by WAD: slotIndex 0 = rank 1 (best)
  standard.forEach((m, i) => {
    positions.push({ ...m, ring: 2, slotIndex: i, isStrategicCore: false })
  })

  return positions
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return n.toFixed(0)
}
