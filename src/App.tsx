import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './components/LoginPage'
import { NavBar } from './components/NavBar'
import { MarshallMap } from './pages/MarshallMap'
import { TrainSchedule } from './pages/TrainSchedule'
import { AdminPanel } from './pages/AdminPanel'
import type { Page } from './lib/types'

const PB_CONFIGURED =
  !!import.meta.env.VITE_PB_URL &&
  import.meta.env.VITE_PB_URL !== 'http://127.0.0.1:8090'

export function App() {
  const { user, isAdmin, signIn, signOut } = useAuth()
  const [page, setPage] = useState<Page>('map')

  if (!PB_CONFIGURED) {
    return (
      <div className="min-h-screen bg-game-dark flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-game-card border border-game-accent rounded-xl p-6 space-y-3">
          <h1 className="text-xl font-bold text-game-gold">Setup Required</h1>
          <p className="text-gray-300 text-sm">
            Copy <code className="text-game-gold">.env.example</code> to{' '}
            <code className="text-game-gold">.env</code> and set{' '}
            <code className="text-game-gold">VITE_PB_URL</code> to your PocketBase URL,
            then restart the dev server.
          </p>
          <div className="bg-game-dark rounded-lg p-3 font-mono text-xs text-green-400">
            cp .env.example .env
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage onSignIn={signIn} />
  }

  // Redirect non-admin away from admin page
  const safePage: Page = page === 'admin' && !isAdmin ? 'map' : page

  return (
    <div className="min-h-screen bg-game-dark text-white">
      {/* Profile badge */}
      <div className="fixed top-0 left-0 right-0 bg-game-card border-b border-game-accent px-4 py-2 flex items-center justify-between z-40">
        <span className="text-xs text-gray-400 truncate">{user.email}</span>
        {isAdmin && (
          <span className="text-xs bg-game-leadership text-game-dark font-bold px-2 py-0.5 rounded">
            ADMIN
          </span>
        )}
      </div>

      {/* Page content with top/bottom padding for fixed bars */}
      <div className="pt-10 min-h-screen">
        {safePage === 'map' && <MarshallMap />}
        {safePage === 'schedule' && <TrainSchedule />}
        {safePage === 'admin' && isAdmin && <AdminPanel />}
      </div>

      <NavBar
        current={safePage}
        isAdmin={isAdmin}
        onNavigate={setPage}
        onSignOut={signOut}
      />
    </div>
  )
}
