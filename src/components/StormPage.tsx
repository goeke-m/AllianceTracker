import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useAuth } from '../hooks/useAuth'
import { useStormEvent } from '../hooks/useStormEvent'
import { logError } from '../lib/errorLog'
import { formatNumber } from '../lib/locale'
import type { AttendanceStatus, Member, StormConfig, StormRosterEntry } from '../lib/types'

function formatWeekStart(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${m}/${d}/${y.slice(2)}`
}

function nextAttendance(
  current: AttendanceStatus | null,
  statuses: AttendanceStatus[]
): AttendanceStatus | null {
  if (current === null) return statuses[0]
  const idx = statuses.indexOf(current)
  if (idx === statuses.length - 1) return null
  return statuses[idx + 1]
}

function attendancePillClass(attendance: AttendanceStatus | null): string {
  switch (attendance) {
    case 'present': return 'bg-green-700 text-white'
    case 'no_show': return 'bg-red-700 text-white'
    case 'subbed_in': return 'bg-blue-700 text-white'
    default: return 'bg-gray-700 text-gray-300'
  }
}

function attendanceLabel(attendance: AttendanceStatus | null, t: TFunction): string {
  switch (attendance) {
    case 'present': return t('storm.present')
    case 'no_show': return t('storm.noShow')
    case 'subbed_in': return t('storm.subbedIn')
    default: return '—'
  }
}

function rankNum(rank: string | undefined): number {
  return rank ? parseInt(rank.slice(1), 10) : 0
}

function compareMembersByRankThenName(a: Member | undefined, b: Member | undefined): number {
  const rankDiff = rankNum(b?.Rank) - rankNum(a?.Rank)
  if (rankDiff !== 0) return rankDiff
  return (a?.name ?? '').localeCompare(b?.name ?? '')
}

interface AddingTo {
  team: 'A' | 'B'
  role: 'participant' | 'substitute'
}

interface TeamPanelProps {
  team: 'A' | 'B'
  config: StormConfig
  roster: StormRosterEntry[]
  members: Member[]
  totalPower: number
  isAdmin: boolean
  isPastWeek: boolean
  actionError: string | null
  onAdd: (to: AddingTo) => void
  onRemove: (rosterId: string) => void
  onCycleAttendance: (rosterId: string, current: AttendanceStatus | null) => void
}

function TeamPanel({
  team, config, roster, members, totalPower,
  isAdmin, isPastWeek, actionError,
  onAdd, onRemove, onCycleAttendance,
}: TeamPanelProps) {
  const { t } = useTranslation()
  const participants = roster
    .filter(r => r.team === team && r.role === 'participant')
    .sort((a, b) => compareMembersByRankThenName(getMember(a.member_id), getMember(b.member_id)))
  const substitutes = roster
    .filter(r => r.team === team && r.role === 'substitute')
    .sort((a, b) => compareMembersByRankThenName(getMember(a.member_id), getMember(b.member_id)))

  function getMember(memberId: string): Member | undefined {
    return members.find(m => m.id === memberId)
  }

  function renderRow(entry: StormRosterEntry) {
    const member = getMember(entry.member_id)
    return (
      <div
        key={entry.id}
        className="flex items-center justify-between py-1.5 border-b border-game-accent last:border-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-white text-sm font-medium truncate">{member?.name ?? '—'}</span>
          <span className="text-gray-400 text-xs shrink-0">{member?.Rank}</span>
          {member?.THP != null && (
            <span className="text-gray-400 text-xs shrink-0">
              {formatNumber(member.THP)}
            </span>
          )}
        </div>
        {isAdmin ? (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onCycleAttendance(entry.id, entry.attendance)}
              className={`text-xs px-2 py-0.5 rounded font-medium transition-opacity hover:opacity-80 ${attendancePillClass(entry.attendance)}`}
            >
              {attendanceLabel(entry.attendance, t)}
            </button>
            {!isPastWeek && (
              <button
                onClick={() => onRemove(entry.id)}
                className="text-gray-500 hover:text-game-highlight text-lg leading-none px-1 transition-colors"
                aria-label={t('storm.removeMemberAriaLabel')}
              >
                ×
              </button>
            )}
          </div>
        ) : (
          entry.attendance && (
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${attendancePillClass(entry.attendance)}`}>
              {attendanceLabel(entry.attendance, t)}
            </span>
          )
        )}
      </div>
    )
  }

  return (
    <div className="bg-game-card border border-game-accent rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-game-primary font-bold">{t('storm.teamLabel', { team })}</h2>
          <span className="text-gray-400 text-xs">
            {participants.length}/{config.participantCap}
            {config.substituteCap > 0 && t('storm.subsCountSuffix', { count: substitutes.length, cap: config.substituteCap })}
          </span>
        </div>
        <span className="text-xs text-gray-300">
          {totalPower > 0 ? `${formatNumber(totalPower)} ${t('storm.thpUnit')}` : '—'}
        </span>
      </div>

      {actionError && <p className="text-game-highlight text-xs mb-2">{actionError}</p>}

      {/* Participants */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500 uppercase tracking-wide">{t('storm.participantsLabel')}</span>
          {isAdmin && !isPastWeek && participants.length < config.participantCap && (
            <button
              onClick={() => onAdd({ team, role: 'participant' })}
              className="text-xs text-game-standard border border-game-standard rounded px-2 py-0.5 hover:bg-game-standard hover:text-white transition-colors"
            >
              {t('common.addButton')}
            </button>
          )}
        </div>
        {participants.length === 0 ? (
          <p className="text-gray-600 text-xs italic">{t('storm.noParticipantsAssigned')}</p>
        ) : (
          participants.map(renderRow)
        )}
      </div>

      {/* Substitutes — only shown when config.substituteCap > 0 */}
      {config.substituteCap > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 uppercase tracking-wide">{t('storm.substitutesLabel')}</span>
            {isAdmin && !isPastWeek && substitutes.length < config.substituteCap && (
              <button
                onClick={() => onAdd({ team, role: 'substitute' })}
                className="text-xs text-game-standard border border-game-standard rounded px-2 py-0.5 hover:bg-game-standard hover:text-white transition-colors"
              >
                {t('common.addButton')}
              </button>
            )}
          </div>
          {substitutes.length === 0 ? (
            <p className="text-gray-600 text-xs italic">{t('storm.noSubstitutesAssigned')}</p>
          ) : (
            substitutes.map(renderRow)
          )}
        </div>
      )}
    </div>
  )
}

interface StormPageProps {
  config: StormConfig
}

export function StormPage({ config }: StormPageProps) {
  const { t } = useTranslation()
  const { isAdmin } = useAuth()
  const {
    event: _event,
    roster,
    members,
    noShowCounts,
    historicEvents,
    teamPower,
    weekStart,
    weekOffset,
    setWeekOffset,
    isPastWeek,
    loading,
    error,
    addMember,
    removeMember,
    updateAttendance,
  } = useStormEvent(config)

  const [showHistory, setShowHistory] = useState(false)
  const [addingTo, setAddingTo] = useState<AddingTo | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null)
  const [memberSearch, setMemberSearch] = useState('')

  const assignedMemberIds = new Set(roster.map(r => r.member_id))
  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(memberSearch.trim().toLowerCase())
  )

  function handleOpenAdd(to: AddingTo) {
    setAddingTo(to)
    setMemberSearch('')
  }

  async function handleAddMember(memberId: string) {
    if (!addingTo) return
    setActionError(null)
    try {
      await addMember(memberId, addingTo.team, addingTo.role)
      setAddingTo(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('storm.addMemberFailed'))
      logError(`StormPage(${config.eventType}).addMember`, err)
    }
  }

  async function handleRemoveMember(rosterId: string) {
    setActionError(null)
    try {
      await removeMember(rosterId)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('storm.removeMemberFailed'))
      logError(`StormPage(${config.eventType}).removeMember`, err)
    }
  }

  async function handleCycleAttendance(rosterId: string, current: AttendanceStatus | null) {
    const next = nextAttendance(current, config.attendanceStatuses)
    setActionError(null)
    try {
      await updateAttendance(rosterId, next)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('storm.updateAttendanceFailed'))
      logError(`StormPage(${config.eventType}).updateAttendance`, err)
    }
  }

  function handleToggleHistory() {
    setShowHistory(h => !h)
    setWeekOffset(0)
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
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          {isAdmin && !showHistory && (
            <button
              onClick={() => setWeekOffset(weekOffset - 1)}
              className="text-gray-400 hover:text-white px-2 py-1 rounded transition-colors text-lg"
            >
              ‹
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-game-primary">{config.label}</h1>
            {!showHistory && (
              <p className="text-xs text-gray-400">
                {t('storm.weekOf', { date: formatWeekStart(weekStart) })}
                {weekOffset === 0 && (
                  <span className="ml-1 text-game-primary font-semibold">{t('storm.currentLabel')}</span>
                )}
                {isPastWeek && <span className="ml-1 text-gray-500">{t('storm.pastLabel')}</span>}
              </p>
            )}
          </div>
          {isAdmin && !showHistory && (
            <button
              onClick={() => setWeekOffset(weekOffset + 1)}
              disabled={weekOffset >= 4}
              className="text-gray-400 hover:text-white px-2 py-1 rounded transition-colors text-lg disabled:opacity-30"
            >
              ›
            </button>
          )}
        </div>
        <button
          onClick={handleToggleHistory}
          className={`text-xs border rounded px-2 py-1 transition-colors ${
            showHistory
              ? 'border-game-primary text-game-primary'
              : 'border-gray-600 text-gray-400 hover:text-white'
          }`}
        >
          {showHistory ? t('storm.currentWeekButton') : t('storm.historyButton')}
        </button>
      </div>

      {showHistory ? (
        /* History view */
        <div className="space-y-2">
          {historicEvents.length === 0 && (
            <p className="text-gray-500 text-sm italic text-center mt-8">
              {t('storm.noPastEvents')}
            </p>
          )}
          {historicEvents.map(({ event: ev, roster: evRoster }) => {
            const isExpanded = expandedWeek === ev.week_start

            function teamAttendanceSummary(team: 'A' | 'B'): string {
              const tRoster = evRoster.filter(r => r.team === team)
              const present = tRoster.filter(
                r => r.attendance === 'present' || r.attendance === 'subbed_in'
              ).length
              const noShow = tRoster.filter(r => r.attendance === 'no_show').length
              return t('storm.assignedSummary', { count: tRoster.length, present, noShow })
            }

            function teamPowerFor(team: 'A' | 'B'): number {
              return evRoster
                .filter(r => r.team === team)
                .reduce((sum, r) => {
                  const m = members.find(mb => mb.id === r.member_id)
                  return sum + (m?.THP ?? 0)
                }, 0)
            }

            return (
              <div
                key={ev.id}
                className="bg-game-card border border-game-accent rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedWeek(isExpanded ? null : ev.week_start)}
                  className="w-full p-3 text-left"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-game-primary font-semibold text-sm">
                      {t('storm.weekOf', { date: formatWeekStart(ev.week_start) })}
                    </span>
                    <span className="text-gray-500 text-xs">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(['A', 'B'] as const).map(team => (
                      <div key={team}>
                        <p className="text-xs text-gray-500 font-semibold">{t('storm.teamLabel', { team })}</p>
                        <p className="text-xs text-gray-300">{teamAttendanceSummary(team)}</p>
                        <p className="text-xs text-gray-400">
                          {formatNumber(teamPowerFor(team))} {t('storm.thpUnit')}
                        </p>
                      </div>
                    ))}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-game-accent px-3 pb-3 pt-2 space-y-3">
                    {(['A', 'B'] as const).map(team => {
                      const tRoster = evRoster.filter(r => r.team === team)
                      return (
                        <div key={team}>
                          <p className="text-xs text-game-primary font-semibold mb-1">{t('storm.teamLabel', { team })}</p>
                          {tRoster.length === 0 ? (
                            <p className="text-gray-600 text-xs italic">{t('storm.noMembersRecorded')}</p>
                          ) : (
                            tRoster.map(entry => {
                              const m = members.find(mb => mb.id === entry.member_id)
                              return (
                                <div
                                  key={entry.id}
                                  className="flex items-center justify-between py-1 border-b border-game-accent last:border-0"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-white text-sm truncate">
                                      {m?.name ?? '—'}
                                    </span>
                                    <span className="text-gray-400 text-xs shrink-0">
                                      {m?.Rank}
                                    </span>
                                    {m?.THP != null && (
                                      <span className="text-gray-400 text-xs shrink-0">
                                        {formatNumber(m.THP)}
                                      </span>
                                    )}
                                    {entry.role === 'substitute' && (
                                      <span className="text-gray-500 text-xs shrink-0">{t('storm.subBadge')}</span>
                                    )}
                                  </div>
                                  {entry.attendance && (
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${attendancePillClass(entry.attendance)}`}
                                    >
                                      {attendanceLabel(entry.attendance, t)}
                                    </span>
                                  )}
                                </div>
                              )
                            })
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* Current week view — Team A and Team B panels, side by side */
        <div className="grid grid-cols-2 gap-3">
          {(['A', 'B'] as const).map(team => (
            <TeamPanel
              key={team}
              team={team}
              config={config}
              roster={roster}
              members={members}
              totalPower={team === 'A' ? teamPower.A : teamPower.B}
              isAdmin={isAdmin}
              isPastWeek={isPastWeek}
              actionError={actionError}
              onAdd={handleOpenAdd}
              onRemove={handleRemoveMember}
              onCycleAttendance={handleCycleAttendance}
            />
          ))}
        </div>
      )}

      {/* Member picker modal */}
      {addingTo && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-game-card border border-game-accent rounded-2xl w-full max-w-md flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-game-accent">
              <h2 className="text-game-primary font-bold text-sm">
                {t('storm.addToTeamTitle', {
                  team: addingTo.team,
                  role: addingTo.role === 'participant' ? t('storm.participantRole') : t('storm.substituteRole'),
                })}
              </h2>
              <button
                onClick={() => setAddingTo(null)}
                className="text-gray-400 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-2 border-b border-game-accent">
              <input
                type="text"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                placeholder={t('storm.searchMembersPlaceholder')}
                autoFocus
                className="w-full bg-game-dark border border-game-accent rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-game-primary"
              />
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {filteredMembers.length === 0 ? (
                <p className="text-gray-600 text-xs italic text-center py-4">{t('storm.noMembersFound')}</p>
              ) : (
                filteredMembers.map(m => {
                  const alreadyAssigned = assignedMemberIds.has(m.id)
                  const noShows = noShowCounts.get(m.id) ?? 0
                  return (
                    <button
                      key={m.id}
                      onClick={() => !alreadyAssigned && handleAddMember(m.id)}
                      disabled={alreadyAssigned}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                        alreadyAssigned
                          ? 'opacity-40 cursor-default'
                          : 'hover:bg-game-dark cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-white text-sm font-medium truncate">{m.name}</span>
                        <span className="text-gray-400 text-xs shrink-0">{m.Rank}</span>
                        {m.THP != null && (
                          <span className="text-gray-400 text-xs shrink-0">
                            {formatNumber(m.THP)}
                          </span>
                        )}
                      </div>
                      {noShows > 0 && (
                        <span className="text-xs bg-red-900 text-red-300 px-1.5 py-0.5 rounded shrink-0 ml-2">
                          {t('storm.noShowCount', { count: noShows })}
                        </span>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
