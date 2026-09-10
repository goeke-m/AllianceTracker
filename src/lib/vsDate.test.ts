import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getActiveVsDateStr, getWeekDates } from './vsDate'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const tsxCli = createRequire(import.meta.url).resolve('tsx/cli')
const harness = path.join(__dirname, 'vsDate.timezone-harness.ts')

function mockNow(iso: string) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

afterEach(() => {
  vi.useRealTimers()
})

describe('getActiveVsDateStr', () => {
  it('stays on the prior calendar day before the 10pm ET reset (EDT, UTC-4)', () => {
    // 2026-09-09T20:00:00-04:00 -> ET local time 16:00, before reset
    mockNow('2026-09-09T20:00:00Z')
    expect(getActiveVsDateStr()).toBe('2026-09-08')
  })

  it('rolls to the new calendar day exactly at the 10pm ET reset (EDT, UTC-4)', () => {
    // 2026-09-09T22:00:00 ET == 2026-09-10T02:00:00Z
    mockNow('2026-09-10T02:00:00Z')
    expect(getActiveVsDateStr()).toBe('2026-09-09')
  })

  it('stays on the prior day one minute before the reset', () => {
    mockNow('2026-09-10T01:59:00Z')
    expect(getActiveVsDateStr()).toBe('2026-09-08')
  })

  it('handles the EST offset (UTC-5) outside daylight saving time', () => {
    // 2026-01-09T21:00:00-05:00 -> ET local 16:00, before reset
    mockNow('2026-01-09T21:00:00Z')
    expect(getActiveVsDateStr()).toBe('2026-01-08')
    // 2026-01-10T03:00:00Z -> ET local 2026-01-09 22:00, at reset
    mockNow('2026-01-10T03:00:00Z')
    expect(getActiveVsDateStr()).toBe('2026-01-09')
  })
})

describe('getWeekDates', () => {
  beforeEach(() => {
    mockNow('2026-09-10T13:00:00Z') // active VS date: 2026-09-09
  })

  it('returns 8 consecutive calendar days', () => {
    const dates = getWeekDates()
    expect(dates).toHaveLength(8)
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(`${dates[i - 1]}T00:00:00Z`)
      const curr = new Date(`${dates[i]}T00:00:00Z`)
      expect(curr.getTime() - prev.getTime()).toBe(24 * 60 * 60 * 1000)
    }
  })

  it('starts on a Sunday', () => {
    const [first] = getWeekDates()
    expect(new Date(`${first}T00:00:00Z`).getUTCDay()).toBe(0)
  })

  it('includes the active VS date', () => {
    expect(getWeekDates()).toContain(getActiveVsDateStr())
  })
})

// Regression test for the bug where getWeekDates() anchored on the viewer's
// local wall-clock date and then serialized via toISOString(), shifting the
// whole week a day earlier for viewers ahead of UTC (e.g. Seoul, Sydney).
// See CHANGELOG / screenshots from 2026-09-10.
describe('getWeekDates timezone independence', () => {
  it('produces the same week and "today" position for viewers in every timezone', () => {
    const zones = ['America/Los_Angeles', 'America/New_York', 'UTC', 'Asia/Seoul', 'Australia/Sydney']
    const results = zones.map(tz => {
      const stdout = execFileSync(
        process.execPath,
        [tsxCli, harness],
        {
          env: { ...process.env, TZ: tz },
          encoding: 'utf-8',
        }
      )
      return { tz, ...(JSON.parse(stdout) as { today: string; weekDates: string[] }) }
    })

    const [expected, ...rest] = results
    for (const result of rest) {
      expect(result.today, `today mismatch for ${result.tz}`).toBe(expected.today)
      expect(result.weekDates, `weekDates mismatch for ${result.tz}`).toEqual(expected.weekDates)
    }
  })
})
