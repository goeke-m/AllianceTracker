import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { logError } from '../lib/errorLog'
import type { Member, JsonImportEntry } from '../lib/types'

interface EventLogImportProps {
  members: Member[]
  onSuccess: () => void
}

export function EventLogImport({ members, onSuccess }: EventLogImportProps) {
  const { t } = useTranslation()
  const [json, setJson] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function resolveName(entry: JsonImportEntry): string | null {
    return entry.name ?? entry.player ?? entry.member ?? null
  }

  async function handleImport() {
    setError(null)
    setStatus(null)
    setLoading(true)

    let entries: JsonImportEntry[]
    try {
      const parsed = JSON.parse(json)
      entries = Array.isArray(parsed) ? parsed : [parsed]
    } catch {
      setError(t('members.eventLogImport.invalidJson'))
      setLoading(false)
      return
    }

    const memberMap = new Map(members.map((m) => [m.name.toLowerCase(), m.id]))
    const logs: { member_id: string; damage: number; event_date: string }[] = []
    const skipped: string[] = []

    for (const entry of entries) {
      const name = resolveName(entry)
      if (!name) {
        skipped.push(t('members.eventLogImport.unnamedEntry'))
        continue
      }
      const memberId = memberMap.get(name.toLowerCase())
      if (!memberId) {
        skipped.push(name)
        continue
      }
      if (typeof entry.damage !== 'number' || entry.damage < 0) {
        skipped.push(t('members.eventLogImport.invalidDamageSuffix', { name }))
        continue
      }
      const rawDate = entry.date ?? entry.event_date
      let event_date: string
      if (rawDate) {
        // Treat bare date strings (YYYY-MM-DD) as Eastern time midnight
        const dateStr = String(rawDate)
        const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
        event_date = isDateOnly
          ? new Date(`${dateStr}T00:00:00-05:00`).toISOString()
          : new Date(dateStr).toISOString()
      } else {
        event_date = new Date().toISOString()
      }
      logs.push({
        member_id: memberId,
        damage: entry.damage,
        event_date,
      })
    }

    if (logs.length > 0) {
      try {
        const { error } = await supabase.from('damage_logs').insert(logs)
        if (error) throw error
      } catch (err) {
        setError(err instanceof Error ? err.message : t('members.eventLogImport.importFailedFallback'))
        logError('EventLogImport.handleImport', err)
        setLoading(false)
        return
      }
    }

    let msg = t('members.eventLogImport.importedCount', { count: logs.length })
    if (skipped.length > 0) {
      const list = `${skipped.slice(0, 5).join(', ')}${skipped.length > 5 ? '…' : ''}`
      msg += t('members.eventLogImport.skippedSuffix', { list })
    }
    setStatus(msg)
    setJson('')
    setLoading(false)
    onSuccess()
  }

  const placeholder = `${t('members.eventLogImport.placeholderIntro')}
[
  { "name": "PlayerOne", "damage": 12500000 },
  { "name": "PlayerTwo", "damage": 8300000, "date": "2024-03-01" }
]`

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-white">{t('members.eventLogImport.title')}</h2>

      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        placeholder={placeholder}
        rows={10}
        className="w-full bg-game-dark border border-game-accent rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-game-gold resize-none"
      />

      {error && (
        <p className="text-game-highlight text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {status && (
        <p className="text-green-400 text-sm bg-green-900/20 border border-green-800 rounded-lg px-3 py-2">
          {status}
        </p>
      )}

      <button
        onClick={handleImport}
        disabled={loading || !json.trim()}
        className="w-full bg-game-gold text-game-dark font-bold py-2.5 rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50"
      >
        {loading ? t('common.importing') : t('common.import')}
      </button>
    </div>
  )
}
