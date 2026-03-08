import { useState } from 'react'
import type { ReactNode } from 'react'
import { useOoto } from '../hooks/useOoto'
import { useAuth } from '../hooks/useAuth'
import type { OotoEntry } from '../lib/types'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${m}/${d}/${y.slice(2)}`
}

function getStatus(entry: OotoEntry): 'active' | 'upcoming' | 'past' {
  const t = today()
  if (entry.end_date < t) return 'past'
  if (entry.start_date <= t) return 'active'
  return 'upcoming'
}

interface EditState {
  existingId?: string
  memberId: string
  startDate: string
  endDate: string
  notes: string
}

export function Out() {
  const { isAdmin } = useAuth()
  const { members, entries, loading, error, saveEntry, deleteEntry } = useOoto()
  const [editState, setEditState] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showPast, setShowPast] = useState(false)

  function getMemberName(id: string): string {
    return members.find(m => m.id === id)?.name ?? '—'
  }

  function openAdd() {
    setEditState({ memberId: '', startDate: today(), endDate: today(), notes: '' })
    setSaveError(null)
  }

  function openEdit(entry: OotoEntry) {
    setEditState({
      existingId: entry.id,
      memberId: entry.member_id,
      startDate: entry.start_date,
      endDate: entry.end_date,
      notes: entry.notes ?? '',
    })
    setSaveError(null)
  }

  async function handleSave() {
    if (!editState || !editState.memberId || !editState.startDate || !editState.endDate) {
      setSaveError('Member, start date, and end date are required.')
      return
    }
    if (editState.endDate < editState.startDate) {
      setSaveError('End date must be on or after start date.')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await saveEntry(editState.memberId, editState.startDate, editState.endDate, editState.notes, editState.existingId)
      setEditState(null)
    } catch (err) {
      setSaveError((err as { message?: string }).message ?? 'Save failed')
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
      setSaveError((err as { message?: string }).message ?? 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 pb-24 flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-400 animate-pulse">Loading...</p>
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

  const active = entries.filter(e => getStatus(e) === 'active')
  const upcoming = entries.filter(e => getStatus(e) === 'upcoming')
  const past = entries.filter(e => getStatus(e) === 'past')

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-game-gold">Out</h1>
        {isAdmin && (
          <button
            onClick={openAdd}
            className="text-xs bg-game-standard text-white font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            + Add
          </button>
        )}
      </div>
      <p className="text-gray-400 text-xs mb-4">Members currently offline or inaccessible</p>

      {/* Active */}
      <Section label="Currently Out" accent="border-game-highlight">
        {active.length === 0 ? (
          <p className="text-gray-600 text-sm italic">Nobody out right now</p>
        ) : (
          active.map(e => (
            <EntryCard
              key={e.id}
              entry={e}
              name={getMemberName(e.member_id)}
              status="active"
              isAdmin={isAdmin}
              onEdit={() => openEdit(e)}
            />
          ))
        )}
      </Section>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <Section label="Upcoming" accent="border-game-standard">
          {upcoming.map(e => (
            <EntryCard
              key={e.id}
              entry={e}
              name={getMemberName(e.member_id)}
              status="upcoming"
              isAdmin={isAdmin}
              onEdit={() => openEdit(e)}
            />
          ))}
        </Section>
      )}

      {/* Past toggle */}
      {past.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowPast(p => !p)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {showPast ? '▾ Hide past' : `▸ Show past (${past.length})`}
          </button>
          {showPast && (
            <div className="mt-2 space-y-2">
              {past.map(e => (
                <EntryCard
                  key={e.id}
                  entry={e}
                  name={getMemberName(e.member_id)}
                  status="past"
                  isAdmin={isAdmin}
                  onEdit={() => openEdit(e)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {editState && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-game-card border border-game-accent rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-game-gold font-bold">
                {editState.existingId ? 'Edit Entry' : 'Add Entry'}
              </h2>
              <button onClick={() => setEditState(null)} className="text-gray-400 hover:text-white text-xl leading-none">
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Member</label>
                <select
                  value={editState.memberId}
                  onChange={e => setEditState(s => s && ({ ...s, memberId: e.target.value }))}
                  className="w-full bg-game-dark border border-game-accent rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="">— Select member —</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.Rank})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={editState.startDate}
                    onChange={e => setEditState(s => s && ({ ...s, startDate: e.target.value }))}
                    className="w-full bg-game-dark border border-game-accent rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">End Date</label>
                  <input
                    type="date"
                    value={editState.endDate}
                    onChange={e => setEditState(s => s && ({ ...s, endDate: e.target.value }))}
                    className="w-full bg-game-dark border border-game-accent rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Notes <span className="normal-case text-gray-600">(optional)</span></label>
                <input
                  type="text"
                  value={editState.notes}
                  onChange={e => setEditState(s => s && ({ ...s, notes: e.target.value }))}
                  placeholder="Reason / details (optional)"
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

function Section({
  label,
  accent,
  children,
}: {
  label: string
  accent: string
  children: ReactNode
}) {
  return (
    <div className="mb-4">
      <h2 className={`text-xs font-bold uppercase tracking-widest text-gray-400 border-l-2 pl-2 mb-2 ${accent}`}>
        {label}
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function EntryCard({
  entry,
  name,
  status,
  isAdmin,
  onEdit,
}: {
  entry: OotoEntry
  name: string
  status: 'active' | 'upcoming' | 'past'
  isAdmin: boolean
  onEdit: () => void
}) {
  const borderColor =
    status === 'active' ? 'border-game-highlight' :
    status === 'upcoming' ? 'border-game-standard' :
    'border-game-accent'

  const badgeStyle =
    status === 'active'
      ? 'bg-game-highlight text-white'
      : status === 'upcoming'
      ? 'bg-game-standard text-white'
      : 'bg-gray-700 text-gray-400'

  return (
    <div className={`bg-game-card border rounded-xl p-3 ${borderColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${badgeStyle}`}>
            {status === 'active' ? 'OUT' : status === 'upcoming' ? 'SOON' : 'DONE'}
          </span>
          <span className="font-semibold text-white truncate">{name}</span>
        </div>
        {isAdmin && (
          <button
            onClick={onEdit}
            className="text-xs text-game-standard border border-game-standard rounded px-2 py-0.5 hover:bg-game-standard hover:text-white transition-colors shrink-0 ml-2"
          >
            Edit
          </button>
        )}
      </div>
      <div className="mt-1.5 text-xs text-gray-400">
        {formatDate(entry.start_date)} → {formatDate(entry.end_date)}
        {entry.notes && <span className="ml-2 text-gray-500">· {entry.notes}</span>}
      </div>
    </div>
  )
}
