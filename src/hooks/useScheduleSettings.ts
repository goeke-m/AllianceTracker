import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { logError } from '../lib/errorLog'
import type { WeekMode } from '../lib/types'

export function useScheduleSettings() {
  const [weekMode, setWeekModeState] = useState<WeekMode>('push')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('train_schedule_settings')
        .select('mode')
        .eq('key', 'week_mode')
        .single()
      if (fetchError) throw fetchError
      setWeekModeState((data?.mode as WeekMode) ?? 'push')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule settings')
      logError('useScheduleSettings.fetchData', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function setWeekMode(mode: WeekMode): Promise<void> {
    const { error: updateError } = await supabase
      .from('train_schedule_settings')
      .update({ mode })
      .eq('key', 'week_mode')
    if (updateError) throw updateError
    await fetchData()
  }

  return { weekMode, loading, error, setWeekMode }
}
