import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import i18n, { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../lib/i18n'

const STORAGE_KEY = 'opnz-language'

function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
}

export function useLanguage() {
  const [language, setLanguageState] = useState<SupportedLanguage>(i18n.language as SupportedLanguage)

  useEffect(() => {
    function syncFromSession(locale: unknown) {
      if (isSupportedLanguage(locale) && locale !== i18n.language) {
        i18n.changeLanguage(locale)
        localStorage.setItem(STORAGE_KEY, locale)
        setLanguageState(locale)
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      syncFromSession(session?.user.user_metadata?.locale)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncFromSession(session?.user.user_metadata?.locale)
    })

    return () => subscription.unsubscribe()
  }, [])

  function setLanguage(code: SupportedLanguage) {
    i18n.changeLanguage(code)
    localStorage.setItem(STORAGE_KEY, code)
    setLanguageState(code)
    supabase.auth.updateUser({ data: { locale: code } }).catch(() => {
      // Best-effort profile sync — localStorage already holds the preference for this browser.
    })
  }

  return { language, setLanguage }
}
