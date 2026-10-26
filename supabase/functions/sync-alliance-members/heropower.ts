// Parses total hero power from a lastwarrank.com alliance page. The site has no API, but the
// page is server-rendered, so the members table is present in the raw HTML. It only lists
// members ranked in the server's top 200, so some alliance members will have no row.

export interface HeroPowerRow {
  name: string
  heroPower: number
}

export interface HeroPowerUpdate {
  dbId: string
  THP: number
}

export interface HeroPowerMatch {
  updates: HeroPowerUpdate[]
  // DB member names with no row on the page (outside the server top 200, or renamed).
  unmatched: string[]
}

const SUFFIX: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9 }

export function parsePowerValue(text: string): number | null {
  const m = text.trim().replace(/,/g, '').match(/^(\d+(?:\.\d+)?)([KMB])?$/i)
  if (!m) return null
  const mult = m[2] ? SUFFIX[m[2].toUpperCase()] : 1
  return Math.round(parseFloat(m[1]) * mult)
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
}

function cellText(html: string): string {
  return decodeEntities(html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]*>/g, '')).trim()
}

function cells(rowHtml: string): string[] {
  return [...rowHtml.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/g)].map((m) => cellText(m[1]))
}

export function parseHeroPower(html: string): HeroPowerRow[] {
  const table = html.match(/<table\b[\s\S]*?<\/table>/)
  if (!table) throw new Error('lastwarrank: no members table found on page')

  const rows = [...table[0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => cells(m[1]))
  const header = rows.shift() ?? []
  const nameCol = header.indexOf('Commander')
  const hpCol = header.indexOf('Hero Power')
  if (nameCol < 0 || hpCol < 0) {
    throw new Error(`lastwarrank: expected Commander and Hero Power columns, got [${header.join(', ')}]`)
  }

  const result: HeroPowerRow[] = []
  for (const r of rows) {
    const name = r[nameCol]
    const heroPower = parsePowerValue(r[hpCol] ?? '')
    if (name && heroPower !== null) result.push({ name, heroPower })
  }
  return result
}

const normalize = (name: string) => name.trim().toLowerCase()

// Matches page rows to DB members by name. Only THP is updated; the DB name is never changed.
export function matchHeroPower(
  rows: HeroPowerRow[],
  dbMembers: { id: string; name: string }[]
): HeroPowerMatch {
  const byName = new Map(rows.map((r) => [normalize(r.name), r.heroPower]))
  const updates: HeroPowerUpdate[] = []
  const unmatched: string[] = []

  for (const db of dbMembers) {
    const hp = byName.get(normalize(db.name))
    if (hp === undefined) unmatched.push(db.name)
    else updates.push({ dbId: db.id, THP: hp })
  }

  return { updates, unmatched }
}
