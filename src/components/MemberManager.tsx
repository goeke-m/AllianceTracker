import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Member } from '../lib/types'

interface MemberManagerProps {
  members: Member[]
  onRefresh: () => void
}

const RANK_COLORS: Record<number, string> = {
  1: 'bg-gray-600',
  2: 'bg-green-700',
  3: 'bg-game-standard',
  4: 'bg-game-leadership',
  5: 'bg-yellow-500',
}

export function MemberManager({ members, onRefresh }: MemberManagerProps) {
  const [name, setName] = useState('')
  const [rank, setRank] = useState<number>(1)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRank, setEditRank] = useState<number>(1)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setAdding(true)
    const { error: err } = await supabase
      .from('members')
      .insert({ name: name.trim(), rank })
    if (err) {
      setError(err.message)
    } else {
      setName('')
      setRank(1)
      onRefresh()
    }
    setAdding(false)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await supabase.from('members').delete().eq('id', id)
    setDeletingId(null)
    onRefresh()
  }

  async function handleUpdateRank(id: string) {
    await supabase.from('members').update({ rank: editRank }).eq('id', id)
    setEditingId(null)
    onRefresh()
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Members ({members.length})</h2>

      {/* Add member form */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Player name"
          required
          className="flex-1 bg-game-dark border border-game-accent rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-game-gold"
        />
        <select
          value={rank}
          onChange={(e) => setRank(Number(e.target.value))}
          className="bg-game-dark border border-game-accent rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-game-gold"
        >
          {[1, 2, 3, 4, 5].map((r) => (
            <option key={r} value={r}>
              R{r}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={adding}
          className="bg-game-gold text-game-dark font-bold px-4 py-2 rounded-lg text-sm hover:bg-yellow-400 transition-colors disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {error && (
        <p className="text-game-highlight text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Member list */}
      <div className="space-y-1.5 max-h-80 overflow-y-auto">
        {members.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-4">No members yet.</p>
        )}
        {members.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3 bg-game-dark border border-game-accent rounded-lg px-3 py-2"
          >
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${RANK_COLORS[m.rank] ?? 'bg-gray-600'} text-white`}
            >
              R{m.rank}
            </span>
            <span className="flex-1 text-white text-sm truncate">{m.name}</span>

            {editingId === m.id ? (
              <div className="flex items-center gap-1">
                <select
                  value={editRank}
                  onChange={(e) => setEditRank(Number(e.target.value))}
                  className="bg-game-card border border-game-accent rounded px-1 py-0.5 text-white text-xs"
                >
                  {[1, 2, 3, 4, 5].map((r) => (
                    <option key={r} value={r}>
                      R{r}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleUpdateRank(m.id)}
                  className="text-green-400 text-xs px-2 py-0.5 border border-green-700 rounded hover:bg-green-900/30"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-gray-400 text-xs px-2 py-0.5 border border-gray-700 rounded hover:bg-gray-800"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditingId(m.id)
                    setEditRank(m.rank)
                  }}
                  className="text-gray-400 text-xs px-2 py-0.5 border border-gray-700 rounded hover:bg-gray-800 hover:text-white"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(m.id)}
                  disabled={deletingId === m.id}
                  className="text-game-highlight text-xs px-2 py-0.5 border border-red-800 rounded hover:bg-red-900/30 disabled:opacity-50"
                >
                  {deletingId === m.id ? '...' : 'Del'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
