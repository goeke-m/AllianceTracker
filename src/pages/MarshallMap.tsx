import { MarshallVisualizer } from '../components/MarshallVisualizer'
import { useMarshallData } from '../hooks/useMarshallData'
import { formatNumber } from '../lib/wad'

export function MarshallMap() {
  const { positions, loading, error, refresh } = useMarshallData()

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
                        <td className="px-3 py-2 text-gray-300">R{m.rank}</td>
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
    </div>
  )
}
