import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ErrorLogEntry } from '../lib/types'
import { formatDateTime } from '../lib/locale'

function formatTimestamp(iso: string): string {
  return formatDateTime(iso, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function ErrorLogManager() {
  const [logs, setLogs] = useState<ErrorLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })
    if (fetchError) {
      setError(fetchError.message)
    } else {
      setLogs((data ?? []) as ErrorLogEntry[])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Errors ({logs.length})</h2>
        <button
          onClick={load}
          className="text-xs bg-game-card border border-game-accent text-gray-300 font-semibold px-3 py-1.5 rounded-lg hover:border-game-gold hover:text-white transition-colors"
        >
          Refresh
        </button>
      </div>

      {loading && <p className="text-gray-400 text-sm animate-pulse">Loading...</p>}

      {error && (
        <p className="text-game-highlight text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</p>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-lg border border-game-accent">
          <table className="w-full text-xs text-white border-collapse">
            <thead>
              <tr className="bg-game-card border-b border-game-accent">
                <th className="text-left px-3 py-2 font-semibold text-gray-300 whitespace-nowrap">When</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-300 whitespace-nowrap">User</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-300 whitespace-nowrap">Context</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-300">Message</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-gray-500 py-6 italic">No errors logged.</td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-game-accent hover:bg-game-card/50 transition-colors">
                  <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{formatTimestamp(log.created_at)}</td>
                  <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{log.user_email ?? 'unknown'}</td>
                  <td className="px-3 py-2 text-gray-300 whitespace-nowrap font-mono">{log.context}</td>
                  <td className="px-3 py-2 text-gray-300">{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
