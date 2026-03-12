import { useState } from 'react'
import { useTrainSchedule } from '../hooks/useTrainSchedule'
import { useAuth } from '../hooks/useAuth'
import type { TrainEntry } from '../lib/types'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${m}/${d}/${y.slice(2)}`
}

function getDow(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return DOW[new Date(y, m - 1, d).getDay()]
}

interface EditState {
  date: string
  existingId?: string
  conductorId: string
  vipId: string
  notes: string
}

export function TrainSchedule() {
  const { isAdmin } = useAuth()
  const { members, entries, weekDates, loading, error, saveEntry, deleteEntry } = useTrainSchedule()
  const [editState, setEditState] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const entryByDate = new Map<string, TrainEntry>()
  for (const e of entries) {
    entryByDate.set(e.date, e)
  }

  function openEdit(date: string) {
    const existing = entryByDate.get(date)
    setEditState({
      date,
      existingId: existing?.id,
      conductorId: existing?.conductor ?? '',
      vipId: existing?.vip ?? '',
      notes: existing?.notes ?? '',
    })
    setSaveError(null)
  }

  async function handleSave() {
    if (!editState) return
    setSaving(true)
    setSaveError(null)
    try {
      await saveEntry(editState.date, editState.conductorId, editState.vipId, editState.notes, editState.existingId)
      setEditState(null)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editState?.existingId) return
    setSaving(true)
    try {
      await deleteEntry(editState.existingId)
      setEditState(null)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  function getMemberName(id: string): string {
    return members.find(m => m.id === id)?.name ?? '—'
  }

  if (loading) {
    return (
      <div className="p-4 pb-24 flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-400 animate-pulse">Charting the seas...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 pb-24">
        <p className="text-game-highlight text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl font-bold text-game-gold mb-1">Voyage Schedule</h1>
      <p className="text-gray-400 text-xs mb-4">Daily voyage departs ~1:00 EST · Sun–Sun view</p>

      <div className="space-y-2">
        {weekDates.map(date => {
          const entry = entryByDate.get(date)
          const isToday = date === todayStr

          return (
            <div
              key={date}
              className={`bg-game-card border rounded-xl p-3 ${isToday ? 'border-game-gold' : 'border-game-accent'}`}
            >
              {/* Date header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-game-gold font-bold text-sm w-8">{getDow(date)}</span>
                  <span className="text-gray-300 text-sm">{formatDate(date)}</span>
                  {isToday && (
                    <span className="text-xs bg-game-gold text-game-dark font-bold px-1.5 py-0.5 rounded">
                      TODAY
                    </span>
                  )}
                </div>
                {isAdmin && (
                  <button
                    onClick={() => openEdit(date)}
                    className="text-xs text-game-standard border border-game-standard rounded px-2 py-0.5 hover:bg-game-standard hover:text-white transition-colors"
                  >
                    {entry ? 'Edit' : '+ Set'}
                  </button>
                )}
              </div>

              {/* Entry content */}
              {entry ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div>
                    <span className="text-gray-500 text-xs uppercase tracking-wide">Captain</span>
                    <p className="text-white font-medium">{getMemberName(entry.conductor)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs uppercase tracking-wide">First Mate</span>
                    <p className="text-white font-medium">{getMemberName(entry.vip)}</p>
                  </div>
                  {entry.notes && (
                    <div className="col-span-2 mt-1">
                      <span className="text-gray-500 text-xs uppercase tracking-wide">Captain's Log</span>
                      <p className="text-gray-300 text-xs">{entry.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-600 text-sm italic">No voyage planned</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Edit modal */}
      {editState && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-game-card border border-game-accent rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-game-gold font-bold">
                {getDow(editState.date)} {formatDate(editState.date)}
              </h2>
              <button onClick={() => setEditState(null)} className="text-gray-400 hover:text-white text-xl leading-none">
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Captain</label>
                <select
                  value={editState.conductorId}
                  onChange={e => setEditState(s => s && ({ ...s, conductorId: e.target.value }))}
                  className="w-full bg-game-dark border border-game-accent rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="">— Select member —</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.Rank})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">First Mate</label>
                <select
                  value={editState.vipId}
                  onChange={e => setEditState(s => s && ({ ...s, vipId: e.target.value }))}
                  className="w-full bg-game-dark border border-game-accent rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="">— Select member —</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.Rank})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Captain's Log</label>
                <input
                  type="text"
                  value={editState.notes}
                  onChange={e => setEditState(s => s && ({ ...s, notes: e.target.value }))}
                  placeholder="e.g. R4/VS Previous Day"
                  className="w-full bg-game-dark border border-game-accent rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600"
                />
              </div>
            </div>

            {saveError && <p className="text-game-highlight text-sm">{saveError}</p>}

            <div className="flex gap-2 pt-1">
              {editState.existingId && (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="flex-none text-sm text-game-highlight border border-game-highlight rounded-lg px-3 py-2 hover:bg-game-highlight hover:text-white transition-colors disabled:opacity-50"
                >
                  Delete
                </button>
              )}
              <button
                onClick={() => setEditState(null)}
                disabled={saving}
                className="flex-1 text-sm text-gray-400 border border-gray-600 rounded-lg py-2 hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 text-sm bg-game-standard text-white rounded-lg py-2 font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
