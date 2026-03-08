import { MemberManager } from '../components/MemberManager'
import { useMarshallData } from '../hooks/useMarshallData'

export function AdminPanel() {
  const { members, loading, error, refresh } = useMarshallData()

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-xl font-bold text-game-gold">☠️ Captain's Quarters</h1>

      {loading && (
        <div className="text-center py-8 text-game-gold animate-pulse">Loading...</div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-game-highlight text-sm">
          {error}
        </div>
      )}

      {!loading && !error && (
        <MemberManager members={members} onRefresh={refresh} />
      )}
    </div>
  )
}
