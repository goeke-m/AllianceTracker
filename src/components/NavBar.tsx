import { useTranslation } from 'react-i18next'
import type { Page } from '../lib/types'

interface NavBarProps {
  current: Page
  isAdmin: boolean
  onNavigate: (page: Page) => void
  onSignOut: () => void
}

const tabs: { id: Page; icon: string; adminOnly?: boolean }[] = [
  { id: 'schedule', icon: '⚓' },
  { id: 'map', icon: '🗺' },
  { id: 'tech', icon: '⚔️' },
  { id: 'kills', icon: '⚔️' },
  { id: 'friends', icon: '🤝' },
  { id: 'out', icon: '🏝️', adminOnly: true },
  { id: 'admin', icon: '☠️', adminOnly: true },
]

export function NavBar({ current, isAdmin, onNavigate, onSignOut }: NavBarProps) {
  const { t } = useTranslation()
  const visibleTabs = isAdmin ? tabs : tabs.filter((tab) => !tab.adminOnly)

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
            <span>{t(`nav.${tab.id}`)}</span>
          </button>
        ))}
        <button
          onClick={onSignOut}
          className="flex-1 flex flex-col items-center py-3 text-xs font-medium text-gray-400 hover:text-game-highlight transition-colors"
        >
          <span className="text-lg mb-0.5">🏴‍☠️</span>
          <span>{t('nav.signOut')}</span>
        </button>
      </div>
    </nav>
  )
}
