import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './components/LoginPage'
import { NavBar } from './components/NavBar'
import { MarshallMap } from './pages/MarshallMap'
import { TrainSchedule } from './pages/TrainSchedule'
import { Out } from './pages/Out'
import { AdminPanel } from './pages/AdminPanel'
import { AllianceTech } from './pages/AllianceTech'
import type { Page } from './lib/types'

const SUPABASE_CONFIGURED =
  !!import.meta.env.VITE_SUPABASE_URL &&
  !!import.meta.env.VITE_SUPABASE_ANON_KEY

export function App() {
  const { user, isAdmin, loading, signIn, signInWithOAuth, signOut } = useAuth()
  const [page, setPage] = useState<Page>('schedule')

  if (!SUPABASE_CONFIGURED) {
    return (
      <div className="min-h-screen bg-game-dark flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-game-card border border-game-accent rounded-xl p-6 space-y-3">
          <h1 className="text-xl font-bold text-game-gold">Setup Required</h1>
          <p className="text-gray-300 text-sm">
            Copy <code className="text-game-gold">.env.example</code> to{' '}
            <code className="text-game-gold">.env</code> and set{' '}
            <code className="text-game-gold">VITE_SUPABASE_URL</code> and{' '}
            <code className="text-game-gold">VITE_SUPABASE_ANON_KEY</code>,
            then restart the dev server.
          </p>
          <div className="bg-game-dark rounded-lg p-3 font-mono text-xs text-green-400">
            cp .env.example .env
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-game-dark flex items-center justify-center">
        <p className="text-game-gold animate-pulse">Charting the seas...</p>
      </div>
    )
  }

  if (!user) {
    return <LoginPage onSignIn={signIn} onSignInWithOAuth={signInWithOAuth} />
  }

  // Redirect non-admin away from admin page
  const safePage: Page = (page === 'admin' || page === 'out') && !isAdmin ? 'schedule' : page

  return (
    <div className="min-h-screen bg-game-dark text-white">
      {/* Profile badge */}
      <div className="fixed top-0 left-0 right-0 bg-game-card border-b border-game-accent px-4 py-2 flex items-center justify-between z-40">
        <span className="text-xs text-gray-400 truncate">{user.email}</span>
        {isAdmin && (
          <span className="text-xs bg-game-leadership text-game-dark font-bold px-2 py-0.5 rounded">
            CAPTAIN
          </span>
        )}
      </div>

      {/* Page content with top/bottom padding for fixed bars */}
      <div className="pt-10 min-h-screen">
        {safePage === 'map' && <MarshallMap isAdmin={isAdmin} />}
        {safePage === 'schedule' && <TrainSchedule />}
        {safePage === 'tech' && <AllianceTech />}
        {safePage === 'out' && isAdmin && <Out />}
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
