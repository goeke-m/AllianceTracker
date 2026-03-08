import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { AllianceTechStatus } from '../lib/types'

export function useAllianceTech() {
  const [current, setCurrent] = useState<AllianceTechStatus | null>(null)
  const [next, setNext] = useState<AllianceTechStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('alliance_tech_status')
        .select('*')
      if (fetchError) throw fetchError
      const rows = (data ?? []) as AllianceTechStatus[]
      setCurrent(rows.find(r => r.key === 'current') ?? null)
      setNext(rows.find(r => r.key === 'next') ?? null)
    } catch (err) {
      setError((err as { message?: string }).message ?? 'Failed to load alliance tech status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function setStatus(
    key: 'current' | 'next',
    techName: string,
    category: 'development' | 'war'
  ): Promise<void> {
    const { error: upsertError } = await supabase
      .from('alliance_tech_status')
      .upsert({ key, tech_name: techName, category, updated_at: new Date().toISOString() })
    if (upsertError) throw upsertError
    await fetchData()
  }

  async function clearStatus(key: 'current' | 'next'): Promise<void> {
    const { error: deleteError } = await supabase
      .from('alliance_tech_status')
      .delete()
      .eq('key', key)
    if (deleteError) throw deleteError
    await fetchData()
  }

  return { current, next, loading, error, setStatus, clearStatus, refresh: fetchData }
}
