// Handler: expire_trials
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import {
  requireAdminOrInternal,
  toPositiveInt,
  getPlanIdByKey,
  getActiveOfferForWorkspace,
} from '../helpers.ts'

export async function handleExpireTrials(req: Request, corsHeaders: Record<string, string>) {
  const auth = await requireAdminOrInternal(req, 'admin-trials')
  if (!auth.ok) {
    return { ok: false, error: auth.reason, status: auth.status }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const body = await req.json().catch(() => ({}))
    const limit = Math.min(500, toPositiveInt(body.limit, 50))
    const dryRun = Boolean(body.dry_run ?? body.dryRun)
    const nextPlanKey = String(body.next_plan_key ?? body.nextPlanKey ?? 'free').trim().toLowerCase()

    // Get default plan ID
    const planIdCache = new Map<string, string>()
    planIdCache.set(nextPlanKey, await getPlanIdByKey(supabase, nextPlanKey))

    const nowIso = new Date().toISOString()

    // Find expired trials
    const { data: expiredTrials, error } = await supabase
      .from('workspace_plan')
      .select('id,workspace_id,trial_ends_at')
      .eq('status', 'trialing')
      .not('trial_ends_at', 'is', null)
      .lte('trial_ends_at', nowIso)
      .order('trial_ends_at', { ascending: true })
      .limit(limit)

    if (error) {
      throw new Error(`failed_list_expired_trials:${error.message}`)
    }

    const results: Array<{ workspace_id: string; trial_row_id: string; ok: boolean; error?: string }> = []

    for (const row of expiredTrials ?? []) {
      const trialRowId = String((row as any).id)
      const workspaceId = String((row as any).workspace_id)

      if (dryRun) {
        results.push({ workspace_id: workspaceId, trial_row_id: trialRowId, ok: true })
        continue
      }

      try {
        // Check for active offer
        const offer = await getActiveOfferForWorkspace(supabase, workspaceId)
        const effectiveNextPlanKey = String(offer?.next_plan_key ?? nextPlanKey).trim().toLowerCase()
        
        if (!planIdCache.has(effectiveNextPlanKey)) {
          planIdCache.set(effectiveNextPlanKey, await getPlanIdByKey(supabase, effectiveNextPlanKey))
        }
        const effectiveNextPlanId = planIdCache.get(effectiveNextPlanKey) as string

        // Transition from trial to active plan
        await transitionWorkspaceFromExpiredTrial(supabase, workspaceId, trialRowId, effectiveNextPlanId)

        // Mark offer as consumed if exists
        if (offer?.id) {
          await supabase
            .from('workspace_trial_offers')
            .update({ status: 'consumed', updated_at: new Date().toISOString() })
            .eq('id', offer.id)
        }

        results.push({ workspace_id: workspaceId, trial_row_id: trialRowId, ok: true })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        results.push({ workspace_id: workspaceId, trial_row_id: trialRowId, ok: false, error: message })
      }
    }

    return {
      ok: true,
      status: 200,
      data: {
        processed: results.length,
        successful: results.filter(r => r.ok).length,
        failed: results.filter(r => !r.ok).length,
        results: dryRun ? results.map(r => ({ workspace_id: r.workspace_id, action: 'would_expire' })) : results,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message, status: 500 }
  }
}

async function transitionWorkspaceFromExpiredTrial(supabase: any, workspaceId: string, expiredTrialRowId: string, nextPlanId: string) {
  const nowIso = new Date().toISOString()

  // Cleanup other plans
  const { error: cleanupErr } = await supabase
    .from('workspace_plan')
    .delete()
    .eq('workspace_id', workspaceId)
    .neq('id', expiredTrialRowId)
  if (cleanupErr) throw new Error(`failed_cleanup:${cleanupErr.message}`)

  // Cancel existing trial
  const { error: cancelErr } = await supabase
    .from('workspace_plan')
    .update({ status: 'canceled', ended_at: nowIso, updated_at: nowIso })
    .eq('id', expiredTrialRowId)
  if (cancelErr) throw new Error(`failed_cancel:${cancelErr.message}`)

  // Insert active plan
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
