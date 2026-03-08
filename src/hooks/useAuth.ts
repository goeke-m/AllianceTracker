import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { PBUser } from '../lib/types'

export function useAuth() {
  const [user, setUser] = useState<PBUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
          is_admin: session.user.user_metadata?.is_admin ?? false,
        })
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
          is_admin: session.user.user_metadata?.is_admin ?? false,
        })
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(
    email: string,
    password: string
  ): Promise<{ message: string } | null> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { message: error.message }
    return null
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return {
    user: loading ? null : user,
    isAdmin: user?.is_admin ?? false,
    loading,
    signIn,
    signOut,
  }
}
