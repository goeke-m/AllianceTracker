import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { reconcile } from './reconcile.ts'
import { parseHeroPower, matchHeroPower } from './heropower.ts'

const SYNC_USER_ID = 'edac282d-fd53-4353-8af8-c6b7c3f7480d'
const LASTWAR_BASE = 'https://api.lastwar.tools'
const LASTWARRANK_BASE = 'https://lastwarrank.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''

    // Decode the JWT role claim to distinguish service_role (pg_cron) from user JWTs.
    let jwtRole: string | null = null
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      jwtRole = payload.role ?? null
    } catch { /* not a valid JWT */ }

    // Allow service_role calls (pg_cron scheduled invocations) through unconditionally.
    // Anything else must be the specific sync user's JWT.
    if (jwtRole !== 'service_role') {
      const supabaseForUser = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      )
      const { data: { user } } = await supabaseForUser.auth.getUser()
      if (!user || user.id !== SYNC_USER_ID) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }
    }

    const apiKey = Deno.env.get('LASTWAR_API_KEY')!
    const allianceId = Deno.env.get('LASTWAR_ALLIANCE_ID')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Call the alliance members endpoint directly (API handles queuing internally)
    const membersResp = await fetch(`${LASTWAR_BASE}/alliance/${allianceId}/members`, {
      headers: { 'X-API-Key': apiKey },
    })

    if (!membersResp.ok) {
      const body = await membersResp.text().catch(() => '(no body)')
      return new Response(
        JSON.stringify({ added: 0, updated: 0, removed: 0, errors: [`API error ${membersResp.status}: ${body}`] }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const { members: apiMembers = [] } = await membersResp.json() as { members: unknown[] }

    if (apiMembers.length === 0) {
      return new Response(
        JSON.stringify({ added: 0, updated: 0, removed: 0, errors: ['API returned empty member list — aborting to prevent mass delete'] }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const { data: dbRows, error: dbError } = await supabaseAdmin
      .from('members')
      .select('id, game_uid, name')

    if (dbError) throw new Error(dbError.message)

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
          updated_at: new Date().toISOString(),
        }))
      )
      if (error) errors.push(`insert error: ${error.message}`)
      else added = result.toInsert.length
    }

    // Set game_uid + update stats for name-matched rows (null game_uid → now identified)
    for (const m of result.toMatchByName) {
      const { error } = await supabaseAdmin
        .from('members')
        .update({ game_uid: m.game_uid, name: m.name, Rank: m.Rank, updated_at: new Date().toISOString() })
        .eq('id', m.dbId)
      if (error) errors.push(`name-match update error for "${m.name}": ${error.message}`)
      else updated++
    }

    // Update stats for game_uid-matched rows
    for (const m of result.toUpdate) {
      const { error } = await supabaseAdmin
        .from('members')
        .update({ name: m.name, Rank: m.Rank, updated_at: new Date().toISOString() })
        .eq('game_uid', m.game_uid)
      if (error) errors.push(`update error for "${m.name}": ${error.message}`)
      else updated++
    }

    // Delete departed members (clear train_schedule FKs first)
    for (const dbId of result.toDelete) {
      const { error: e1 } = await supabaseAdmin.from('train_schedule').update({ Conductor: null }).eq('Conductor', dbId)
      if (e1) { errors.push(`train_schedule Conductor clear error for "${dbId}": ${e1.message}`); continue }
      const { error: e2 } = await supabaseAdmin.from('train_schedule').update({ VIP: null }).eq('VIP', dbId)
      if (e2) { errors.push(`train_schedule VIP clear error for "${dbId}": ${e2.message}`); continue }
      const { error } = await supabaseAdmin.from('members').delete().eq('id', dbId)
      if (error) errors.push(`delete error for id "${dbId}": ${error.message}`)
      else removed++
    }

    // Total hero power isn't in the API, so scrape it from lastwarrank.com. Runs after the
    // member sync so newly inserted members are included. Failures are reported but non-fatal.
    let heroPowerUpdated = 0
    let heroPowerUnmatched: string[] = []
    const rankAllianceId = Deno.env.get('LASTWARRANK_ALLIANCE_ID')
    if (rankAllianceId) {
      try {
        const pageResp = await fetch(`${LASTWARRANK_BASE}/alliance/${rankAllianceId}`, {
          headers: { 'User-Agent': 'AllianceTracker/1.0 (alliance member sync)' },
        })
        if (!pageResp.ok) throw new Error(`HTTP ${pageResp.status}`)
        const rows = parseHeroPower(await pageResp.text())

        const { data: current, error: currentErr } = await supabaseAdmin.from('members').select('id, name')
        if (currentErr) throw new Error(currentErr.message)

        const match = matchHeroPower(rows, current ?? [])
        heroPowerUnmatched = match.unmatched
        for (const u of match.updates) {
          const { error } = await supabaseAdmin.from('members').update({ THP: u.THP }).eq('id', u.dbId)
          if (error) errors.push(`hero power update error for "${u.dbId}": ${error.message}`)
          else heroPowerUpdated++
        }
      } catch (err) {
        errors.push(`hero power scrape failed: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    return new Response(
      JSON.stringify({ added, updated, removed, heroPowerUpdated, heroPowerUnmatched, errors }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ added: 0, updated: 0, removed: 0, errors: [String(err)] }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
})
