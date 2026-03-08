import { useState } from 'react'
import { MemberManager } from '../components/MemberManager'
import { EventLogImport } from '../components/EventLogImport'
import { useMarshallData } from '../hooks/useMarshallData'
import { pb } from '../lib/pb'
import { formatNumber } from '../lib/wad'

type AdminTab = 'members' | 'import' | 'logs'

export function AdminPanel() {
  const [tab, setTab] = useState<AdminTab>('members')
  const { members, damageLogs, loading, error, refresh } = useMarshallData()
  const [clearingMemberId, setClearingMemberId] = useState<string | null>(null)

  async function handleClearLogs(memberId: string) {
    setClearingMemberId(memberId)
    const logs = await pb.collection('damage_logs').getFullList({ filter: `member_id="${memberId}"` })
    await Promise.all(logs.map((l) => pb.collection('damage_logs').delete(l.id)))
    setClearingMemberId(null)
    refresh()
  }

  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'members', label: 'Members' },
    { id: 'import', label: 'Import' },
    { id: 'logs', label: 'Logs' },
  ]

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-xl font-bold text-game-gold">Admin Panel</h1>

      {/* Sub-tabs */}
      <div className="flex bg-game-dark border border-game-accent rounded-lg p-1 gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-game-accent text-game-gold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-8 text-game-gold animate-pulse">Loading...</div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-game-highlight text-sm">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {tab === 'members' && (
            <MemberManager members={members} onRefresh={refresh} />
          )}

          {tab === 'import' && (
            <EventLogImport members={members} onSuccess={refresh} />
          )}

          {tab === 'logs' && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-white">
                Damage Logs ({damageLogs.length} entries)
              </h2>

              {members.map((m) => {
                const logs = damageLogs
                  .filter((l) => l.member_id === m.id)
                  .sort(
                    (a, b) =>
                      new Date(b.event_date).getTime() -
                      new Date(a.event_date).getTime()
                  )
                if (logs.length === 0) return null
                return (
                  <div
                    key={m.id}
                    className="bg-game-card border border-game-accent rounded-xl p-3"
                  >
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
                        <div
                          key={log.id}
                          className="flex justify-between text-xs text-gray-400"
                        >
                          <span>
                            #{i + 1}{' '}
                            {new Date(log.event_date).toLocaleDateString()}
                          </span>
                          <span className="font-mono text-white">
                            {formatNumber(log.damage)}
                          </span>
                        </div>
                      ))}
                      {logs.length > 5 && (
                        <p className="text-xs text-gray-600">
                          +{logs.length - 5} more
                        </p>
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
        </>
      )}
    </div>
  )
}
