import { supabase } from './supabase'

export function logError(context: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err)
  supabase.auth.getUser()
    .then(({ data }) =>
      supabase.from('error_logs').insert({
        context,
        message,
        user_id: data.user?.id ?? null,
        user_email: data.user?.email ?? null,
      })
    )
    .then(({ error }) => {
      if (error) console.error('Failed to log error:', error)
    })
    .catch(() => {
      // Logging must never break the calling code path.
    })
}
