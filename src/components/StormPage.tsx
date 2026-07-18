import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useStormEvent } from '../hooks/useStormEvent'
import { logError } from '../lib/errorLog'
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

function attendanceLabel(attendance: AttendanceStatus | null): string {
  switch (attendance) {
    case 'present': return 'Present'
    case 'no_show': return 'No-show'
    case 'subbed_in': return 'Subbed In'
    default: return '—'
  }
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
  const participants = roster.filter(r => r.team === team && r.role === 'participant')
  const substitutes = roster.filter(r => r.team === team && r.role === 'substitute')

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
              {member.THP.toLocaleString()}
            </span>
          )}
        </div>
        {isAdmin ? (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onCycleAttendance(entry.id, entry.attendance)}
              className={`text-xs px-2 py-0.5 rounded font-medium transition-opacity hover:opacity-80 ${attendancePillClass(entry.attendance)}`}
            >
              {attendanceLabel(entry.attendance)}
            </button>
            {!isPastWeek && (
              <button
                onClick={() => onRemove(entry.id)}
                className="text-gray-500 hover:text-game-highlight text-lg leading-none px-1 transition-colors"
                aria-label="Remove member"
              >
                ×
              </button>
            )}
          </div>
        ) : (
          entry.attendance && (
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${attendancePillClass(entry.attendance)}`}>
              {attendanceLabel(entry.attendance)}
            </span>
          )
        )}
      </div>
    )
  }

  return (
    <div className="bg-game-card border border-game-accent rounded-xl p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-game-gold font-bold">Team {team}</h2>
          <span className="text-gray-400 text-xs">
            {participants.length}/{config.participantCap}
            {config.substituteCap > 0 && ` · ${substitutes.length}/${config.substituteCap} subs`}
          </span>
        </div>
        <span className="text-xs text-gray-300">
          {totalPower > 0 ? `${totalPower.toLocaleString()} THP` : '—'}
        </span>
      </div>

      {actionError && <p className="text-game-highlight text-xs mb-2">{actionError}</p>}

      {/* Participants */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500 uppercase tracking-wide">Participants</span>
          {isAdmin && !isPastWeek && participants.length < config.participantCap && (
            <button
              onClick={() => onAdd({ team, role: 'participant' })}
              className="text-xs text-game-standard border border-game-standard rounded px-2 py-0.5 hover:bg-game-standard hover:text-white transition-colors"
            >
              + Add
            </button>
          )}
        </div>
        {participants.length === 0 ? (
          <p className="text-gray-600 text-xs italic">No participants assigned</p>
        ) : (
          participants.map(renderRow)
        )}
      </div>

      {/* Substitutes — only shown when config.substituteCap > 0 */}
      {config.substituteCap > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Substitutes</span>
            {isAdmin && !isPastWeek && substitutes.length < config.substituteCap && (
              <button
                onClick={() => onAdd({ team, role: 'substitute' })}
                className="text-xs text-game-standard border border-game-standard rounded px-2 py-0.5 hover:bg-game-standard hover:text-white transition-colors"
              >
                + Add
              </button>
            )}
          </div>
          {substitutes.length === 0 ? (
            <p className="text-gray-600 text-xs italic">No substitutes assigned</p>
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
  } = useStormEvent(config, isAdmin)

  const [showHistory, setShowHistory] = useState(false)
  const [addingTo, setAddingTo] = useState<AddingTo | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null)

  const assignedMemberIds = new Set(roster.map(r => r.member_id))

  async function handleAddMember(memberId: string) {
    if (!addingTo) return
    setActionError(null)
    try {
      await addMember(memberId, addingTo.team, addingTo.role)
      setAddingTo(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to add member')
      logError(`StormPage(${config.eventType}).addMember`, err)
    }
  }

  async function handleRemoveMember(rosterId: string) {
    setActionError(null)
    try {
      await removeMember(rosterId)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to remove member')
      logError(`StormPage(${config.eventType}).removeMember`, err)
    }
  }

  async function handleCycleAttendance(rosterId: string, current: AttendanceStatus | null) {
    const next = nextAttendance(current, config.attendanceStatuses)
    setActionError(null)
    try {
      await updateAttendance(rosterId, next)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update attendance')
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
            <h1 className="text-xl font-bold text-game-gold">{config.label}</h1>
            {!showHistory && (
              <p className="text-xs text-gray-400">
                Week of {formatWeekStart(weekStart)}
                {weekOffset === 0 && (
                  <span className="ml-1 text-game-gold font-semibold">· Current</span>
                )}
                {isPastWeek && <span className="ml-1 text-gray-500">(past)</span>}
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
              ? 'border-game-gold text-game-gold'
              : 'border-gray-600 text-gray-400 hover:text-white'
          }`}
        >
          {showHistory ? 'Current Week' : 'History'}
        </button>
      </div>

      {showHistory ? (
        /* History view */
        <div className="space-y-2">
          {historicEvents.length === 0 && (
            <p className="text-gray-500 text-sm italic text-center mt-8">
              No past events recorded yet.
            </p>
          )}
          {historicEvents.map(({ event: ev, roster: evRoster }) => {
            const isExpanded = expandedWeek === ev.week_start

            function teamAttendanceSummary(t: 'A' | 'B'): string {
              const tRoster = evRoster.filter(r => r.team === t)
              const present = tRoster.filter(
                r => r.attendance === 'present' || r.attendance === 'subbed_in'
              ).length
              const noShow = tRoster.filter(r => r.attendance === 'no_show').length
              return `${tRoster.length} assigned · ${present} present · ${noShow} no-shows`
            }

            function teamPowerFor(t: 'A' | 'B'): number {
              return evRoster
                .filter(r => r.team === t)
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
                    <span className="text-game-gold font-semibold text-sm">
                      Week of {formatWeekStart(ev.week_start)}
                    </span>
                    <span className="text-gray-500 text-xs">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(['A', 'B'] as const).map(t => (
                      <div key={t}>
                        <p className="text-xs text-gray-500 font-semibold">Team {t}</p>
                        <p className="text-xs text-gray-300">{teamAttendanceSummary(t)}</p>
                        <p className="text-xs text-gray-400">
                          {teamPowerFor(t).toLocaleString()} THP
                        </p>
                      </div>
                    ))}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-game-accent px-3 pb-3 pt-2 space-y-3">
                    {(['A', 'B'] as const).map(t => {
                      const tRoster = evRoster.filter(r => r.team === t)
                      return (
                        <div key={t}>
                          <p className="text-xs text-game-gold font-semibold mb-1">Team {t}</p>
                          {tRoster.length === 0 ? (
                            <p className="text-gray-600 text-xs italic">No members recorded</p>
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
                                        {m.THP.toLocaleString()}
                                      </span>
                                    )}
                                    {entry.role === 'substitute' && (
                                      <span className="text-gray-500 text-xs shrink-0">Sub</span>
                                    )}
                                  </div>
                                  {entry.attendance && (
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${attendancePillClass(entry.attendance)}`}
                                    >
                                      {attendanceLabel(entry.attendance)}
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
        /* Current week view — Team A and Team B panels */
        <>
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
              onAdd={setAddingTo}
              onRemove={handleRemoveMember}
              onCycleAttendance={handleCycleAttendance}
            />
          ))}
        </>
      )}

      {/* Member picker modal */}
      {addingTo && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-game-card border border-game-accent rounded-2xl w-full max-w-md flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-game-accent">
              <h2 className="text-game-gold font-bold text-sm">
                Add to Team {addingTo.team} —{' '}
                {addingTo.role === 'participant' ? 'Participant' : 'Substitute'}
              </h2>
              <button
                onClick={() => setAddingTo(null)}
                className="text-gray-400 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {members.map(m => {
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
                          {m.THP.toLocaleString()}
                        </span>
                      )}
                    </div>
                    {noShows > 0 && (
                      <span className="text-xs bg-red-900 text-red-300 px-1.5 py-0.5 rounded shrink-0 ml-2">
                        {noShows} no-show{noShows !== 1 ? 's' : ''}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
