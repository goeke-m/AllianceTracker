import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { logError } from '../lib/errorLog'
import type { AttendanceStatus, Member, StormConfig, StormEvent, StormRosterEntry } from '../lib/types'

function getSundayDate(offsetWeeks = 0): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - today.getDay() + offsetWeeks * 7)
  return sunday.toISOString().slice(0, 10)
}

interface StormData {
  event: StormEvent | null
  roster: StormRosterEntry[]
  members: Member[]
  noShowCounts: Map<string, number>
  historicEvents: Array<{ event: StormEvent; roster: StormRosterEntry[] }>
}

export function useStormEvent(config: StormConfig) {
  const { t } = useTranslation()
  const [weekOffset, setWeekOffset] = useState(0)
  const [data, setData] = useState<StormData>({
    event: null,
    roster: [],
    members: [],
    noShowCounts: new Map(),
    historicEvents: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const weekStart = getSundayDate(weekOffset)
  const isPastWeek = weekOffset < 0

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [
        { data: membersData, error: membersError },
        { data: eventData, error: eventError },
        { data: historicEventsData, error: historicError },
      ] = await Promise.all([
        supabase.from('members').select('*').order('name'),
        supabase
          .from('storm_events')
          .select('*')
          .eq('event_type', config.eventType)
          .eq('week_start', weekStart)
          .maybeSingle(),
        supabase
          .from('storm_events')
          .select('*')
          .eq('event_type', config.eventType)
          .lt('week_start', weekStart)
          .order('week_start', { ascending: false })
          .limit(12),
      ])

      if (membersError) throw membersError
      if (eventError) throw eventError
      if (historicError) throw historicError

      const members = (membersData ?? []) as Member[]
      const event = eventData as StormEvent | null
      const historicEventList = (historicEventsData ?? []) as StormEvent[]

      // Fetch current week's roster (only if event exists)
      let roster: StormRosterEntry[] = []
      if (event) {
        const { data: rosterData, error: rosterError } = await supabase
          .from('storm_roster')
          .select('*')
          .eq('event_id', event.id)
        if (rosterError) throw rosterError
        roster = (rosterData ?? []) as StormRosterEntry[]
      }

      // Fetch historic roster for all past events
      let historicRosterAll: StormRosterEntry[] = []
      if (historicEventList.length > 0) {
        const { data: historicRosterData, error: historicRosterError } = await supabase
          .from('storm_roster')
          .select('*')
          .in('event_id', historicEventList.map(e => e.id))
        if (historicRosterError) throw historicRosterError
        historicRosterAll = (historicRosterData ?? []) as StormRosterEntry[]
      }

      // No-show counts from the last 6 past events only
      const last6Ids = new Set(historicEventList.slice(0, 6).map(e => e.id))
      const noShowCounts = new Map<string, number>()
      for (const entry of historicRosterAll) {
        if (entry.attendance === 'no_show' && last6Ids.has(entry.event_id)) {
          noShowCounts.set(entry.member_id, (noShowCounts.get(entry.member_id) ?? 0) + 1)
        }
      }

      // Group historic roster by event for the history view
      const historicEvents = historicEventList.map(ev => ({
        event: ev,
        roster: historicRosterAll.filter(r => r.event_id === ev.id),
      }))

      setData({ event, roster, members, noShowCounts, historicEvents })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('storm.failedToLoad'))
      logError(`useStormEvent(${config.eventType}).fetchData`, err)
    } finally {
      setLoading(false)
    }
  }, [config.eventType, weekStart])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function addMember(
    memberId: string,
    team: 'A' | 'B',
    role: 'participant' | 'substitute'
  ): Promise<void> {
    let eventId = data.event?.id
    if (!eventId) {
      const { data: newEvent, error } = await supabase
        .from('storm_events')
        .insert({ event_type: config.eventType, week_start: weekStart })
        .select('id')
        .single()
      if (error) throw error
      eventId = newEvent.id
    }
    const initialAttendance: AttendanceStatus | null = role === 'participant' ? 'present' : null
    const { error } = await supabase
      .from('storm_roster')
      .insert({ event_id: eventId, member_id: memberId, team, role, attendance: initialAttendance })
    if (error) throw error
    await fetchData()
  }

  async function removeMember(rosterId: string): Promise<void> {
    const { error } = await supabase.from('storm_roster').delete().eq('id', rosterId)
    if (error) throw error
    await fetchData()
  }

  async function updateAttendance(
    rosterId: string,
    attendance: AttendanceStatus | null
  ): Promise<void> {
    const { error } = await supabase
      .from('storm_roster')
      .update({ attendance })
      .eq('id', rosterId)
    if (error) throw error
    await fetchData()
  }

  // Compute team power from current week's roster
  const teamPower = { A: 0, B: 0 }
  for (const entry of data.roster) {
    const member = data.members.find(m => m.id === entry.member_id)
    if (member && member.THP != null) {
      if (entry.team === 'A') teamPower.A += member.THP
      else teamPower.B += member.THP
    }
  }

  return {
    ...data,
    teamPower,
    weekStart,
    weekOffset,
    setWeekOffset,
    isPastWeek,
    loading,
    error,
    addMember,
    removeMember,
    updateAttendance,
    refresh: fetchData,
  }
}
