import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { logError } from '../lib/errorLog'
import type { Member, VsPoint } from '../lib/types'
import { formatNumber } from '../lib/locale'

interface VsPointManagerProps {
  members: Member[]
}

function sunday(offset = 0): string {
  const d = new Date()
  const day = d.getDay() // 0=Sun
  const diff = (7 - day) % 7 + offset * 7
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${m}/${d}/${y.slice(2)}`
}

type SortKey = 'member' | 'week_ending' | 'points'
type SortDir = 'asc' | 'desc'

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <span className="text-gray-600 ml-1">↕</span>
  return <span className="text-game-gold ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
}

interface FormState {
  memberId: string
  weekEnding: string
  points: string
}

interface JsonRow {
  name?: string
  member?: string
  player?: string
  week_ending?: string
  weekEnding?: string
  week?: string
  points: number
}

export function VsPointManager({ members }: VsPointManagerProps) {
  const { t } = useTranslation()
  const [rows, setRows] = useState<VsPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [sortKey, setSortKey] = useState<SortKey>('week_ending')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filterName, setFilterName] = useState('')

  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('vs_points').select('*')
    if (!error && data) setRows(data as VsPoint[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function getMemberName(id: string): string {
    return members.find(m => m.id === id)?.name ?? '—'
  }

  function findMemberId(name: string): string | null {
    const n = name.trim().toLowerCase()
    return members.find(m => m.name.toLowerCase() === n)?.id ?? null
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const displayed = useMemo(() => {
    let list = [...rows]
    if (filterName.trim()) {
      const q = filterName.toLowerCase()
      list = list.filter(r => getMemberName(r.member_id).toLowerCase().includes(q))
    }
    list.sort((a, b) => {
      let av: string | number = ''
      let bv: string | number = ''
      if (sortKey === 'member') { av = getMemberName(a.member_id).toLowerCase(); bv = getMemberName(b.member_id).toLowerCase() }
      else if (sortKey === 'week_ending') { av = a.week_ending; bv = b.week_ending }
      else if (sortKey === 'points') { av = a.points; bv = b.points }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, filterName, sortKey, sortDir, members])

  function openAdd() {
    setForm({ memberId: '', weekEnding: sunday(), points: '' })
    setError(null)
  }

  async function handleSave() {
    if (!form) return
    const pts = Number(form.points)
    if (!form.memberId || !form.weekEnding || isNaN(pts)) {
      setError(t('vsPoints.validationRequired'))
      return
    }
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('vs_points').insert({
      member_id: form.memberId,
      week_ending: form.weekEnding,
      points: pts,
    })
    setSaving(false)
    if (error) {
      setError(error.message)
      logError('VsPointManager.handleSave', error)
    } else {
      setForm(null)
      load()
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await supabase.from('vs_points').delete().eq('id', id)
    setDeletingId(null)
    load()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)
    setImportSuccess(null)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)
        const arr: JsonRow[] = Array.isArray(parsed) ? parsed : [parsed]

        const inserts: { member_id: string; week_ending: string; points: number }[] = []
        const skipped: string[] = []

        for (const row of arr) {
          const rawName = row.name ?? row.member ?? row.player ?? ''
          const rawDate = row.week_ending ?? row.weekEnding ?? row.week ?? ''
          const memberId = findMemberId(rawName)
          if (!memberId) { skipped.push(rawName || t('vsPoints.unknownName')); continue }
          if (!rawDate || isNaN(Number(row.points))) { skipped.push(rawName); continue }
          inserts.push({ member_id: memberId, week_ending: rawDate, points: Number(row.points) })
        }

        if (inserts.length === 0) {
          setImportError(`${t('vsPoints.importNoValidRows')}${skipped.length ? ` ${t('vsPoints.importSkippedSuffix')}${skipped.join(', ')}` : ''}`)
          return
        }

        setImporting(true)
        const { error } = await supabase.from('vs_points').insert(inserts)
        setImporting(false)
        if (error) {
          setImportError(error.message)
          logError('VsPointManager.handleFileChange', error)
          return
        }
        setImportSuccess(`${t('vsPoints.importSuccess', { count: inserts.length })}${skipped.length ? ` ${t('vsPoints.importSkippedSuffix')}${skipped.join(', ')}` : ''}`)
        load()
      } catch {
        setImportError(t('vsPoints.invalidJsonFile'))
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const thCls = 'text-left px-3 py-2 font-semibold text-gray-300 whitespace-nowrap select-none cursor-pointer hover:text-white'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">
          {t('vsPoints.heading', { count: `${displayed.length}${displayed.length !== rows.length ? ` / ${rows.length}` : ''}` })}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="text-xs bg-game-accent text-white font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {importing ? t('common.importing') : t('vsPoints.importButton')}
          </button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
          <button
            onClick={openAdd}
            className="text-xs bg-game-highlight text-white font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            {t('common.addButton')}
          </button>
        </div>
      </div>

      {importError && (
        <p className="text-game-highlight text-xs bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{importError}</p>
      )}
      {importSuccess && (
        <p className="text-green-400 text-xs bg-green-900/20 border border-green-800 rounded-lg px-3 py-2">{importSuccess}</p>
      )}

      <div className="text-xs text-gray-500">
        {t('vsPoints.jsonFormatLabel')}<code className="text-gray-400">[{`{"name":"...", "week_ending":"YYYY-MM-DD", "points": 1234}`}]</code>
      </div>

      {/* Filter */}
      <div className="flex gap-2 items-center">
        <input
          value={filterName}
          onChange={e => setFilterName(e.target.value)}
          placeholder={t('common.searchMemberPlaceholder')}
          className="bg-game-dark border border-game-accent rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-game-gold w-48"
        />
        {filterName && (
          <button onClick={() => setFilterName('')} className="text-xs text-gray-500 hover:text-white transition-colors">
            {t('common.clear')}
          </button>
        )}
      </div>

      {loading && <p className="text-gray-400 text-sm animate-pulse">{t('common.loading')}</p>}

      {!loading && (
        <div className="overflow-x-auto rounded-lg border border-game-accent">
          <table className="w-full text-xs text-white border-collapse">
            <thead>
              <tr className="bg-game-card border-b border-game-accent">
                <th className={thCls} onClick={() => handleSort('member')}>
                  {t('common.member')} <SortIcon col="member" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className={thCls} onClick={() => handleSort('week_ending')}>
                  {t('vsPoints.colWeekEnding')} <SortIcon col="week_ending" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className={thCls} onClick={() => handleSort('points')}>
                  {t('vsPoints.colPoints')} <SortIcon col="points" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-gray-500 py-6 italic">
                    {rows.length === 0 ? t('vsPoints.emptyNone') : t('common.emptyNoMembersMatch')}
                  </td>
                </tr>
              )}
              {displayed.map(r => (
                <tr key={r.id} className="border-b border-game-accent hover:bg-game-card/50 transition-colors">
                  <td className="px-3 py-2 font-semibold text-white whitespace-nowrap">{getMemberName(r.member_id)}</td>
                  <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{formatDate(r.week_ending)}</td>
                  <td className="px-3 py-2 text-gray-300">{formatNumber(r.points)}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleDelete(r.id)}
                      disabled={deletingId === r.id}
                      className="text-game-highlight text-xs px-2 py-0.5 border border-red-800 rounded hover:bg-red-900/30 disabled:opacity-50 whitespace-nowrap"
                    >
                      {deletingId === r.id ? t('common.deletingIndicator') : t('common.deleteShort')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {form && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-game-card border border-game-accent rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-game-gold font-bold">{t('vsPoints.modalTitleAdd')}</h2>
              <button onClick={() => setForm(null)} className="text-gray-400 hover:text-white text-xl leading-none">
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">{t('common.member')}</label>
                <select
                  value={form.memberId}
                  onChange={e => setForm(s => s && ({ ...s, memberId: e.target.value }))}
                  className="w-full bg-game-dark border border-game-accent rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="">{t('common.selectMemberPlaceholder')}</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.Rank})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">{t('vsPoints.colWeekEnding')}</label>
                <input
                  type="date"
                  value={form.weekEnding}
                  onChange={e => setForm(s => s && ({ ...s, weekEnding: e.target.value }))}
                  className="w-full bg-game-dark border border-game-accent rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">{t('vsPoints.colPoints')}</label>
                <input
                  type="number"
                  min="0"
                  value={form.points}
                  onChange={e => setForm(s => s && ({ ...s, points: e.target.value }))}
                  placeholder={t('vsPoints.pointsPlaceholder')}
                  className="w-full bg-game-dark border border-game-accent rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600"
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
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 text-sm bg-game-highlight text-white rounded-lg py-2 font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
