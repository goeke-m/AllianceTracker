import type { Page } from '../lib/types'

interface NavBarProps {
  current: Page
  isAdmin: boolean
  onNavigate: (page: Page) => void
  onSignOut: () => void
}

const tabs: { id: Page; label: string; icon: string; adminOnly?: boolean }[] = [
  { id: 'schedule', label: 'Voyage Log', icon: '⚓' },
  { id: 'map', label: 'Treasure Map', icon: '🗺' },
  { id: 'tech', label: 'Ship Upgrades', icon: '⚔️' },
  { id: 'kills', label: 'Kill List', icon: '⚔️' },
  { id: 'friends', label: 'Friends', icon: '🤝' },
  { id: 'ds', label: 'Desert Storm', icon: '🏜️' },
  { id: 'canyon', label: 'Canyon Storm', icon: '🏔️' },
  { id: 'out', label: 'Shore Leave', icon: '🏝️', adminOnly: true },
  { id: 'admin', label: 'Captain', icon: '☠️', adminOnly: true },
]

export function NavBar({ current, isAdmin, onNavigate, onSignOut }: NavBarProps) {
  const visibleTabs = isAdmin ? tabs : tabs.filter((t) => !t.adminOnly)

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-game-card border-t border-game-accent z-50">
      <div className="flex items-center">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            className={`flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
              current === tab.id
                ? 'text-game-gold border-t-2 border-game-gold -mt-px'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="text-lg mb-0.5">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
        <button
          onClick={onSignOut}
          className="flex-1 flex flex-col items-center py-3 text-xs font-medium text-gray-400 hover:text-game-highlight transition-colors"
        >
          <span className="text-lg mb-0.5">🏴‍☠️</span>
          <span>Abandon Ship</span>
        </button>
      </div>
    </nav>
  )
}
