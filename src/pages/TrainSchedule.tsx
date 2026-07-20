import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useTrainSchedule } from '../hooks/useTrainSchedule'
import { useScheduleSettings } from '../hooks/useScheduleSettings'
import { useAuth } from '../hooks/useAuth'
import { logError } from '../lib/errorLog'
import type { TrainEntry, WeekMode } from '../lib/types'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const R4_ROTATION = [
  'Ruthless Cajun',
  'skibidi rizz toilet5',
  'PAINisthebestTeacher',
  'Dhilldo',
  '50 Cal Diplomacy',
  'Tricky100original',
  'CatWoman',
  'Buccaneer Blaidd',
  'Saucy808',
  'WapitiDreaming',
  'ShadowMohawk',
]

function buildDowSources(mode: WeekMode, t: TFunction): Record<string, { captain: string; firstMate: string }> {
  const metric = mode === 'push' ? t('schedule.metricVsScorer') : t('schedule.metricDonator')
  return {
    Sun: { captain: t('schedule.sourceWeeklyTop', { metric }), firstMate: t('schedule.sourceTopSat', { metric }) },
    Mon: { captain: t('schedule.sourceDsTopScorer'), firstMate: t('schedule.sourceCanyonTopScorer') },
    Tue: { captain: t('schedule.sourceAllianceMvp'), firstMate: t('schedule.sourceTopMon', { metric }) },
    Wed: { captain: t('schedule.sourceR4Rotation'), firstMate: t('schedule.sourceTopTue', { metric }) },
    Thu: { captain: t('schedule.sourceR4Rotation'), firstMate: t('schedule.sourceTopWed', { metric }) },
    Fri: { captain: t('schedule.sourceR4Rotation'), firstMate: t('schedule.sourceTopThu', { metric }) },
    Sat: { captain: t('schedule.sourceR4Rotation'), firstMate: t('schedule.sourceTopFri', { metric }) },
  }
}

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
  const { t } = useTranslation()
  const { isAdmin } = useAuth()
  const { members, entries, weekDates, loading, error, saveEntry, deleteEntry } = useTrainSchedule()
  const { weekMode, setWeekMode } = useScheduleSettings()
  const [editState, setEditState] = useState<EditState | null>(null)
  const [showR4Info, setShowR4Info] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [modeSaving, setModeSaving] = useState(false)
  const [modeError, setModeError] = useState<string | null>(null)

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const entryByDate = new Map<string, TrainEntry>()
  for (const e of entries) {
    entryByDate.set(e.date, e)
  }

  const dowSources = buildDowSources(weekMode, t)

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
      setSaveError(err instanceof Error ? err.message : t('common.saveFailed'))
      logError('TrainSchedule.handleSave', err)
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
      setSaveError(err instanceof Error ? err.message : t('common.deleteFailed'))
      logError('TrainSchedule.handleDelete', err)
    } finally {
      setSaving(false)
    }
  }

  function getMemberName(id: string): string {
    return members.find(m => m.id === id)?.name ?? '—'
  }

  async function handleWeekModeChange(mode: WeekMode) {
    if (mode === weekMode || modeSaving) return
    setModeSaving(true)
    setModeError(null)
    try {
      await setWeekMode(mode)
    } catch (err) {
      setModeError(err instanceof Error ? err.message : t('schedule.weekModeUpdateFailed'))
      logError('TrainSchedule.handleWeekModeChange', err)
    } finally {
      setModeSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 pb-24 flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-400 animate-pulse">{t('profileBar.loadingText')}</p>
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
      <div className="flex items-start justify-between mb-1 gap-2">
        <h1 className="text-xl font-bold text-game-primary">{t('schedule.title')}</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-full border border-game-accent overflow-hidden text-xs">
            {(['push', 'save'] as const).map(mode => {
              const active = mode === weekMode
              const label = mode === 'push' ? t('schedule.pushWeek') : t('schedule.saveWeek')
              const baseClass = `px-2 py-1 font-semibold transition-colors ${
                active ? 'bg-game-primary text-game-dark' : 'text-gray-400'
              }`
              if (!isAdmin) {
                return <span key={mode} className={baseClass}>{label}</span>
              }
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleWeekModeChange(mode)}
                  disabled={active || modeSaving}
                  className={`${baseClass} ${!active ? 'hover:text-white' : ''} disabled:cursor-default`}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setShowR4Info(true)}
            className="text-game-standard hover:text-white transition-colors text-sm flex items-center gap-1"
            title={t('schedule.r4RotationTitleAttr')}
          >
            <span>{t('schedule.r4RotationLabel')}</span>
            <span>ⓘ</span>
          </button>
        </div>
      </div>
      {modeError && <p className="text-game-highlight text-xs mb-1">{modeError}</p>}

      <div className="space-y-2">
        {weekDates.map(date => {
          const entry = entryByDate.get(date)
          const isToday = date === todayStr
          const sources = dowSources[getDow(date)]

          return (
            <div
              key={date}
              className={`bg-game-card border rounded-xl p-3 ${isToday ? 'border-game-primary' : 'border-game-accent'}`}
            >
              {/* Date header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-game-primary font-bold text-sm w-8">{t(`schedule.dow.${getDow(date)}`)}</span>
                  <span className="text-gray-300 text-sm">{formatDate(date)}</span>
                  {isToday && (
                    <span className="text-xs bg-game-primary text-game-dark font-bold px-1.5 py-0.5 rounded">
                      {t('schedule.today')}
                    </span>
                  )}
                </div>
                {isAdmin && (
                  <button
                    onClick={() => openEdit(date)}
                    className="text-xs text-game-standard border border-game-standard rounded px-2 py-0.5 hover:bg-game-standard hover:text-white transition-colors"
                  >
                    {entry ? t('common.edit') : t('schedule.setEntry')}
                  </button>
                )}
              </div>

              {/* Entry content */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wide">{t('schedule.captainColumnLabel')}</span>
                  <p className="text-gray-400 text-xs italic">{sources.captain}</p>
                  {entry && <p className="text-white font-medium">{getMemberName(entry.conductor)}</p>}
                </div>
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wide">{t('schedule.firstMateColumnLabel')}</span>
                  <p className="text-gray-400 text-xs italic">{sources.firstMate}</p>
                  {entry && <p className="text-white font-medium">{getMemberName(entry.vip)}</p>}
                </div>
                {entry?.notes && (
                  <div className="col-span-2 mt-1">
                    <span className="text-gray-500 text-xs uppercase tracking-wide">{t('schedule.captainsLogLabel')}</span>
                    <p className="text-gray-300 text-xs">{entry.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* R4 rotation info modal */}
      {showR4Info && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-game-card border border-game-accent rounded-2xl w-full max-w-xs p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-game-primary font-bold">{t('schedule.r4RotationLabel')}</h2>
              <button onClick={() => setShowR4Info(false)} className="text-gray-400 hover:text-white text-xl leading-none">
                ×
              </button>
            </div>
            <ol className="space-y-1">
              {R4_ROTATION.map((name, i) => (
                <li key={name} className="flex items-center gap-2 text-sm">
                  <span className="text-game-primary font-bold w-5 text-right shrink-0">{i + 1}.</span>
                  <span className="text-white">{name}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editState && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-game-card border border-game-accent rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-game-primary font-bold">
                {t(`schedule.dow.${getDow(editState.date)}`)} {formatDate(editState.date)}
              </h2>
              <button onClick={() => setEditState(null)} className="text-gray-400 hover:text-white text-xl leading-none">
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">{t('schedule.captainColumnLabel')}</label>
                <select
                  value={editState.conductorId}
                  onChange={e => setEditState(s => s && ({ ...s, conductorId: e.target.value }))}
                  className="w-full bg-game-dark border border-game-accent rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="">{t('common.selectMemberPlaceholder')}</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.Rank})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">{t('schedule.firstMateColumnLabel')}</label>
                <select
                  value={editState.vipId}
                  onChange={e => setEditState(s => s && ({ ...s, vipId: e.target.value }))}
                  className="w-full bg-game-dark border border-game-accent rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="">{t('common.selectMemberPlaceholder')}</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.Rank})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">{t('schedule.captainsLogLabel')}</label>
                <input
                  type="text"
                  value={editState.notes}
                  onChange={e => setEditState(s => s && ({ ...s, notes: e.target.value }))}
                  placeholder={t('schedule.notesPlaceholder')}
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
                  {t('common.delete')}
                </button>
              )}
              <button
                onClick={() => setEditState(null)}
                disabled={saving}
                className="flex-1 text-sm text-gray-400 border border-gray-600 rounded-lg py-2 hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 text-sm bg-game-standard text-white rounded-lg py-2 font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
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
