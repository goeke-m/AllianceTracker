import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Member, OotoEntry } from '../lib/types'

export function useOoto() {
  const [members, setMembers] = useState<Member[]>([])
  const [entries, setEntries] = useState<OotoEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [{ data: memberRecords, error: membersError }, { data: ootoRecords, error: ootoError }] =
        await Promise.all([
          supabase.from('members').select('*').order('name'),
          supabase.from('ooto').select('*').order('start_date'),
        ])
      if (membersError) throw membersError
      if (ootoError) throw ootoError
      setMembers((memberRecords ?? []) as Member[])
      setEntries((ootoRecords ?? []) as OotoEntry[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load OOTO data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function saveEntry(
    memberId: string,
    startDate: string,
    endDate: string,
    notes: string,
    existingId?: string
  ): Promise<void> {
    const data = { member_id: memberId, start_date: startDate, end_date: endDate, notes: notes || null }
    if (existingId) {
      const { error } = await supabase.from('ooto').update(data).eq('id', existingId)
      if (error) throw error
    } else {
      const { error } = await supabase.from('ooto').insert(data)
      if (error) throw error
    }
    await fetchData()
  }

  async function deleteEntry(id: string): Promise<void> {
    const { error } = await supabase.from('ooto').delete().eq('id', id)
    if (error) throw error
    await fetchData()
  }

  return { members, entries, loading, error, saveEntry, deleteEntry, refresh: fetchData }
}
