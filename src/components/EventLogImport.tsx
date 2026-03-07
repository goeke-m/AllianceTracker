import { useState } from 'react'
import { pb } from '../lib/pb'
import type { Member, JsonImportEntry } from '../lib/types'

interface EventLogImportProps {
  members: Member[]
  onSuccess: () => void
}

export function EventLogImport({ members, onSuccess }: EventLogImportProps) {
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
      setError('Invalid JSON. Paste a JSON array of damage entries.')
      setLoading(false)
      return
    }

    const memberMap = new Map(members.map((m) => [m.name.toLowerCase(), m.id]))
    const logs: { member_id: string; damage: number; event_date: string }[] = []
    const skipped: string[] = []

    for (const entry of entries) {
      const name = resolveName(entry)
      if (!name) {
        skipped.push('(unnamed entry)')
        continue
      }
      const memberId = memberMap.get(name.toLowerCase())
      if (!memberId) {
        skipped.push(name)
        continue
      }
      if (typeof entry.damage !== 'number' || entry.damage < 0) {
        skipped.push(`${name} (invalid damage)`)
        continue
      }
      logs.push({
        member_id: memberId,
        damage: entry.damage,
        event_date: entry.date ?? entry.event_date ?? new Date().toISOString(),
      })
    }

    if (logs.length > 0) {
      try {
        await Promise.all(logs.map((log) => pb.collection('damage_logs').create(log)))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Import failed')
        setLoading(false)
        return
      }
    }

    let msg = `Imported ${logs.length} damage log${logs.length !== 1 ? 's' : ''}.`
    if (skipped.length > 0) {
      msg += ` Skipped (no match): ${skipped.slice(0, 5).join(', ')}${skipped.length > 5 ? '…' : ''}`
    }
    setStatus(msg)
    setJson('')
    setLoading(false)
    onSuccess()
  }

  const placeholder = `Paste Gemini JSON output here, e.g.:
[
  { "name": "PlayerOne", "damage": 12500000 },
  { "name": "PlayerTwo", "damage": 8300000, "date": "2024-03-01" }
]`

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-white">Import Damage Log (JSON)</h2>

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
        {loading ? 'Importing...' : 'Import'}
      </button>
    </div>
  )
}
