export type RankValue = 'R1' | 'R2' | 'R3' | 'R4' | 'R5'

export interface ApiMember {
  uid: string
  name: string
  rank: number
  power: number
}

export interface DbMember {
  id: string
  game_uid: string | null
  name: string
}

// Field names match Supabase column names exactly (Rank and THP are PascalCase/uppercase in the schema).
export interface SyncUpdate {
  game_uid: string
  name: string
  Rank: RankValue
  THP: number
}

export interface NameMatch extends SyncUpdate {
  dbId: string
}

export interface ReconcileResult {
  toInsert: SyncUpdate[]
  toUpdate: SyncUpdate[]
  toMatchByName: NameMatch[]
  toDelete: string[]
}

export function mapRank(rank: number): RankValue {
  if (!Number.isInteger(rank) || rank < 1 || rank > 5) throw new Error(`Invalid rank: ${rank}`)
  return `R${rank}` as RankValue
}

export function reconcile(apiMembers: ApiMember[], dbMembers: DbMember[]): ReconcileResult {
  const toInsert: SyncUpdate[] = []
  const toUpdate: SyncUpdate[] = []
  const toMatchByName: NameMatch[] = []
  const toDelete: string[] = []

  const apiUids = new Set(apiMembers.map((m) => m.uid))

  const dbByUid = new Map(
    dbMembers.filter((m) => m.game_uid !== null).map((m) => [m.game_uid!, m])
  )
  const dbByNameLower = new Map(
    dbMembers.filter((m) => m.game_uid === null).map((m) => [m.name.toLowerCase(), m])
  )

  for (const api of apiMembers) {
    const update: SyncUpdate = {
      game_uid: api.uid,
      name: api.name,
      Rank: mapRank(api.rank),
      THP: Math.round((api.power / 1_000_000) * 10) / 10,
    }

    if (dbByUid.has(api.uid)) {
      toUpdate.push(update)
    } else {
      const nameMatch = dbByNameLower.get(api.name.toLowerCase())
      if (nameMatch) {
        toMatchByName.push({ ...update, dbId: nameMatch.id })
      } else {
        toInsert.push(update)
      }
    }
  }

  for (const db of dbMembers) {
    if (db.game_uid !== null && !apiUids.has(db.game_uid)) {
      toDelete.push(db.id)
    }
  }

  return { toInsert, toUpdate, toMatchByName, toDelete }
}
