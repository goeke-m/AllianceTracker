import { useState } from 'react'
import { MarshallVisualizer } from '../components/MarshallVisualizer'
import { EventLogImport } from '../components/EventLogImport'
import { useMarshallData } from '../hooks/useMarshallData'
import { formatNumber } from '../lib/wad'
import { supabase } from '../lib/supabase'

interface MarshallMapProps {
  isAdmin?: boolean
}

type AdminTab = 'import' | 'logs'

export function MarshallMap({ isAdmin }: MarshallMapProps) {
  const { positions, members, damageLogs, loading, error, refresh } = useMarshallData()
  const [adminTab, setAdminTab] = useState<AdminTab>('import')
  const [clearingMemberId, setClearingMemberId] = useState<string | null>(null)
  const [logFilter, setLogFilter] = useState<Set<string>>(new Set())

  function toggleLogFilter(id: string) {
    setLogFilter((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleClearLogs(memberId: string) {
    setClearingMemberId(memberId)
    await supabase.from('damage_logs').delete().eq('member_id', memberId)
    setClearingMemberId(null)
    refresh()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-game-gold animate-pulse text-lg">Loading map...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-game-highlight">
          {error}
        </div>
        <button
          onClick={refresh}
          className="mt-3 text-sm text-game-gold underline"
        >
          Retry
        </button>
      </div>
    )
  }

  const ring1 = positions.filter((p) => p.ring === 1)
  const ring2 = positions.filter((p) => p.ring === 2)
  const ring3 = positions.filter((p) => p.ring === 3)

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-game-gold">Marshall Map</h1>
        <button
          onClick={refresh}
          className="text-xs text-gray-400 hover:text-white border border-game-accent px-2 py-1 rounded"
        >
          Refresh
        </button>
      </div>

      {positions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-3">🗺</p>
          <p>No members yet. Ask your admin to add members and import damage data.</p>
        </div>
      ) : (
        <>
          <MarshallVisualizer positions={positions} />

          {/* Ring 3 overflow table */}
          {ring3.length > 0 && (
            <div className="mt-4">
              <h2 className="text-sm font-semibold text-gray-400 mb-2">
                Ring 3+ ({ring3.length} members)
              </h2>
              <div className="bg-game-card border border-game-accent rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-game-accent text-gray-400 text-xs">
                      <th className="text-left px-3 py-2">#</th>
                      <th className="text-left px-3 py-2">Name</th>
                      <th className="text-left px-3 py-2">Rank</th>
                      <th className="text-right px-3 py-2">WAD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ring3.map((m, i) => (
                      <tr key={m.id} className="border-b border-game-accent/50 last:border-0">
                        <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                        <td className="px-3 py-2 text-white">{m.name}</td>
                        <td className="px-3 py-2 text-gray-300">{m.Rank}</td>
                        <td className="px-3 py-2 text-right text-gray-300 font-mono">
                          {formatNumber(m.wad)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2 mt-2">
            {[
              { label: 'Ring 1', count: ring1.length, color: 'text-game-leadership' },
              { label: 'Ring 2', count: ring2.length, color: 'text-game-standard' },
              { label: 'Ring 3+', count: ring3.length, color: 'text-gray-400' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-game-card border border-game-accent rounded-lg p-3 text-center"
              >
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.count}</div>
                <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Admin-only: Import & Logs */}
      {isAdmin && (
        <div className="mt-6 border-t border-game-accent pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-game-leadership text-game-dark font-bold px-2 py-0.5 rounded">
              ADMIN
            </span>
            <span className="text-sm font-semibold text-gray-300">Data Management</span>
          </div>

          {/* Sub-tabs */}
          <div className="flex bg-game-dark border border-game-accent rounded-lg p-1 gap-1">
            {(['import', 'logs'] as AdminTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setAdminTab(t)}
                className={`flex-1 py-1.5 rounded text-sm font-medium capitalize transition-colors ${
                  adminTab === t
                    ? 'bg-game-accent text-game-gold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {t === 'import' ? 'Import' : 'Logs'}
              </button>
            ))}
          </div>

          {adminTab === 'import' && (
            <EventLogImport members={members} onSuccess={refresh} />
          )}

          {adminTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">
                  Damage Logs ({damageLogs.length} entries)
                </h2>
                {logFilter.size > 0 && (
                  <button
                    onClick={() => setLogFilter(new Set())}
                    className="text-xs text-gray-400 hover:text-white border border-game-accent px-2 py-0.5 rounded"
                  >
                    Clear filter
                  </button>
                )}
              </div>

              {/* Member filter pills */}
              {damageLogs.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {members
                    .filter((m) => damageLogs.some((l) => l.member_id === m.id))
                    .map((m) => (
                      <button
                        key={m.id}
                        onClick={() => toggleLogFilter(m.id)}
                        className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                          logFilter.has(m.id)
                            ? 'bg-game-gold text-game-dark border-game-gold font-semibold'
                            : 'border-game-accent text-gray-400 hover:text-white hover:border-gray-400'
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                </div>
              )}

              {members
                .filter((m) => logFilter.size === 0 || logFilter.has(m.id))
                .map((m) => {
                const logs = damageLogs
                  .filter((l) => l.member_id === m.id)
                  .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
                if (logs.length === 0) return null
                return (
                  <div key={m.id} className="bg-game-card border border-game-accent rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-white text-sm">
                        {m.name}{' '}
                        <span className="text-gray-400 font-normal">{m.Rank}</span>
                      </span>
                      <button
                        onClick={() => handleClearLogs(m.id)}
                        disabled={clearingMemberId === m.id}
                        className="text-xs text-game-highlight border border-red-800 px-2 py-0.5 rounded hover:bg-red-900/30 disabled:opacity-50"
                      >
                        {clearingMemberId === m.id ? '...' : 'Clear'}
                      </button>
                    </div>
                    <div className="space-y-1">
                      {logs.slice(0, 5).map((log, i) => (
                        <div key={log.id} className="flex justify-between text-xs text-gray-400">
                          <span>#{i + 1} {new Date(log.event_date).toLocaleDateString()}</span>
                          <span className="font-mono text-white">{formatNumber(log.damage)}</span>
                        </div>
                      ))}
                      {logs.length > 5 && (
                        <p className="text-xs text-gray-600">+{logs.length - 5} more</p>
                      )}
                    </div>
                  </div>
                )
              })}

              {damageLogs.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">
                  No damage logs. Use the Import tab to add data.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
