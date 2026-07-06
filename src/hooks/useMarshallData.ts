import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { assignRingPositions } from '../lib/wad'
import { logError } from '../lib/errorLog'
import type { Member, DamageLog, MemberWithWAD } from '../lib/types'

export function useMarshallData() {
  const [members, setMembers] = useState<Member[]>([])
  const [damageLogs, setDamageLogs] = useState<DamageLog[]>([])
  const [positions, setPositions] = useState<MemberWithWAD[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const initialized = useRef(false)

  const fetchData = useCallback(async () => {
    if (!initialized.current) setLoading(true)
    setError(null)
    try {
      const [{ data: memberRecords, error: membersError }, { data: logRecords, error: logsError }] =
        await Promise.all([
          supabase.from('members').select('*').order('name'),
          supabase.from('damage_logs').select('*').order('event_date', { ascending: false }),
        ])
      if (membersError) throw membersError
      if (logsError) throw logsError
      const members = (memberRecords ?? []) as Member[]
      const logs = (logRecords ?? []) as DamageLog[]
      setMembers(members)
      setDamageLogs(logs)
      setPositions(assignRingPositions(members, logs))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      logError('useMarshallData.fetchData', err)
    } finally {
      setLoading(false)
      initialized.current = true
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { members, damageLogs, positions, loading, error, refresh: fetchData }
}
