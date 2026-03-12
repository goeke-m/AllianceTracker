import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { KillListEntry } from '../lib/types'

interface KillListProps {
  isAdmin: boolean
}

interface FormState {
  id?: string
  name: string
  server: string
  reason: string
}

type SortKey = 'name' | 'server' | 'reason'
type SortDir = 'asc' | 'desc'

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <span className="text-gray-600 ml-1">↕</span>
  return <span className="text-game-gold ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
}

export function KillList({ isAdmin }: KillListProps) {
  const [entries, setEntries] = useState<KillListEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [filterText, setFilterText] = useState('')

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('kill_list').select('*')
    if (!error && data) setEntries(data as KillListEntry[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const displayed = useMemo(() => {
    let list = [...entries]
    if (filterText.trim()) {
      const q = filterText.toLowerCase()
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) || e.server.toLowerCase().includes(q)
      )
    }
    list.sort((a, b) => {
      const av = (a[sortKey] ?? '').toLowerCase()
      const bv = (b[sortKey] ?? '').toLowerCase()
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [entries, filterText, sortKey, sortDir])

  function openAdd() {
    setForm({ name: '', server: '', reason: '' })
    setError(null)
  }

  function openEdit(entry: KillListEntry) {
    setForm({ id: entry.id, name: entry.name, server: entry.server, reason: entry.reason ?? '' })
    setError(null)
  }

  async function handleSave() {
    if (!form) return
    if (!form.name.trim() || !form.server.trim()) {
      setError('Name and server are required.')
      return
    }
    setSaving(true)
    setError(null)
    const payload = {
      name: form.name.trim(),
      server: form.server.trim(),
      reason: form.reason.trim() || null,
    }
    const { error } = form.id
      ? await supabase.from('kill_list').update(payload).eq('id', form.id)
      : await supabase.from('kill_list').insert(payload)
    setSaving(false)
    if (error) {
      setError(error.message)
    } else {
      setForm(null)
      load()
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await supabase.from('kill_list').delete().eq('id', id)
    setDeletingId(null)
    load()
  }

  const thCls = 'text-left px-3 py-2 font-semibold text-gray-300 whitespace-nowrap select-none cursor-pointer hover:text-white'

  return (
    <div className="p-4 pb-24 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-game-highlight">
          ⚔️ Kill List ({displayed.length}{displayed.length !== entries.length ? ` / ${entries.length}` : ''})
        </h1>
        {isAdmin && (
          <button
            onClick={openAdd}
            className="text-xs bg-game-highlight text-white font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            + Add
          </button>
        )}
      </div>

      <div className="flex gap-2 items-center">
        <input
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
          placeholder="Search name or server..."
          className="bg-game-dark border border-game-accent rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-game-gold w-56"
        />
        {filterText && (
          <button onClick={() => setFilterText('')} className="text-xs text-gray-500 hover:text-white transition-colors">
            Clear
          </button>
        )}
      </div>

      {loading && <p className="text-gray-400 text-sm animate-pulse">Loading...</p>}

      {!loading && (
        <div className="overflow-x-auto rounded-lg border border-game-accent">
          <table className="w-full text-xs text-white border-collapse">
            <thead>
              <tr className="bg-game-card border-b border-game-accent">
                <th className={thCls} onClick={() => handleSort('name')}>
                  Name <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className={thCls} onClick={() => handleSort('server')}>
                  Server <SortIcon col="server" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className={thCls} onClick={() => handleSort('reason')}>
                  Reason <SortIcon col="reason" sortKey={sortKey} sortDir={sortDir} />
                </th>
                {isAdmin && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 4 : 3} className="text-center text-gray-500 py-6 italic">
                    {entries.length === 0 ? 'No entries on the kill list.' : 'No entries match the filter.'}
                  </td>
                </tr>
              )}
              {displayed.map(e => (
                <tr key={e.id} className="border-b border-game-accent hover:bg-game-card/50 transition-colors">
                  <td className="px-3 py-2 font-semibold text-white whitespace-nowrap">{e.name}</td>
                  <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{e.server}</td>
                  <td className="px-3 py-2 text-gray-400">{e.reason ?? '—'}</td>
                  {isAdmin && (
                    <td className="px-3 py-2 flex gap-1 justify-end">
                      <button
                        onClick={() => openEdit(e)}
                        className="text-xs px-2 py-0.5 border border-game-accent rounded hover:bg-game-card/80 whitespace-nowrap"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(e.id)}
                        disabled={deletingId === e.id}
                        className="text-game-highlight text-xs px-2 py-0.5 border border-red-800 rounded hover:bg-red-900/30 disabled:opacity-50 whitespace-nowrap"
                      >
                        {deletingId === e.id ? '...' : 'Del'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-game-card border border-game-accent rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-game-highlight font-bold">{form.id ? 'Edit' : 'Add'} Kill List Entry</h2>
              <button onClick={() => setForm(null)} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(s => s && ({ ...s, name: e.target.value }))}
                  placeholder="Player name"
                  className="w-full bg-game-dark border border-game-accent rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-game-gold"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Server *</label>
                <input
                  type="text"
                  value={form.server}
                  onChange={e => setForm(s => s && ({ ...s, server: e.target.value }))}
                  placeholder="Server name"
                  className="w-full bg-game-dark border border-game-accent rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-game-gold"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Reason</label>
                <input
                  type="text"
                  value={form.reason}
                  onChange={e => setForm(s => s && ({ ...s, reason: e.target.value }))}
                  placeholder="Optional reason"
                  className="w-full bg-game-dark border border-game-accent rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-game-gold"
                />
              </div>
            </div>

            {error && <p className="text-game-highlight text-sm">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setForm(null)}
                disabled={saving}
                className="flex-1 text-sm text-gray-400 border border-gray-600 rounded-lg py-2 hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 text-sm bg-game-highlight text-white rounded-lg py-2 font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
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
