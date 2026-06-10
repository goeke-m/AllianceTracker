import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { AllianceTechQueueItem } from '../lib/types'

export function useAllianceTech() {
  const [queue, setQueue] = useState<AllianceTechQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const initialized = useRef(false)

  const fetchData = useCallback(async () => {
    if (!initialized.current) setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('alliance_tech_queue')
        .select('*')
        .eq('completed', false)
        .order('position', { ascending: true })
      if (fetchError) throw fetchError
      setQueue((data ?? []) as AllianceTechQueueItem[])
    } catch (err) {
      setError((err as { message?: string }).message ?? 'Failed to load tech queue')
    } finally {
      setLoading(false)
      initialized.current = true
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function addItem(techName: string, category: 'development' | 'war'): Promise<void> {
    const maxPos = queue.length > 0 ? Math.max(...queue.map((q: AllianceTechQueueItem) => q.position)) : 0
    const { error: insertError } = await supabase
      .from('alliance_tech_queue')
      .insert({ position: maxPos + 1, tech_name: techName, category })
    if (insertError) throw insertError
    await fetchData()
  }

  async function completeTop(): Promise<void> {
    if (queue.length === 0) return
    const { error: updateError } = await supabase
      .from('alliance_tech_queue')
      .update({ completed: true })
      .eq('id', queue[0].id)
    if (updateError) throw updateError
    await fetchData()
  }

  async function demoteCurrent(): Promise<void> {
    if (queue.length < 2) return
    const a = queue[0]
    const b = queue[1]
    const { error: err1 } = await supabase
      .from('alliance_tech_queue')
      .update({ position: b.position })
      .eq('id', a.id)
    if (err1) throw err1
    const { error: err2 } = await supabase
      .from('alliance_tech_queue')
      .update({ position: a.position })
      .eq('id', b.id)
    if (err2) throw err2
    await fetchData()
  }

  async function reorderUpcoming(orderedIds: string[]): Promise<void> {
    if (queue.length < 2) return
    const basePosition = queue[0].position
    const results = await Promise.all(
      orderedIds.map((id, i) =>
        supabase
          .from('alliance_tech_queue')
          .update({ position: basePosition + i + 1 })
          .eq('id', id)
      )
    )
    const failed = results.find(r => r.error)
    if (failed?.error) throw failed.error
    await fetchData()
  }

  return {
    queue,
    loading,
    error,
    addItem,
    completeTop,
    demoteCurrent,
    reorderUpcoming,
    refresh: fetchData,
  }
}
