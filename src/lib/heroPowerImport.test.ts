import { describe, expect, it } from 'vitest'
import { buildHeroPowerPreview } from './heroPowerImport'
import { alliancePage } from './alliancePageFixture'

const members = [
  { id: 'idA', name: 'A', THP: 100 },
  { id: 'idB', name: 'B', THP: 200000000 },
  { id: 'idC', name: 'C', THP: undefined },
  { id: 'idD', name: 'D', THP: 5 },
]

describe('buildHeroPowerPreview', () => {
  it('lists only changed THP values and members not on the page', () => {
    const html = alliancePage([['A', '150M'], ['B', '200M'], ['C', '1.5B'], ['Stranger', '99M']])
    const preview = buildHeroPowerPreview(html, members)
    expect(preview.rowCount).toBe(4)
    expect(preview.matchedCount).toBe(3)
    expect(preview.changes).toEqual([
      { id: 'idC', name: 'C', oldTHP: null, newTHP: 1500000000 },
      { id: 'idA', name: 'A', oldTHP: 100, newTHP: 150000000 },
    ])
    expect(preview.unmatched).toEqual(['D'])
  })

  it('has no changes when no names match', () => {
    const preview = buildHeroPowerPreview(alliancePage([['Nobody', '1M']]), members)
    expect(preview.matchedCount).toBe(0)
    expect(preview.changes).toEqual([])
  })

  it('throws on a non-alliance page', () => {
    expect(() => buildHeroPowerPreview('<html>hi</html>', members)).toThrow(/no members table/)
  })
})
