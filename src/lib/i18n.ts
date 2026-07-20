import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../locales/en.json'
import ko from '../locales/ko.json'
import ptBR from '../locales/pt-BR.json'
import es from '../locales/es.json'

export const SUPPORTED_LANGUAGES = ['en', 'ko', 'pt-BR', 'es'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

const STORAGE_KEY = 'opnz-language'

function isSupportedLanguage(value: string): value is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
}

function detectInitialLanguage(): SupportedLanguage {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && isSupportedLanguage(stored)) return stored

  const browserLang = navigator.language
  if (browserLang.startsWith('ko')) return 'ko'
  if (browserLang.startsWith('pt')) return 'pt-BR'
  if (browserLang.startsWith('es')) return 'es'
  return 'en'
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ko: { translation: ko },
    'pt-BR': { translation: ptBR },
    es: { translation: es },
  },
  lng: detectInitialLanguage(),
  fallbackLng: 'en',
  supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
  interpolation: { escapeValue: false },
})

export default i18n
