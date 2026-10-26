import { assertEquals, assertThrows } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { parseHeroPower, parsePowerValue, matchHeroPower } from './heropower.ts'

const th = (label: string) =>
  `<th scope="col" class="px-3"><span class="inline-flex"><svg width="16"><path d="m10 2.5"></path></svg>${label}</span></th>`

const row = (name: string, heroPower: string) =>
  `<tr class="border-t"><td class="px-3"><span class="text-base">1</span></td>` +
  `<td class="px-3"><a class="font-medium" href="/player/2QK9DBNYHW">${name}</a></td>` +
  `<td class="px-3"><span title="R4 since 14 Jul 2026">R<!-- -->4</span></td>` +
  `<td class="px-3"><span class="text-muted">🇬🇧 United Kingdom</span></td>` +
  `<td class="px-3 text-metric-thp">${heroPower}</td>` +
  `<td class="px-3 text-metric-power">444.24M</td>` +
  `<td class="px-3"><span class="font-mono">35</span></td></tr>`

const page = (...rows: string[]) =>
  `<html><body><h1>Alliance</h1><table class="w-full"><thead><tr>` +
  ['#', 'Commander', 'Rank', 'Country', 'Hero Power', 'Power', 'Base'].map(th).join('') +
  `</tr></thead><tbody>${rows.join('')}</tbody></table></body></html>`

Deno.test('parsePowerValue handles K/M/B suffixes', () => {
  assertEquals(parsePowerValue('278.06M'), 278060000)
  assertEquals(parsePowerValue('1.5B'), 1500000000)
  assertEquals(parsePowerValue('950K'), 950000)
  assertEquals(parsePowerValue('12345'), 12345)
  assertEquals(parsePowerValue(' 1,234 '), 1234)
})

Deno.test('parsePowerValue returns null for placeholders', () => {
  assertEquals(parsePowerValue('—'), null)
  assertEquals(parsePowerValue(''), null)
})

Deno.test('parseHeroPower reads name and hero power from the members table', () => {
  const rows = parseHeroPower(page(row('Tricky100original', '278.06M'), row('ARes 아레스', '234.94M')))
  assertEquals(rows, [
    { name: 'Tricky100original', heroPower: 278060000 },
    { name: 'ARes 아레스', heroPower: 234940000 },
  ])
})

Deno.test('parseHeroPower decodes HTML entities and strips comments in names', () => {
  const rows = parseHeroPower(page(row('Tom &amp; Jerry<!-- -->', '1M'), row('O&#x27;Neil', '2M')))
  assertEquals(rows.map((r) => r.name), ['Tom & Jerry', "O'Neil"])
})

Deno.test('parseHeroPower skips rows without a hero power value', () => {
  const rows = parseHeroPower(page(row('Someone', '—'), row('Other', '5M')))
  assertEquals(rows, [{ name: 'Other', heroPower: 5000000 }])
})

Deno.test('parseHeroPower throws when the Hero Power column is missing', () => {
  const html = `<table><tr>${th('Commander')}${th('Power')}</tr>${row('X', '1M')}</table>`
  assertThrows(() => parseHeroPower(html), Error, 'Hero Power')
})

Deno.test('parseHeroPower throws when there is no table', () => {
  assertThrows(() => parseHeroPower('<html>Just a moment...</html>'), Error, 'table')
})

Deno.test('matchHeroPower matches db names case-insensitively and reports unmatched db members', () => {
  const result = matchHeroPower(
    [
      { name: 'Tricky100original', heroPower: 278060000 },
      { name: ' ares 아레스 ', heroPower: 234940000 },
      { name: 'Not In Alliance Db', heroPower: 1 },
    ],
    [
      { id: 'db-1', name: 'TRICKY100original' },
      { id: 'db-2', name: 'ARes 아레스' },
      { id: 'db-3', name: 'Low Power Member' },
    ]
  )
  assertEquals(result.updates, [
    { dbId: 'db-1', THP: 278060000 },
    { dbId: 'db-2', THP: 234940000 },
  ])
  assertEquals(result.unmatched, ['Low Power Member'])
})
