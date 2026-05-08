import { assertEquals, assertThrows } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { reconcile, mapRank } from './reconcile.ts'

Deno.test('mapRank converts integer 1-5 to R-string', () => {
  assertEquals(mapRank(1), 'R1')
  assertEquals(mapRank(3), 'R3')
  assertEquals(mapRank(5), 'R5')
})

Deno.test('mapRank throws for out-of-range values', () => {
  assertThrows(() => mapRank(0), Error, 'Invalid rank')
  assertThrows(() => mapRank(6), Error, 'Invalid rank')
})

Deno.test('reconcile: updates member matched by game_uid', () => {
  const result = reconcile(
    [{ uid: 'abc123', name: 'NewName', rank: 4, power: 85400000 }],
    [{ id: 'db-1', game_uid: 'abc123', name: 'OldName' }]
  )
  assertEquals(result.toUpdate, [{
    game_uid: 'abc123', name: 'NewName', Rank: 'R4', THP: 85400000
  }])
  assertEquals(result.toInsert, [])
  assertEquals(result.toMatchByName, [])
  assertEquals(result.toDelete, [])
})

Deno.test('reconcile: matches null-game_uid row by name (case-insensitive)', () => {
  const result = reconcile(
    [{ uid: 'abc123', name: 'ShadowMohawk', rank: 4, power: 31700000 }],
    [{ id: 'db-1', game_uid: null, name: 'shadowmohawk' }]
  )
  assertEquals(result.toMatchByName, [{
    dbId: 'db-1', game_uid: 'abc123', name: 'ShadowMohawk', Rank: 'R4', THP: 31700000
  }])
  assertEquals(result.toInsert, [])
  assertEquals(result.toUpdate, [])
  assertEquals(result.toDelete, [])
})

Deno.test('reconcile: inserts member not found in DB', () => {
  const result = reconcile(
    [{ uid: 'new-uid', name: 'NewPlayer', rank: 3, power: 20000000 }],
    []
  )
  assertEquals(result.toInsert, [{
    game_uid: 'new-uid', name: 'NewPlayer', Rank: 'R3', THP: 20000000
  }])
  assertEquals(result.toMatchByName, [])
  assertEquals(result.toUpdate, [])
  assertEquals(result.toDelete, [])
})

Deno.test('reconcile: deletes DB member with game_uid absent from API', () => {
  const result = reconcile(
    [],
    [{ id: 'db-1', game_uid: 'gone-uid', name: 'OldMember' }]
  )
  assertEquals(result.toDelete, ['db-1'])
  assertEquals(result.toInsert, [])
  assertEquals(result.toUpdate, [])
  assertEquals(result.toMatchByName, [])
})

Deno.test('reconcile: never deletes member with null game_uid', () => {
  const result = reconcile(
    [],
    [{ id: 'db-1', game_uid: null, name: 'ManualMember' }]
  )
  assertEquals(result.toDelete, [])
})

Deno.test('reconcile: handles mix of all four cases', () => {
  const result = reconcile(
    [
      { uid: 'uid-1', name: 'Updated', rank: 4, power: 50000000 },
      { uid: 'uid-2', name: 'NameMatch', rank: 3, power: 30000000 },
      { uid: 'uid-3', name: 'Brand New', rank: 2, power: 10000000 },
    ],
    [
      { id: 'db-1', game_uid: 'uid-1', name: 'Old Name' },
      { id: 'db-2', game_uid: null, name: 'namematch' },
      { id: 'db-3', game_uid: 'departed', name: 'Gone' },
      { id: 'db-4', game_uid: null, name: 'Manual Entry' },
    ]
  )
  assertEquals(result.toUpdate.length, 1)
  assertEquals(result.toMatchByName.length, 1)
  assertEquals(result.toInsert.length, 1)
  assertEquals(result.toDelete, ['db-3'])
})
