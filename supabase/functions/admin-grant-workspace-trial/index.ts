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

function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase()
}

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function toPositiveInt(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  const i = Math.floor(n)
  return i > 0 ? i : fallback
}

async function updateUserMetadataPlan(supabase: any, userId: string, patch: Record<string, unknown>) {
  const { data: userRes, error: getErr } = await supabase.auth.admin.getUserById(userId)
  if (getErr || !userRes?.user) {
    throw new Error(`failed_to_fetch_user:${getErr?.message ?? 'unknown'}`)
  }
  const existing = (userRes.user.user_metadata && typeof userRes.user.user_metadata === 'object')
    ? userRes.user.user_metadata
    : {}

  const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { ...existing, ...patch },
  })
  if (updateErr) {
    throw new Error(`failed_to_update_user_metadata:${updateErr.message}`)
  }
}

async function ensureWorkspaceForOwner(supabase: any, ownerId: string): Promise<{ id: string; created: boolean }> {
  const { data: existing, error } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`failed_to_read_workspaces:${error.message}`)
  if (existing?.id) return { id: existing.id, created: false }

  const { data: inserted, error: insertErr } = await supabase
    .from('workspaces')
    .insert({ name: 'Personal Workspace', owner_id: ownerId })
    .select('id')
    .maybeSingle()

  if (insertErr || !inserted?.id) {
    throw new Error(`failed_to_create_workspace:${insertErr?.message ?? 'unknown'}`)
  }

  return { id: inserted.id, created: true }
}

async function getUserIdByEmailBestEffort(supabase: any, email: string): Promise<string | null> {
  const normalized = normalizeEmail(email)
  if (!normalized) return null

  const perPage = 200
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`failed_to_list_users:${error.message}`)
    const users: Array<any> = Array.isArray(data?.users) ? data.users : []
    const match = users.find((u) => normalizeEmail(u?.email) === normalized)
    if (match?.id) return String(match.id)
    if (users.length < perPage) break
  }
  return null
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

async function replaceWorkspacePlanState(supabase: any, workspaceId: string, next: {
  planId: string
  status: 'trialing' | 'active'
  trialEndsAt?: string | null
}): Promise<void> {
  const { data: rows, error: listErr } = await supabase
    .from('workspace_plan')
    .select('id,status,started_at')
    .eq('workspace_id', workspaceId)
    .order('started_at', { ascending: false })

  if (listErr) throw new Error(`failed_to_list_workspace_plan:${listErr.message}`)

  const current = (rows ?? []).find((r: any) => ['active', 'trialing', 'past_due'].includes(String(r.status)))
  const currentId = current?.id ? String(current.id) : null

  if (currentId) {
    const { error: deleteErr } = await supabase
      .from('workspace_plan')
      .delete()
      .eq('workspace_id', workspaceId)
      .neq('id', currentId)
    if (deleteErr) throw new Error(`failed_to_cleanup_workspace_plan:${deleteErr.message}`)

    if (String(current.status) !== 'canceled') {
      const { error: cancelErr } = await supabase
        .from('workspace_plan')
        .update({ status: 'canceled', ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', currentId)
      if (cancelErr) throw new Error(`failed_to_cancel_existing_plan:${cancelErr.message}`)
    }
  } else {
    const { error: deleteAllErr } = await supabase
      .from('workspace_plan')
      .delete()
      .eq('workspace_id', workspaceId)
    if (deleteAllErr) throw new Error(`failed_to_reset_workspace_plan:${deleteAllErr.message}`)
  }

  const insertPayload: Record<string, unknown> = {
    workspace_id: workspaceId,
    plan_id: next.planId,
    status: next.status,
    started_at: new Date().toISOString(),
  }
  if (next.status === 'trialing') {
    insertPayload.trial_ends_at = next.trialEndsAt ?? null
  }

  const { error: insertErr } = await supabase.from('workspace_plan').insert(insertPayload)
  if (insertErr) throw new Error(`failed_to_insert_workspace_plan:${insertErr.message}`)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405)

  const auth = await requireInternalAuthLogged(req, 'admin-grant-workspace-trial', {
    allowServiceRole: true,
    allowCronSecret: false,
  })
  if (!auth.ok) return jsonResponse({ error: auth.reason }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'missing_supabase_env' }, 500)
  }

  try {
    const body = await req.json().catch(() => ({}))
    const workspaceId = normalizeText(body.workspace_id ?? body.workspaceId)
    const ownerIdInput = normalizeText(body.owner_id ?? body.ownerId)
    const ownerEmail = normalizeEmail(body.owner_email ?? body.ownerEmail)
    const planKey = normalizeText(body.plan_key ?? body.planKey) || 'business'
    const trialDays = Math.min(365, toPositiveInt(body.trial_days ?? body.trialDays, 30))

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    let resolvedWorkspaceId = ''
    let resolvedOwnerId = ''

    if (workspaceId) {
      const { data: ws, error: wsErr } = await supabase
        .from('workspaces')
        .select('id,owner_id')
        .eq('id', workspaceId)
        .maybeSingle()
      if (wsErr || !ws?.id) return jsonResponse({ error: 'workspace_not_found' }, 404)
      resolvedWorkspaceId = String(ws.id)
      resolvedOwnerId = String(ws.owner_id)
    } else {
      if (!ownerIdInput && !ownerEmail) {
        return jsonResponse({ error: 'missing_workspace_or_owner' }, 400)
      }

      if (ownerIdInput) {
        resolvedOwnerId = ownerIdInput
      } else {
        const userId = await getUserIdByEmailBestEffort(supabase, ownerEmail)
        if (!userId) {
          return jsonResponse({ error: 'owner_not_found' }, 404)
        }
        resolvedOwnerId = userId
      }

      const ensured = await ensureWorkspaceForOwner(supabase, resolvedOwnerId)
      resolvedWorkspaceId = ensured.id
    }

    const planId = await getPlanIdByKey(supabase, planKey)
    const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()

    await replaceWorkspacePlanState(supabase, resolvedWorkspaceId, {
      planId,
      status: 'trialing',
      trialEndsAt,
    })

    await updateUserMetadataPlan(supabase, resolvedOwnerId, {
      plan: planKey,
      plan_status: 'trialing',
      trial_ends_at: trialEndsAt,
      workspace_id: resolvedWorkspaceId,
    })

    return jsonResponse({
      ok: true,
      workspace_id: resolvedWorkspaceId,
      owner_id: resolvedOwnerId,
      plan_key: planKey,
      status: 'trialing',
      trial_days: trialDays,
      trial_ends_at: trialEndsAt,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse({ error: 'internal_error', message }, 500)
  }
})
