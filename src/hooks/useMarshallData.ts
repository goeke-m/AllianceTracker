import { useCallback, useEffect, useState } from 'react'
import { pb } from '../lib/pb'
import { assignRingPositions } from '../lib/wad'
import type { Member, DamageLog, MemberWithWAD } from '../lib/types'

export function useMarshallData() {
  const [members, setMembers] = useState<Member[]>([])
  const [damageLogs, setDamageLogs] = useState<DamageLog[]>([])
  const [positions, setPositions] = useState<MemberWithWAD[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [memberRecords, logRecords] = await Promise.all([
        pb.collection('members').getFullList<Member>({ sort: 'name' }),
        pb.collection('damage_logs').getFullList<DamageLog>({ sort: '-event_date' }),
      ])
      setMembers(memberRecords)
      setDamageLogs(logRecords)
      setPositions(assignRingPositions(memberRecords, logRecords))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { members, damageLogs, positions, loading, error, refresh: fetchData }
}
