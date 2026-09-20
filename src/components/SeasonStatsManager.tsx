import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { logError } from '../lib/errorLog'
import { SEASONS } from '../lib/constants'
import { formatNumber } from '../lib/locale'
import { parseCount, buildRows, buildUpsertPayload } from '../lib/seasonStats'
import type { SeasonEdits, SeasonRow } from '../lib/seasonStats'
import type { Member, SeasonBattleStat } from '../lib/types'

interface SeasonStatsManagerProps {
  members: Member[]
}

type SortKey = 'default' | 'member' | 'participation' | 'kills'
type SortDir = 'asc' | 'desc'
type Field = 'participation' | 'kills'

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <span className="text-gray-600 ml-1">↕</span>
  return <span className="text-game-primary ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
}

export function SeasonStatsManager({ members }: SeasonStatsManagerProps) {
  const { t } = useTranslation()
  const [season, setSeason] = useState<number>(SEASONS[SEASONS.length - 1])
  const [stats, setStats] = useState<SeasonBattleStat[]>([])
  const [edits, setEdits] = useState<SeasonEdits>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterName, setFilterName] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('default')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const seasonRef = useRef(season)

  async function load(s: number) {
    setLoading(true)
    const { data, error } = await supabase.from('season_battle_stats').select('*').eq('season', s)
    if (seasonRef.current !== s) return // a newer season was selected; drop this response
    if (error) {
      setError(error.message)
      logError('SeasonStatsManager.load', error)
      setStats([])
    } else {
      setStats((data ?? []) as SeasonBattleStat[])
    }
    setLoading(false)
  }

  useEffect(() => {
    seasonRef.current = season
    setEdits({})
    setSaved(false)
    setError(null)
    load(season)
  }, [season])

  const rows = useMemo(() => buildRows(members, stats, edits), [members, stats, edits])

  const displayed = useMemo(() => {
    let list = [...rows]
    if (filterName.trim()) {
      const q = filterName.toLowerCase()
      list = list.filter(r => r.name.toLowerCase().includes(q))
    }
    if (sortKey !== 'default') {
      list.sort((a, b) => {
        const av = sortKey === 'member' ? a.name.toLowerCase() : a[sortKey]
        const bv = sortKey === 'member' ? b.name.toLowerCase() : b[sortKey]
        if (av < bv) return sortDir === 'asc' ? -1 : 1
        if (av > bv) return sortDir === 'asc' ? 1 : -1
        return 0
      })
    }
    return list
  }, [rows, filterName, sortKey, sortDir])

  const pendingCount = Object.keys(edits).length

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  function handleChange(row: SeasonRow, field: Field, raw: string) {
    const value = parseCount(raw)
    if (value === null) return // ignore invalid keystrokes
    setEdits(prev => ({
      ...prev,
      [row.memberId]: { participation: row.participation, kills: row.kills, [field]: value },
    }))
    setSaved(false)
  }

  async function handleSave() {
    const payload = buildUpsertPayload(season, edits, new Date().toISOString())
    if (payload.length === 0) return
    setSaving(true)
    setError(null)
    const { error } = await supabase
      .from('season_battle_stats')
      .upsert(payload, { onConflict: 'season,member_id' })
    setSaving(false)
    if (error) {
      setError(error.message)
      logError('SeasonStatsManager.handleSave', error)
      return
    }
    setEdits({})
    setSaved(true)
    load(season)
  }

  const thCls = 'text-left px-3 py-2 font-semibold text-gray-300 whitespace-nowrap select-none cursor-pointer hover:text-white'
  const inputCls = 'w-28 bg-game-dark border border-game-accent rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-game-primary'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-bold text-white">{t('seasonStats.heading')}</h2>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400 uppercase tracking-wide">{t('seasonStats.seasonLabel')}</label>
          <select
            value={season}
            onChange={e => setSeason(Number(e.target.value))}
            className="bg-game-dark border border-game-accent rounded-lg px-3 py-1.5 text-white text-sm"
          >
            {SEASONS.map(s => (
              <option key={s} value={s}>{t('seasonStats.seasonOption', { season: s })}</option>
            ))}
          </select>
          <button
            onClick={handleSave}
            disabled={saving || pendingCount === 0}
            className="text-xs bg-game-highlight text-white font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={filterName}
          onChange={e => setFilterName(e.target.value)}
          placeholder={t('common.searchMemberPlaceholder')}
          className="bg-game-dark border border-game-accent rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-game-primary w-48"
        />
        {filterName && (
          <button onClick={() => setFilterName('')} className="text-xs text-gray-500 hover:text-white transition-colors">
            {t('common.clear')}
          </button>
        )}
        {pendingCount > 0 && (
          <span className="text-xs text-yellow-400">{t('seasonStats.pendingChanges', { count: pendingCount })}</span>
        )}
        {saved && pendingCount === 0 && <span className="text-xs text-green-400">{t('seasonStats.saved')}</span>}
      </div>

      {error && (
        <p className="text-game-highlight text-xs bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</p>
      )}

      {loading && <p className="text-gray-400 text-sm animate-pulse">{t('common.loading')}</p>}

      {!loading && (
        <div className="overflow-x-auto rounded-lg border border-game-accent">
          <table className="w-full text-xs text-white border-collapse">
            <thead>
              <tr className="bg-game-card border-b border-game-accent">
                <th className={thCls} onClick={() => handleSort('member')}>
                  {t('common.member')} <SortIcon col="member" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className={thCls} onClick={() => handleSort('participation')}>
                  {t('seasonStats.colParticipation')} <SortIcon col="participation" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className={thCls} onClick={() => handleSort('kills')}>
                  {t('seasonStats.colKills')} <SortIcon col="kills" sortKey={sortKey} sortDir={sortDir} />
                </th>
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-gray-500 py-6 italic">
                    {rows.length === 0 ? t('seasonStats.emptyNoMembers') : t('common.emptyNoMembersMatch')}
                  </td>
                </tr>
              )}
              {displayed.map(r => (
                <tr
                  key={r.memberId}
                  className={`border-b border-game-accent transition-colors ${r.edited ? 'bg-yellow-900/10' : 'hover:bg-game-card/50'}`}
                >
                  <td className="px-3 py-2 font-semibold text-white whitespace-nowrap">
                    {r.name} <span className="text-gray-500 font-normal">({r.rank})</span>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      value={r.participation}
                      onFocus={e => e.target.select()}
                      onChange={e => handleChange(r, 'participation', e.target.value)}
                      className={inputCls}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      value={r.kills}
                      onFocus={e => e.target.select()}
                      onChange={e => handleChange(r, 'kills', e.target.value)}
                      className={inputCls}
                      title={formatNumber(r.kills)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
