import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Member, TrainEntry } from '../lib/types'

function getWeekDates(): string[] {
  const dates: string[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - today.getDay()) // rewind to Sunday
  for (let i = 0; i <= 7; i++) {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

export function useTrainSchedule() {
  const [members, setMembers] = useState<Member[]>([])
  const [entries, setEntries] = useState<TrainEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const weekDates = getWeekDates()
  const startDate = weekDates[0]
  const endDate = weekDates[weekDates.length - 1]

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [{ data: memberRecords, error: membersError }, { data: entryRecords, error: entriesError }] =
        await Promise.all([
          supabase.from('members').select('*').order('name'),
          supabase
            .from('train_schedule')
            .select('*')
            .gte('Date', `${startDate} 00:00:00`)
            .lte('Date', `${endDate} 23:59:59`)
            .order('Date'),
        ])
      if (membersError) throw membersError
      if (entriesError) throw entriesError
      setMembers((memberRecords ?? []) as Member[])
      setEntries(
        (entryRecords ?? []).map((e) => ({
          ...(e as unknown as TrainEntry),
          date: (e as unknown as Record<string, string>)['Date']?.slice(0, 10) ?? '',
          conductor: (e as unknown as Record<string, string>)['Conductor'] ?? '',
          vip: (e as unknown as Record<string, string>)['VIP'] ?? '',
        }))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function saveEntry(
    date: string,
    conductorId: string,
    vipId: string,
    notes: string,
    existingId?: string
  ): Promise<void> {
    const data = { Date: date, Conductor: conductorId || null, VIP: vipId || null, notes }
    if (existingId) {
      const { error } = await supabase.from('train_schedule').update(data).eq('id', existingId)
      if (error) throw error
    } else {
      const { error } = await supabase.from('train_schedule').insert(data)
      if (error) throw error
    }
    await fetchData()
  }

  async function deleteEntry(id: string): Promise<void> {
    const { error } = await supabase.from('train_schedule').delete().eq('id', id)
    if (error) throw error
    await fetchData()
  }

  return { members, entries, weekDates, loading, error, saveEntry, deleteEntry, refresh: fetchData }
}
