import { useState } from 'react'
import { useAllianceTech } from '../hooks/useAllianceTech'
import { useAuth } from '../hooks/useAuth'

// ─── Static tech lists ────────────────────────────────────────────────────────

function levels(name: string, max: number): string[] {
  return Array.from({ length: max }, (_, i) => `${name} Lv ${i + 1}`)
}

const DEVELOPMENT_TECHS: string[] = [
  ...levels('Quick Gathering', 10),
  ...levels('Iron Output', 10),
  ...levels('Food Output', 10),
  ...levels('Coin Output', 10),
  ...levels('Quick Research', 10),
  ...levels('Senior Scientist', 10),
  ...levels('Iron Protection', 10),
  ...levels('Food Protection', 10),
  ...levels('Coin Protection', 10),
  ...levels('Quick Crafting', 10),
  ...levels('Expert Blacksmith', 10),
  ...levels('Veteran Craftsman', 10),
]

const WAR_TECHS: string[] = [
  ...levels('Garrison HP', 10),
  ...levels('Garrison Attack', 10),
  ...levels('Garrison Defense', 10),
  ...levels('Drill Ground Expansion', 10),
  ...levels('Rallied HP', 10),
  ...levels('Rallied Attack', 10),
  ...levels('Rallied Defense', 10),
  ...levels('Expert Nurse', 10),
  ...levels('World Interception', 10),
  ...levels('Rapid Siege', 10),
  ...levels('Quick Garrison', 10),
  ...levels('Troop Movement', 10),
  ...levels('Unit Load Capacity', 10),
  ...levels('Quick Training', 10),
  ...levels('Expert Trainer', 10),
]

// ─── Component ────────────────────────────────────────────────────────────────

interface PickerState {
  category: 'development' | 'war' | null
  search: string
}

export function AllianceTech() {
  const { isAdmin } = useAuth()
  const { queue, loading, error, addItem, completeTop, moveUp, moveDown } = useAllianceTech()
  const [picker, setPicker] = useState<PickerState | null>(null)
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleSelect(techName: string, category: 'development' | 'war') {
    setSaving(true)
    setSaveError(null)
    try {
      await addItem(techName, category)
      setPicker(null)
    } catch (err) {
      setSaveError((err as { message?: string }).message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleComplete() {
    setCompleting(true)
    setSaveError(null)
    try {
      await completeTop()
    } catch (err) {
      setSaveError((err as { message?: string }).message ?? 'Failed to complete')
    } finally {
      setCompleting(false)
    }
  }

  async function handleMove(index: number, dir: 'up' | 'down') {
    setSaving(true)
    try {
      if (dir === 'up') await moveUp(index)
      else await moveDown(index)
    } catch (err) {
      setSaveError((err as { message?: string }).message ?? 'Reorder failed')
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

  const filteredTechs =
    picker?.category === 'development'
      ? DEVELOPMENT_TECHS
      : picker?.category === 'war'
      ? WAR_TECHS
      : []

  const displayTechs = picker?.search
    ? filteredTechs.filter(t => t.toLowerCase().includes(picker.search.toLowerCase()))
    : filteredTechs

  const [current, ...upcoming] = queue

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-game-gold">Ship Upgrades</h1>
        {isAdmin && (
          <button
            onClick={() => { setPicker({ category: null, search: '' }); setSaveError(null) }}
            className="text-xs text-game-standard border border-game-standard rounded px-3 py-1 hover:bg-game-standard hover:text-white transition-colors"
          >
            + Add
          </button>
        )}
      </div>
      <p className="text-gray-400 text-xs mb-6">Planned ship improvements in order</p>

      {queue.length === 0 ? (
        <p className="text-gray-500 italic text-sm text-center py-8">No techs queued</p>
      ) : (
        <div className="space-y-3">
          {/* Currently upgrading */}
          <div className="bg-game-card border-l-4 border-game-standard rounded-xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Currently Upgrading</p>
                <p className="text-lg font-bold text-white leading-tight">{current.tech_name}</p>
                <span className="inline-block mt-1.5 text-xs font-semibold px-2 py-0.5 rounded capitalize bg-game-standard text-white">
                  {current.category}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isAdmin && (
                  <>
                    <div className="flex flex-col gap-0.5">
                      <button
                        disabled={true}
                        className="w-6 h-5 flex items-center justify-center text-gray-700 rounded text-xs cursor-not-allowed"
                      >▲</button>
                      <button
                        disabled={saving || queue.length < 2}
                        onClick={() => handleMove(0, 'down')}
                        className="w-6 h-5 flex items-center justify-center text-gray-400 hover:text-white rounded text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >▼</button>
                    </div>
                    <button
                      onClick={handleComplete}
                      disabled={completing}
                      className="w-8 h-8 rounded-full border-2 border-green-500 flex items-center justify-center text-green-500 hover:bg-green-500 hover:text-white transition-colors disabled:opacity-50"
                      title="Mark complete"
                    >
                      ✓
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="bg-game-card border border-game-accent/30 rounded-xl overflow-hidden">
              <div className="px-4 py-2 border-b border-game-accent/20">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Up Next</p>
              </div>
              <div className="divide-y divide-game-accent/10">
                {upcoming.map((item, i) => {
                  const idx = i + 1 // actual index in queue array
                  return (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-xs text-gray-600 w-5 text-right shrink-0">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-white">{item.tech_name}</span>
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded capitalize ${
                          item.category === 'war'
                            ? 'bg-game-highlight/20 text-game-highlight'
                            : 'bg-game-standard/20 text-game-standard'
                        }`}>
                          {item.category}
                        </span>
                      </div>
                      {isAdmin && (
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            disabled={saving}
                            onClick={() => handleMove(idx, 'up')}
                            className="w-6 h-5 flex items-center justify-center text-gray-400 hover:text-white rounded text-xs transition-colors disabled:opacity-30"
                          >▲</button>
                          <button
                            disabled={saving || idx === queue.length - 1}
                            onClick={() => handleMove(idx, 'down')}
                            className="w-6 h-5 flex items-center justify-center text-gray-400 hover:text-white rounded text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >▼</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {saveError && (
        <p className="mt-4 text-game-highlight text-sm">{saveError}</p>
      )}

      {/* Picker modal */}
      {picker && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-game-card border border-game-accent rounded-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
              <h2 className="text-game-gold font-bold">Add to Queue</h2>
              <button
                onClick={() => setPicker(null)}
                className="text-gray-400 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>

            {!picker.category ? (
              <div className="px-5 pb-6 space-y-3">
                <p className="text-xs text-gray-400">Choose category:</p>
                <button
                  onClick={() => setPicker(p => p && ({ ...p, category: 'development' }))}
                  className="w-full bg-game-dark border border-game-accent rounded-xl p-4 text-left hover:border-game-standard transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚙️</span>
                    <div>
                      <div className="font-semibold text-white">Development</div>
                      <div className="text-xs text-gray-400">{DEVELOPMENT_TECHS.length} technologies</div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setPicker(p => p && ({ ...p, category: 'war' }))}
                  className="w-full bg-game-dark border border-game-accent rounded-xl p-4 text-left hover:border-game-highlight transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚔️</span>
                    <div>
                      <div className="font-semibold text-white">War</div>
                      <div className="text-xs text-gray-400">{WAR_TECHS.length} technologies</div>
                    </div>
                  </div>
                </button>
              </div>
            ) : (
              <>
                <div className="px-5 pb-3 shrink-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPicker(p => p && ({ ...p, category: null, search: '' }))}
                      className="text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      ← Back
                    </button>
                    <span className="text-xs text-gray-500 capitalize">{picker.category}</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={picker.search}
                    onChange={e => setPicker(p => p && ({ ...p, search: e.target.value }))}
                    className="w-full bg-game-dark border border-game-accent rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600"
                    autoFocus
                  />
                </div>
                <div className="overflow-y-auto px-5 pb-5 space-y-1">
                  {displayTechs.length === 0 ? (
                    <p className="text-gray-500 text-sm italic py-4 text-center">No results</p>
                  ) : (
                    displayTechs.map(tech => (
                      <button
                        key={tech}
                        disabled={saving}
                        onClick={() => handleSelect(tech, picker.category as 'development' | 'war')}
                        className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-white hover:bg-game-dark transition-colors disabled:opacity-50"
                      >
                        {tech}
                      </button>
                    ))
                  )}
                </div>
              </>
            )}

            {saveError && (
              <p className="px-5 pb-4 text-game-highlight text-sm shrink-0">{saveError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
