import { describe, expect, it } from 'vitest'
import { formatPowerPrecise } from './formatPower'

describe('formatPowerPrecise', () => {
  it('shows 2 decimals so values 10K apart differ, matching lastwarrank precision', () => {
    expect(formatPowerPrecise(284480000)).toBe('284.48M')
    expect(formatPowerPrecise(284520000)).toBe('284.52M')
  })

  it('formats billions and empty values', () => {
    expect(formatPowerPrecise(1500000000)).toBe('1.50B')
    expect(formatPowerPrecise(null)).toBe('—')
  })
})
