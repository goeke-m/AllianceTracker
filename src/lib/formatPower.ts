export function formatPower(val?: number | null): string {
  if (val == null) return '—'
  if (val === 0) return '0'
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`
  return String(val)
}
