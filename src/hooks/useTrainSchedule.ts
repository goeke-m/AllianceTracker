import { useCallback, useEffect, useState } from 'react'
import { pb } from '../lib/pb'
import type { Member, TrainEntry } from '../lib/types'

function getWeekDates(): string[] {
  const dates: string[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
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
      const [memberRecords, entryRecords] = await Promise.all([
        pb.collection('members').getFullList<Member>({ sort: 'name', $autoCancel: false }),
        pb.collection('train_schedule').getFullList<TrainEntry>({
          filter: `Date >= "${startDate} 00:00:00" && Date <= "${endDate} 23:59:59"`,
          expand: 'Conductor,VIP',
          sort: 'Date',
          $autoCancel: false,
        }),
      ])
      setMembers(memberRecords)
      setEntries(entryRecords.map(e => ({
        ...e,
        date: (e as any).Date?.slice(0, 10) ?? '',
        conductor: (e as any).Conductor ?? e.conductor,
        vip: (e as any).VIP ?? e.vip,
      })))
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
    const data = { Date: date, Conductor: conductorId, VIP: vipId, notes }
    if (existingId) {
      await pb.collection('train_schedule').update(existingId, data)
    } else {
      await pb.collection('train_schedule').create(data)
    }
    await fetchData()
  }

  async function deleteEntry(id: string): Promise<void> {
    await pb.collection('train_schedule').delete(id)
    await fetchData()
  }

  return { members, entries, weekDates, loading, error, saveEntry, deleteEntry, refresh: fetchData }
}
