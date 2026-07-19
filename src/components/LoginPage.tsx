import { useState } from 'react'

interface LoginPageProps {
  onSignIn: (email: string, password: string) => Promise<{ message: string } | null>
  onSignInWithOAuth: (provider: 'google' | 'discord') => Promise<{ message: string } | null>
}

export function LoginPage({ onSignIn, onSignInWithOAuth }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'discord' | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const err = await onSignIn(email, password)
    if (err) setError(err.message)
    setLoading(false)
  }

  async function handleOAuth(provider: 'google' | 'discord') {
    setError(null)
    setOauthLoading(provider)
    const err = await onSignInWithOAuth(provider)
    if (err) setError(err.message)
    setOauthLoading(null)
  }

  return (
    <div className="min-h-screen bg-game-dark flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.jpg" alt="WPNZ" className="h-24 w-24 object-cover rounded-xl mx-auto mb-3" />
          <p className="text-gray-400 mt-2">Forged in War</p>
        </div>

        <div className="bg-game-card border border-game-accent rounded-xl p-6 space-y-4">
          {/* OAuth Buttons */}
          <button
            type="button"
            onClick={() => handleOAuth('google')}
            disabled={oauthLoading !== null || loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold py-2.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {oauthLoading === 'google' ? 'Deploying...' : 'Sign In with Google'}
          </button>

          <button
            type="button"
            onClick={() => handleOAuth('discord')}
            disabled={oauthLoading !== null || loading}
            className="w-full flex items-center justify-center gap-3 bg-[#5865F2] text-white font-semibold py-2.5 rounded-lg hover:bg-[#4752C4] transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.022.015.041.036.053a19.849 19.849 0 0 0 5.993 3.032.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.032.077.077 0 0 0 .036-.053c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            {oauthLoading === 'discord' ? 'Deploying...' : 'Sign In with Discord'}
          </button>

          {/* Email/Password Form - local dev only */}
          {import.meta.env.DEV && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-game-accent" />
                <span className="text-xs text-gray-500">or</span>
                <div className="flex-1 h-px bg-game-accent" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-game-dark border border-game-accent rounded-lg px-3 py-2 text-white focus:outline-none focus:border-game-primary"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-game-dark border border-game-accent rounded-lg px-3 py-2 text-white focus:outline-none focus:border-game-primary"
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <p className="text-game-highlight text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || oauthLoading !== null}
                  className="w-full bg-game-primary text-game-dark font-bold py-2.5 rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Deploying...' : 'Sign In'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
