// VS days roll over at 10pm (22:00) US Eastern, not at local midnight, so this
// stays in sync for every viewer regardless of their own timezone.
const VS_RESET_HOUR_ET = 22

export function getActiveVsDateStr(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  const rawHour = get('hour')
  const hour = rawHour === '24' ? 0 : Number(rawHour)

  const etDate = new Date(Date.UTC(Number(get('year')), Number(get('month')) - 1, Number(get('day'))))
  if (hour < VS_RESET_HOUR_ET) {
    etDate.setUTCDate(etDate.getUTCDate() - 1)
  }
  const y = etDate.getUTCFullYear()
  const m = String(etDate.getUTCMonth() + 1).padStart(2, '0')
  const d = String(etDate.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Sunday-to-Sunday week (8 dates) containing the active VS date, as ISO date
// strings. Anchored on getActiveVsDateStr() and walked entirely in UTC so
// every viewer sees the same week regardless of their own timezone.
export function getWeekDates(): string[] {
  const [y, m, d] = getActiveVsDateStr().split('-').map(Number)
  const today = new Date(Date.UTC(y, m - 1, d))
  const sunday = new Date(today)
  sunday.setUTCDate(today.getUTCDate() - today.getUTCDay())
  const dates: string[] = []
  for (let i = 0; i <= 7; i++) {
    const dt = new Date(sunday)
    dt.setUTCDate(sunday.getUTCDate() + i)
    dates.push(dt.toISOString().slice(0, 10))
  }
  return dates
}
