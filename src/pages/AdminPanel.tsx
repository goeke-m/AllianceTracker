import { useState } from 'react'
import { MemberManager } from '../components/MemberManager'
import { DemeritManager } from '../components/DemeritManager'
import { VsPointManager } from '../components/VsPointManager'
import { useMarshallData } from '../hooks/useMarshallData'
import { useAuth } from '../hooks/useAuth'

type AdminTab = 'members' | 'demerits' | 'vs points'

export function AdminPanel() {
  const { members, loading, error, refresh } = useMarshallData()
  const { user } = useAuth()
  const [tab, setTab] = useState<AdminTab>('members')

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
        <>
          <div className="flex gap-1 border-b border-game-accent">
            {(['members', 'demerits', 'vs points'] as AdminTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${
                  tab === t
                    ? 'border-game-gold text-game-gold'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'members' && <MemberManager members={members} onRefresh={refresh} syncUserId={user?.id} />}
          {tab === 'demerits' && <DemeritManager members={members} />}
          {tab === 'vs points' && <VsPointManager members={members} />}
        </>
      )}
    </div>
  )
}
