import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { reconcile } from './reconcile.ts'

const SYNC_USER_ID = 'edac282d-fd53-4353-8af8-c6b7c3f7480d'
const LASTWAR_BASE = 'https://api.lastwar.tools'

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''

    // Allow service role key (pg_cron scheduled calls). Anything else must be
    // the specific sync user's JWT.
    if (token !== serviceRoleKey) {
      const supabaseForUser = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      )
      const { data: { user } } = await supabaseForUser.auth.getUser()
      if (!user || user.id !== SYNC_USER_ID) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    const apiKey = Deno.env.get('LASTWAR_API_KEY')!
    const allianceId = Deno.env.get('LASTWAR_ALLIANCE_ID')!

    // Fetch members from lastwar.tools shared queue (no session_key)
    const apiResp = await fetch(
      `${LASTWAR_BASE}/alliance/${allianceId}/members`,
      { headers: { 'X-API-Key': apiKey } }
    )

    if (!apiResp.ok) {
      const body = await apiResp.text().catch(() => '(no body)')
      return new Response(
        JSON.stringify({
          added: 0, updated: 0, removed: 0,
          errors: [`lastwar.tools API error ${apiResp.status}: ${body}`],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const apiData = await apiResp.json()
    const apiMembers = apiData.members ?? []

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const { data: dbRows, error: dbError } = await supabaseAdmin
      .from('members')
      .select('id, game_uid, name')

    if (dbError) throw dbError

    const result = reconcile(apiMembers, dbRows ?? [])

    const errors: string[] = []
    let added = 0
    let updated = 0
    let removed = 0

    // Insert brand-new members
    if (result.toInsert.length > 0) {
      const { error } = await supabaseAdmin.from('members').insert(
        result.toInsert.map((m) => ({
          game_uid: m.game_uid,
          name: m.name,
          Rank: m.Rank,
          THP: m.THP,
        }))
      )
      if (error) errors.push(`insert error: ${error.message}`)
      else added = result.toInsert.length
    }

    // Set game_uid + update stats for name-matched rows (null game_uid → now identified)
    for (const m of result.toMatchByName) {
      const { error } = await supabaseAdmin
        .from('members')
        .update({ game_uid: m.game_uid, name: m.name, Rank: m.Rank, THP: m.THP, updated_at: new Date().toISOString() })
        .eq('id', m.dbId)
      if (error) errors.push(`name-match update error for "${m.name}": ${error.message}`)
      else updated++
    }

    // Update stats for game_uid-matched rows
    for (const m of result.toUpdate) {
      const { error } = await supabaseAdmin
        .from('members')
        .update({ name: m.name, Rank: m.Rank, THP: m.THP, updated_at: new Date().toISOString() })
        .eq('game_uid', m.game_uid)
      if (error) errors.push(`update error for "${m.name}": ${error.message}`)
      else updated++
    }

    // Delete departed members (clear train_schedule FKs first)
    for (const dbId of result.toDelete) {
      await supabaseAdmin.from('train_schedule').update({ Conductor: null }).eq('Conductor', dbId)
      await supabaseAdmin.from('train_schedule').update({ VIP: null }).eq('VIP', dbId)
      const { error } = await supabaseAdmin.from('members').delete().eq('id', dbId)
      if (error) errors.push(`delete error for id "${dbId}": ${error.message}`)
      else removed++
    }

    return new Response(
      JSON.stringify({ added, updated, removed, errors }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ added: 0, updated: 0, removed: 0, errors: [String(err)] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
