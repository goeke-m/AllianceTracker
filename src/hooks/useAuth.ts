import { useEffect, useState } from 'react'
import { pb } from '../lib/pb'
import type { PBUser } from '../lib/types'

function getUser(): PBUser | null {
  if (!pb.authStore.isValid || !pb.authStore.model) return null
  const m = pb.authStore.model
  return { id: m['id'], email: m['email'], is_admin: m['is_admin'] ?? false }
}

export function useAuth() {
  const [user, setUser] = useState<PBUser | null>(getUser)

  useEffect(() => {
    const unsub = pb.authStore.onChange(() => {
      setUser(getUser())
    })
    return () => unsub()
  }, [])

  async function signIn(
    email: string,
    password: string
  ): Promise<{ message: string } | null> {
    try {
      await pb.collection('users').authWithPassword(email, password)
      return null
    } catch (err) {
      return err instanceof Error ? err : new Error('Sign in failed')
    }
  }

  function signOut() {
    pb.authStore.clear()
  }

  return {
    user,
    isAdmin: user?.is_admin ?? false,
    signIn,
    signOut,
  }
}
