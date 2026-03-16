import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { requireInternalAuthLogged } from '../_shared/internalAuth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': (Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SITE_URL') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret, x-internal-secret',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function toPositiveInt(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  const i = Math.floor(n)
  return i > 0 ? i : fallback
}

async function updateUserMetadataPlan(supabase: any, userId: string, patch: Record<string, unknown>) {
  const { data: userRes, error: getErr } = await supabase.auth.admin.getUserById(userId)
  if (getErr || !userRes?.user) return
  const existing = (userRes.user.user_metadata && typeof userRes.user.user_metadata === 'object')
    ? userRes.user.user_metadata
    : {}
  await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { ...existing, ...patch },
  })
}

async function getPlanIdByKey(supabase: any, planKey: string): Promise<string> {
  const { data, error } = await supabase
    .from('plans')
    .select('id')
    .eq('key', planKey)
    .eq('status', 'active')
    .maybeSingle()
  if (error || !data?.id) throw new Error(`plan_not_found:${planKey}`)
  return data.id
}

async function transitionWorkspaceFromExpiredTrial(supabase: any, workspaceId: string, expiredTrialRowId: string, nextPlanId: string) {
  const nowIso = new Date().toISOString()

  const { error: cleanupErr } = await supabase
    .from('workspace_plan')
    .delete()
    .eq('workspace_id', workspaceId)
    .neq('id', expiredTrialRowId)
  if (cleanupErr) throw new Error(`failed_cleanup:${cleanupErr.message}`)

  const { error: cancelErr } = await supabase
    .from('workspace_plan')
    .update({ status: 'canceled', ended_at: nowIso, updated_at: nowIso })
    .eq('id', expiredTrialRowId)
  if (cancelErr) throw new Error(`failed_cancel:${cancelErr.message}`)

  const { error: insertErr } = await supabase
    .from('workspace_plan')
    .insert({
      workspace_id: workspaceId,
      plan_id: nextPlanId,
      status: 'active',
      started_at: nowIso,
    })
  if (insertErr) throw new Error(`failed_insert_active:${insertErr.message}`)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405)

  const auth = await requireInternalAuthLogged(req, 'admin-expire-workspace-trials', {
    allowServiceRole: true,
    allowCronSecret: true,
  })
  if (!auth.ok) return jsonResponse({ error: auth.reason }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'missing_supabase_env' }, 500)
  }

  try {
    const body = await req.json().catch(() => ({}))
    const limit = Math.min(500, toPositiveInt(body.limit, 50))
    const dryRun = Boolean(body.dry_run ?? body.dryRun)
    const nextPlanKey = String(body.next_plan_key ?? body.nextPlanKey ?? 'free').trim().toLowerCase()

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const nextPlanId = await getPlanIdByKey(supabase, nextPlanKey)
    const nowIso = new Date().toISOString()

    const { data: expiredTrials, error } = await supabase
      .from('workspace_plan')
      .select('id,workspace_id,trial_ends_at')
      .eq('status', 'trialing')
      .not('trial_ends_at', 'is', null)
      .lte('trial_ends_at', nowIso)
      .order('trial_ends_at', { ascending: true })
      .limit(limit)

    if (error) throw new Error(`failed_list_expired_trials:${error.message}`)

    const results: Array<{ workspace_id: string; trial_row_id: string; ok: boolean; error?: string }> = []

    for (const row of expiredTrials ?? []) {
      const trialRowId = String((row as any).id)
      const workspaceId = String((row as any).workspace_id)
      if (dryRun) {
        results.push({ workspace_id: workspaceId, trial_row_id: trialRowId, ok: true })
        continue
      }

      try {
        await transitionWorkspaceFromExpiredTrial(supabase, workspaceId, trialRowId, nextPlanId)

        const { data: ws } = await supabase
          .from('workspaces')
          .select('owner_id')
          .eq('id', workspaceId)
          .maybeSingle()
        if (ws?.owner_id) {
          await updateUserMetadataPlan(supabase, String(ws.owner_id), {
            plan: nextPlanKey,
            plan_status: 'active',
            trial_ends_at: null,
            workspace_id: workspaceId,
          })
        }

        results.push({ workspace_id: workspaceId, trial_row_id: trialRowId, ok: true })
      } catch (err) {
        results.push({
          workspace_id: workspaceId,
          trial_row_id: trialRowId,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    const okCount = results.filter((r) => r.ok).length
    const failCount = results.length - okCount

    return jsonResponse({
      ok: true,
      dry_run: dryRun,
      checked: results.length,
      expired_processed: okCount,
      failed: failCount,
      next_plan_key: nextPlanKey,
      results,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse({ error: 'internal_error', message }, 500)
  }
})

