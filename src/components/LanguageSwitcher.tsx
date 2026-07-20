import { useState } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import type { SupportedLanguage } from '../lib/i18n'

const LANGUAGE_OPTIONS: { code: SupportedLanguage; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ko', label: '한국어' },
  { code: 'pt-BR', label: 'Português' },
  { code: 'es', label: 'Español' },
]

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-gray-400 hover:text-white px-2 py-1"
        aria-label="Change language"
      >
        🌐
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-game-card border border-game-accent rounded-lg overflow-hidden z-50">
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.code}
              onClick={() => {
                setLanguage(opt.code)
                setOpen(false)
              }}
              className={`block w-full text-left px-3 py-2 text-xs whitespace-nowrap ${
                language === opt.code ? 'text-game-primary' : 'text-gray-300 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
