import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
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
      const [memberRes, logRes] = await Promise.all([
        supabase.from('members').select('*').order('name'),
        supabase
          .from('damage_logs')
          .select('*')
          .order('event_date', { ascending: false }),
      ])
      if (memberRes.error) throw memberRes.error
      if (logRes.error) throw logRes.error

      const m = memberRes.data ?? []
      const l = logRes.data ?? []
      setMembers(m)
      setDamageLogs(l)
      setPositions(assignRingPositions(m, l))
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
