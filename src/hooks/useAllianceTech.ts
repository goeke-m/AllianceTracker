import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { AllianceTechQueueItem } from '../lib/types'

export function useAllianceTech() {
  const [queue, setQueue] = useState<AllianceTechQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
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

  async function moveUp(index: number): Promise<void> {
    if (index === 0) return
    const a = queue[index - 1]
    const b = queue[index]
    await supabase.from('alliance_tech_queue').update({ position: b.position }).eq('id', a.id)
    await supabase.from('alliance_tech_queue').update({ position: a.position }).eq('id', b.id)
    await fetchData()
  }

  async function moveDown(index: number): Promise<void> {
    if (index === queue.length - 1) return
    const a = queue[index]
    const b = queue[index + 1]
    await supabase.from('alliance_tech_queue').update({ position: b.position }).eq('id', a.id)
    await supabase.from('alliance_tech_queue').update({ position: a.position }).eq('id', b.id)
    await fetchData()
  }

  return { queue, loading, error, addItem, completeTop, moveUp, moveDown, refresh: fetchData }
}
