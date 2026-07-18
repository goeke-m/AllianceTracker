import i18n from './i18n'

const LOCALE_TAGS: Record<string, string> = {
  en: 'en-US',
  ko: 'ko-KR',
  'pt-BR': 'pt-BR',
  es: 'es-419',
}

function activeLocaleTag(): string {
  return LOCALE_TAGS[i18n.language] ?? 'en-US'
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleDateString(activeLocaleTag(), options)
}

export function formatDateTime(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleString(activeLocaleTag(), options)
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return value.toLocaleString(activeLocaleTag(), options)
}
