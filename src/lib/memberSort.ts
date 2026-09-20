import type { Member } from './types'

function rankNum(rank: string | undefined): number {
  return rank ? parseInt(rank.slice(1), 10) : 0
}

export function compareMembersByRankThenName(a: Member | undefined, b: Member | undefined): number {
  const rankDiff = rankNum(b?.Rank) - rankNum(a?.Rank)
  if (rankDiff !== 0) return rankDiff
  return (a?.name ?? '').localeCompare(b?.name ?? '')
}
