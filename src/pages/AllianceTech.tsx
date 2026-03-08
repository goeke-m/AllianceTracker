import { useState } from 'react'
import { useAllianceTech } from '../hooks/useAllianceTech'
import { useAuth } from '../hooks/useAuth'
import type { AllianceTechStatus } from '../lib/types'

// ─── Static tech lists ────────────────────────────────────────────────────────

function levels(name: string, max: number): string[] {
  return Array.from({ length: max }, (_, i) => `${name} Lv ${i + 1}`)
}

const DEVELOPMENT_TECHS: string[] = [
  ...levels('Auto Rally', 10),
  ...levels('Great Helper', 20),
  ...levels('Quick Construction', 20),
  ...levels('Quick Research', 20),
  ...levels('Quick Training', 20),
  ...levels('Veteran Craftsman', 20),
  ...levels('Senior Scientist', 20),
  ...levels('Food Production', 20),
  ...levels('Iron Production', 20),
  ...levels('Gold Production', 20),
]

const WAR_TECHS: string[] = [
  ...levels('Marching Speed', 20),
  ...levels('Stamina Recovery', 10),
  ...levels('Rally Capacity', 20),
  ...levels('Garrison Capacity', 20),
  ...levels('Alliance Attack', 20),
  ...levels('Alliance Defense', 20),
  ...levels('Alliance HP', 20),
  ...levels('Unit Attack', 20),
  ...levels('Unit Defense', 20),
  ...levels('Unit HP', 20),
  ...levels('Expert Blacksmith', 20),
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface PickerState {
  slot: 'current' | 'next'
  category: 'development' | 'war' | null
  search: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AllianceTech() {
  const { isAdmin } = useAuth()
  const { current, next, loading, error, setStatus, clearStatus } = useAllianceTech()
  const [picker, setPicker] = useState<PickerState | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function openPicker(slot: 'current' | 'next') {
    setPicker({ slot, category: null, search: '' })
    setSaveError(null)
  }

  async function handleSelect(techName: string, category: 'development' | 'war') {
    if (!picker) return
    setSaving(true)
    setSaveError(null)
    try {
      await setStatus(picker.slot, techName, category)
      setPicker(null)
    } catch (err) {
      setSaveError((err as { message?: string }).message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleClear(slot: 'current' | 'next') {
    setSaving(true)
    try {
      await clearStatus(slot)
    } catch (err) {
      setSaveError((err as { message?: string }).message ?? 'Clear failed')
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

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-game-gold">Ship Upgrades</h1>
      </div>
      <p className="text-gray-400 text-xs mb-6">Current and upcoming ship improvements</p>

      <div className="space-y-4">
        <TechCard
          label="Currently Upgrading"
          slot="current"
          status={current}
          accent="border-game-standard"
          badgeColor="bg-game-standard"
          isAdmin={isAdmin}
          onEdit={() => openPicker('current')}
          onClear={() => handleClear('current')}
          saving={saving}
        />
        <TechCard
          label="Next on the Docket"
          slot="next"
          status={next}
          accent="border-game-accent"
          badgeColor="bg-game-accent"
          isAdmin={isAdmin}
          onEdit={() => openPicker('next')}
          onClear={() => handleClear('next')}
          saving={saving}
        />
      </div>

      {/* Picker modal */}
      {picker && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-game-card border border-game-accent rounded-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
              <h2 className="text-game-gold font-bold">
                Set {picker.slot === 'current' ? 'Current' : 'Next'} Tech
              </h2>
              <button
                onClick={() => setPicker(null)}
                className="text-gray-400 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>

            {!picker.category ? (
              /* Category selection */
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
              /* Tech selection */
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function TechCard({
  label,
  status,
  accent,
  badgeColor,
  isAdmin,
  onEdit,
  onClear,
  saving,
}: {
  label: string
  slot: 'current' | 'next'
  status: AllianceTechStatus | null
  accent: string
  badgeColor: string
  isAdmin: boolean
  onEdit: () => void
  onClear: () => void
  saving: boolean
}) {
  return (
    <div className={`bg-game-card border-l-4 rounded-xl p-4 ${accent}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">{label}</p>
          {status ? (
            <>
              <p className="text-lg font-bold text-white leading-tight">{status.tech_name}</p>
              <span
                className={`inline-block mt-1.5 text-xs font-semibold px-2 py-0.5 rounded capitalize ${badgeColor} text-white`}
              >
                {status.category}
              </span>
              {status.updated_at && (
                <p className="mt-1 text-xs text-gray-600">
                  Updated {new Date(status.updated_at).toLocaleDateString()}
                </p>
              )}
            </>
          ) : (
            <p className="text-gray-500 italic text-sm">Not set</p>
          )}
        </div>
        {isAdmin && (
          <div className="flex flex-col gap-1 shrink-0">
            <button
              onClick={onEdit}
              disabled={saving}
              className="text-xs text-game-standard border border-game-standard rounded px-2 py-0.5 hover:bg-game-standard hover:text-white transition-colors disabled:opacity-50"
            >
              {status ? 'Change' : 'Set'}
            </button>
            {status && (
              <button
                onClick={onClear}
                disabled={saving}
                className="text-xs text-gray-500 border border-gray-600 rounded px-2 py-0.5 hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
