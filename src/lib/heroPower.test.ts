import { describe, expect, it } from 'vitest'
import { parseHeroPower, matchHeroPower } from '../../supabase/functions/sync-alliance-members/heropower.ts'
import { alliancePage } from './alliancePageFixture'

describe('parseHeroPower', () => {
  it('reads rows', () => {
    expect(parseHeroPower(alliancePage([['Tricky100original', '284.48M']]))).toEqual([
      { name: 'Tricky100original', heroPower: 284480000 },
    ])
  })

  it('throws on a page without a members table', () => {
    expect(() => parseHeroPower('<html><body>nope</body></html>')).toThrow(/no members table/)
  })
})

describe('matchHeroPower', () => {
  it('ignores repeated internal whitespace', () => {
    const result = matchHeroPower([{ name: 'Chainsaw  Man', heroPower: 136770000 }], [{ id: 'a', name: 'chainsaw man' }])
    expect(result.updates).toEqual([{ dbId: 'a', THP: 136770000 }])
    expect(result.unmatched).toEqual([])
  })
})
