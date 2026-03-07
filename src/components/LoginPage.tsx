import { useState } from 'react'

interface LoginPageProps {
  onSignIn: (email: string, password: string) => Promise<{ message: string } | null>
}

export function LoginPage({ onSignIn }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const err = await onSignIn(email, password)
    if (err) setError(err.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-game-dark flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-game-gold">OPNz Tracker</h1>
          <p className="text-gray-400 mt-2">Alliance Marshall Visualizer</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-game-card border border-game-accent rounded-xl p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-game-dark border border-game-accent rounded-lg px-3 py-2 text-white focus:outline-none focus:border-game-gold"
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
              className="w-full bg-game-dark border border-game-accent rounded-lg px-3 py-2 text-white focus:outline-none focus:border-game-gold"
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
            disabled={loading}
            className="w-full bg-game-gold text-game-dark font-bold py-2.5 rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
