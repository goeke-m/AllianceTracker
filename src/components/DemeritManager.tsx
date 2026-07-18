import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { logError } from '../lib/errorLog'
import type { Member, Demerit } from '../lib/types'

interface DemeritManagerProps {
  members: Member[]
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${m}/${d}/${y.slice(2)}`
}

interface FormState {
  memberId: string
  date: string
  note: string
}

type SortKey = 'member' | 'date' | 'note'
type SortDir = 'asc' | 'desc'

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <span className="text-gray-600 ml-1">↕</span>
  return <span className="text-game-gold ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
}

export function DemeritManager({ members }: DemeritManagerProps) {
  const { t } = useTranslation()
  const [demerits, setDemerits] = useState<Demerit[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filterName, setFilterName] = useState('')

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('demerits').select('*')
    if (!error && data) setDemerits(data as Demerit[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function getMemberName(id: string): string {
    return members.find(m => m.id === id)?.name ?? '—'
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const displayed = useMemo(() => {
    let list = [...demerits]

    if (filterName.trim()) {
      const q = filterName.toLowerCase()
      list = list.filter(d => getMemberName(d.member_id).toLowerCase().includes(q))
    }

    list.sort((a, b) => {
      let av = ''
      let bv = ''
      if (sortKey === 'member') { av = getMemberName(a.member_id).toLowerCase(); bv = getMemberName(b.member_id).toLowerCase() }
      else if (sortKey === 'date') { av = a.date; bv = b.date }
      else if (sortKey === 'note') { av = a.note.toLowerCase(); bv = b.note.toLowerCase() }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return list
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demerits, filterName, sortKey, sortDir, members])

  function openAdd() {
    setForm({ memberId: '', date: today(), note: '' })
    setError(null)
  }

  async function handleSave() {
    if (!form) return
    if (!form.memberId || !form.date || !form.note.trim()) {
      setError(t('demerits.validationRequired'))
      return
    }
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('demerits').insert({
      member_id: form.memberId,
      date: form.date,
      note: form.note.trim(),
    })
    setSaving(false)
    if (error) {
      setError(error.message)
      logError('DemeritManager.handleSave', error)
    } else {
      setForm(null)
      load()
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await supabase.from('demerits').delete().eq('id', id)
    setDeletingId(null)
    load()
  }

  const thCls = 'text-left px-3 py-2 font-semibold text-gray-300 whitespace-nowrap select-none cursor-pointer hover:text-white'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">{t('demerits.heading', { count: `${displayed.length}${displayed.length !== demerits.length ? ` / ${demerits.length}` : ''}` })}</h2>
        <button
          onClick={openAdd}
          className="text-xs bg-game-highlight text-white font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
        >
          {t('common.addButton')}
        </button>
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
                <th className={thCls} onClick={() => handleSort('date')}>
                  {t('common.date')} <SortIcon col="date" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className={thCls} onClick={() => handleSort('note')}>
                  {t('demerits.colNote')} <SortIcon col="note" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-gray-500 py-6 italic">
                    {demerits.length === 0 ? t('demerits.emptyNone') : t('common.emptyNoMembersMatch')}
                  </td>
                </tr>
              )}
              {displayed.map(d => (
                <tr key={d.id} className="border-b border-game-accent hover:bg-game-card/50 transition-colors">
                  <td className="px-3 py-2 font-semibold text-white whitespace-nowrap">{getMemberName(d.member_id)}</td>
                  <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{formatDate(d.date)}</td>
                  <td className="px-3 py-2 text-gray-300">{d.note}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleDelete(d.id)}
                      disabled={deletingId === d.id}
                      className="text-game-highlight text-xs px-2 py-0.5 border border-red-800 rounded hover:bg-red-900/30 disabled:opacity-50 whitespace-nowrap"
                    >
                      {deletingId === d.id ? t('common.deletingIndicator') : t('common.deleteShort')}
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
              <h2 className="text-game-gold font-bold">{t('demerits.modalTitleAdd')}</h2>
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
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">{t('common.date')}</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(s => s && ({ ...s, date: e.target.value }))}
                  className="w-full bg-game-dark border border-game-accent rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">{t('demerits.colNote')}</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={e => setForm(s => s && ({ ...s, note: e.target.value }))}
                  placeholder={t('demerits.notePlaceholder')}
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
