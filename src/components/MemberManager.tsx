import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Member, RankValue, SquadType } from '../lib/types'

interface MemberManagerProps {
  members: Member[]
  onRefresh: () => void
}

const RANKS: RankValue[] = ['R1', 'R2', 'R3', 'R4', 'R5']
const SQUAD_TYPES: SquadType[] = ['Tank', 'Air', 'Missile']

const RANK_COLORS: Record<RankValue, string> = {
  R1: 'bg-gray-600',
  R2: 'bg-green-700',
  R3: 'bg-game-standard',
  R4: 'bg-game-leadership',
  R5: 'bg-yellow-500',
}

function formatPower(val?: number | null): string {
  if (val == null) return '—'
  if (val === 0) return '0'
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`
  return String(val)
}

type SortKey = 'Rank' | 'name' | 'THP' | 'S1_Power' | 'S2_Power' | 'Strike_Team' | 'avg_vs'
type SortDir = 'asc' | 'desc'

interface EditState {
  name: string
  Rank: RankValue
  THP: string
  S1_Power: string
  S1_Type: SquadType | ''
  S2_Power: string
  S2_Type: SquadType | ''
  Strike_Team: boolean
  Availability: string
}

function memberToEditState(m: Member): EditState {
  return {
    name: m.name,
    Rank: m.Rank,
    THP: m.THP != null ? String(m.THP) : '',
    S1_Power: m.S1_Power != null ? String(m.S1_Power) : '',
    S1_Type: m.S1_Type ?? '',
    S2_Power: m.S2_Power != null ? String(m.S2_Power) : '',
    S2_Type: m.S2_Type ?? '',
    Strike_Team: m.Strike_Team ?? false,
    Availability: m.Availability ?? '',
  }
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <span className="text-gray-600 ml-1">↕</span>
  return <span className="text-game-gold ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
}

function rankNum(r: RankValue): number {
  return parseInt(r.slice(1))
}

export function MemberManager({ members, onRefresh }: MemberManagerProps) {
  const [avgVsMap, setAvgVsMap] = useState<Record<string, number>>({})

  useEffect(() => {
    supabase.from('vs_points').select('member_id, points').then(({ data }) => {
      if (!data) return
      const totals: Record<string, { sum: number; count: number }> = {}
      for (const row of data) {
        if (!totals[row.member_id]) totals[row.member_id] = { sum: 0, count: 0 }
        totals[row.member_id].sum += row.points
        totals[row.member_id].count += 1
      }
      const avg: Record<string, number> = {}
      for (const [id, { sum, count }] of Object.entries(totals)) {
        avg[id] = sum / count
      }
      setAvgVsMap(avg)
    })
  }, [])

  const [name, setName] = useState('')
  const [newRank, setNewRank] = useState<RankValue>('R3')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState | null>(null)

  const [sortKey, setSortKey] = useState<SortKey>('THP')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filterName, setFilterName] = useState('')
  const [filterRanks, setFilterRanks] = useState<RankValue[]>([])
  const [filterStrike, setFilterStrike] = useState<boolean | null>(null)

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  function toggleRankFilter(r: RankValue) {
    setFilterRanks((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r])
  }

  const displayed = useMemo(() => {
    let list = [...members]
    if (filterName.trim()) {
      const q = filterName.toLowerCase()
      list = list.filter((m) => m.name.toLowerCase().includes(q))
    }
    if (filterRanks.length > 0) list = list.filter((m) => filterRanks.includes(m.Rank))
    if (filterStrike !== null) list = list.filter((m) => (m.Strike_Team ?? false) === filterStrike)

    list.sort((a, b) => {
      let av: number | string = 0
      let bv: number | string = 0
      switch (sortKey) {
        case 'Rank':       av = rankNum(a.Rank);      bv = rankNum(b.Rank);      break
        case 'name':       av = a.name.toLowerCase(); bv = b.name.toLowerCase(); break
        case 'THP':        av = a.THP ?? -1;          bv = b.THP ?? -1;          break
        case 'S1_Power':   av = a.S1_Power ?? -1;     bv = b.S1_Power ?? -1;     break
        case 'S2_Power':   av = a.S2_Power ?? -1;     bv = b.S2_Power ?? -1;     break
        case 'Strike_Team': av = a.Strike_Team ? 1 : 0; bv = b.Strike_Team ? 1 : 0; break
        case 'avg_vs':      av = avgVsMap[a.id] ?? -1;  bv = avgVsMap[b.id] ?? -1;  break
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [members, filterName, filterRanks, filterStrike, sortKey, sortDir])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setAdding(true)
    try {
      const { error } = await supabase.from('members').insert({ name: name.trim(), Rank: newRank })
      if (error) throw error
      setName('')
      setNewRank('R3')
      onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member')
    }
    setAdding(false)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await supabase.from('members').delete().eq('id', id)
    setDeletingId(null)
    onRefresh()
  }

  async function handleSave(id: string) {
    if (!editState) return
    await supabase.from('members').update({
      name: editState.name.trim(),
      Rank: editState.Rank,
      THP: editState.THP !== '' ? Number(editState.THP) : null,
      S1_Power: editState.S1_Power !== '' ? Number(editState.S1_Power) : null,
      S1_Type: editState.S1_Type || null,
      S2_Power: editState.S2_Power !== '' ? Number(editState.S2_Power) : null,
      S2_Type: editState.S2_Type || null,
      Strike_Team: editState.Strike_Team,
      Availability: editState.Availability || null,
    }).eq('id', id)
    setEditingId(null)
    setEditState(null)
    onRefresh()
  }

  function set(field: keyof EditState, value: string | boolean) {
    setEditState((prev) => prev ? { ...prev, [field]: value } : prev)
  }

  const thCls = 'text-left px-3 py-2 font-semibold text-gray-300 whitespace-nowrap select-none cursor-pointer hover:text-white'
  const inputCls = 'bg-game-card border border-game-accent rounded px-1.5 py-0.5 text-white text-xs w-full focus:outline-none focus:border-game-gold'

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Members ({displayed.length} / {members.length})</h2>

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
          value={newRank}
          onChange={(e) => setNewRank(e.target.value as RankValue)}
          className="bg-game-dark border border-game-accent rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-game-gold"
        >
          {RANKS.map((r) => <option key={r} value={r}>{r}</option>)}
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
        <p className="text-game-highlight text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          placeholder="Search name..."
          className="bg-game-dark border border-game-accent rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-game-gold w-44"
        />
        <div className="flex gap-1">
          {RANKS.map((r) => (
            <button
              key={r}
              onClick={() => toggleRankFilter(r)}
              className={`text-xs font-bold px-2 py-1 rounded transition-colors ${
                filterRanks.includes(r)
                  ? `${RANK_COLORS[r]} text-white ring-2 ring-game-gold`
                  : `${RANK_COLORS[r]} text-white opacity-40 hover:opacity-70`
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <button
          onClick={() => setFilterStrike(filterStrike === true ? null : true)}
          className={`text-xs px-3 py-1 rounded border transition-colors ${
            filterStrike === true
              ? 'border-game-gold text-game-gold bg-game-gold/10'
              : 'border-game-accent text-gray-400 hover:text-white'
          }`}
        >
          Strike Team
        </button>
        {(filterName || filterRanks.length > 0 || filterStrike !== null) && (
          <button
            onClick={() => { setFilterName(''); setFilterRanks([]); setFilterStrike(null) }}
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Member grid */}
      <div className="overflow-x-auto rounded-lg border border-game-accent">
        <table className="w-full text-xs text-white border-collapse">
          <thead>
            <tr className="bg-game-card border-b border-game-accent">
              <th className={thCls} onClick={() => handleSort('Rank')}>
                Rank <SortIcon col="Rank" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={thCls} onClick={() => handleSort('name')}>
                Member <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={`${thCls} text-right`} onClick={() => handleSort('THP')}>
                THP <SortIcon col="THP" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={`${thCls} text-right`} onClick={() => handleSort('S1_Power')}>
                Sq1 Power <SortIcon col="S1_Power" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={thCls}>Sq1 Type</th>
              <th className={`${thCls} text-right`} onClick={() => handleSort('S2_Power')}>
                Sq2 Power <SortIcon col="S2_Power" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={thCls}>Sq2 Type</th>
              <th className={`${thCls} text-center`} onClick={() => handleSort('Strike_Team')}>
                Strike <SortIcon col="Strike_Team" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={`${thCls} text-right`} onClick={() => handleSort('avg_vs')}>
                Avg VS <SortIcon col="avg_vs" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={thCls}>Availability</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 && (
              <tr>
                <td colSpan={11} className="text-center text-gray-500 py-6">No members match the current filters.</td>
              </tr>
            )}
            {displayed.map((m) => (
              editingId === m.id && editState ? (
                <tr key={m.id} className="bg-game-dark border-b border-game-accent">
                  <td className="px-2 py-1.5">
                    <select value={editState.Rank} onChange={(e) => set('Rank', e.target.value)} className={inputCls}>
                      {RANKS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="text" value={editState.name} onChange={(e) => set('name', e.target.value)} placeholder="Name" required className={inputCls} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" value={editState.THP} onChange={(e) => set('THP', e.target.value)} placeholder="THP" className={inputCls} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" value={editState.S1_Power} onChange={(e) => set('S1_Power', e.target.value)} placeholder="Power" className={inputCls} />
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={editState.S1_Type} onChange={(e) => set('S1_Type', e.target.value)} className={inputCls}>
                      <option value="">—</option>
                      {SQUAD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" value={editState.S2_Power} onChange={(e) => set('S2_Power', e.target.value)} placeholder="Power" className={inputCls} />
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={editState.S2_Type} onChange={(e) => set('S2_Type', e.target.value)} className={inputCls}>
                      <option value="">—</option>
                      {SQUAD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input type="checkbox" checked={editState.Strike_Team} onChange={(e) => set('Strike_Team', e.target.checked)} className="accent-game-gold" />
                  </td>
                  <td className="px-3 py-1.5 text-right text-gray-500">
                    {avgVsMap[m.id] != null ? avgVsMap[m.id].toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—'}
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="text" value={editState.Availability} onChange={(e) => set('Availability', e.target.value)} placeholder="Availability" className={inputCls} />
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex gap-1">
                      <button onClick={() => handleSave(m.id)} className="text-green-400 text-xs px-2 py-0.5 border border-green-700 rounded hover:bg-green-900/30 whitespace-nowrap">Save</button>
                      <button onClick={() => { setEditingId(null); setEditState(null) }} className="text-gray-400 text-xs px-2 py-0.5 border border-gray-700 rounded hover:bg-gray-800 whitespace-nowrap">Cancel</button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={m.id} className="border-b border-game-accent hover:bg-game-card/50 transition-colors">
                  <td className="px-3 py-2">
                    <span className={`font-bold px-2 py-0.5 rounded ${RANK_COLORS[m.Rank]} text-white`}>
                      {m.Rank}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-white whitespace-nowrap">{m.name}</td>
                  <td className="px-3 py-2 text-right text-gray-300">{formatPower(m.THP)}</td>
                  <td className="px-3 py-2 text-right text-gray-300">{formatPower(m.S1_Power)}</td>
                  <td className="px-3 py-2 text-gray-300">{m.S1_Type ?? '—'}</td>
                  <td className="px-3 py-2 text-right text-gray-300">{formatPower(m.S2_Power)}</td>
                  <td className="px-3 py-2 text-gray-300">{m.S2_Type ?? '—'}</td>
                  <td className="px-3 py-2 text-center">
                    {m.Strike_Team ? <span className="text-game-gold font-bold">✓</span> : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-300">
                    {avgVsMap[m.id] != null ? avgVsMap[m.id].toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-300 max-w-[160px] truncate" title={m.Availability ?? undefined}>{m.Availability ?? '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setEditingId(m.id); setEditState(memberToEditState(m)) }}
                        className="text-gray-400 text-xs px-2 py-0.5 border border-gray-700 rounded hover:bg-gray-800 hover:text-white whitespace-nowrap"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        disabled={deletingId === m.id}
                        className="text-game-highlight text-xs px-2 py-0.5 border border-red-800 rounded hover:bg-red-900/30 disabled:opacity-50 whitespace-nowrap"
                      >
                        {deletingId === m.id ? '...' : 'Del'}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
