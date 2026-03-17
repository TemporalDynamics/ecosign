import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { requireInternalAuthLogged } from '../_shared/internalAuth.ts'
import { buildTrialOfferInviteEmail, normalizeEmail } from '../_shared/email.ts'

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

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function addMonthsUtc(now: Date, months: number): Date {
  const d = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds(),
    now.getUTCMilliseconds(),
  ))
  d.setUTCMonth(d.getUTCMonth() + months)
  return d
}

function parseAdminEmailsEnv(): string[] {
  const raw = (Deno.env.get('ADMIN_EMAILS') ?? '').trim()
  if (!raw) return []
  return raw.split(',').map((v) => normalizeEmail(v)).filter(Boolean)
}

async function requireAdminOrInternal(req: Request): Promise<
  | { ok: true; mode: 'internal' }
  | { ok: true; mode: 'admin_user'; userId: string; userEmail: string }
  | { ok: false; reason: string; status: number }
> {
  const internal = await requireInternalAuthLogged(req, 'admin-issue-trial-offer', {
    allowServiceRole: true,
    allowCronSecret: false,
  })
  if (internal.ok) return { ok: true, mode: 'internal' }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  if (!supabaseUrl || !anonKey) return { ok: false, reason: 'missing_supabase_env', status: 500 }

  const adminEmails = parseAdminEmailsEnv()
  if (adminEmails.length === 0) return { ok: false, reason: 'admin_emails_not_configured', status: 403 }

  const token = req.headers.get('authorization') ?? ''
  if (!token) return { ok: false, reason: 'missing_authorization', status: 401 }

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: token } },
  })

  const { data, error } = await userClient.auth.getUser()
  if (error || !data?.user?.email || !data.user.id) {
    return { ok: false, reason: 'invalid_user_session', status: 401 }
  }

  const email = normalizeEmail(data.user.email)
  if (!adminEmails.includes(email)) {
    return { ok: false, reason: 'not_admin', status: 403 }
  }

  return { ok: true, mode: 'admin_user', userId: String(data.user.id), userEmail: email }
}

async function getPlanIdByKey(supabase: any, planKey: string): Promise<string> {
  const { data, error } = await supabase
    .from('plans')
    .select('id,key,name')
    .eq('key', planKey)
    .eq('status', 'active')
    .maybeSingle()
  if (error || !data?.id) throw new Error(`plan_not_found:${planKey}`)
  return String(data.id)
}

async function ensureWorkspaceForOwner(supabase: any, ownerId: string): Promise<string> {
  const { data: existing, error } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`failed_to_read_workspaces:${error.message}`)
  if (existing?.id) return String(existing.id)

  const { data: inserted, error: insertErr } = await supabase
    .from('workspaces')
    .insert({ name: 'Personal Workspace', owner_id: ownerId })
    .select('id')
    .maybeSingle()
  if (insertErr || !inserted?.id) throw new Error(`failed_to_create_workspace:${insertErr?.message ?? 'unknown'}`)
  return String(inserted.id)
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

async function generateInviteLink(supabase: any, email: string, redirectTo: string) {
  const admin = supabase.auth.admin as any
  const payload = { type: 'invite', email, options: { redirectTo } }
  const { data, error } = await admin.generateLink(payload)
  if (error) throw new Error(`failed_generate_invite_link:${error.message}`)
  const actionLink = data?.properties?.action_link ?? data?.action_link ?? null
  const userId = data?.user?.id ?? data?.user_id ?? null
  if (!actionLink) throw new Error('missing_action_link')
  return { actionLink: String(actionLink), userId: userId ? String(userId) : null }
}

async function updateUserMetadata(supabase: any, userId: string, patch: Record<string, unknown>) {
  const { data: userRes, error: getErr } = await supabase.auth.admin.getUserById(userId)
  if (getErr || !userRes?.user) return
  const existing = (userRes.user.user_metadata && typeof userRes.user.user_metadata === 'object')
    ? userRes.user.user_metadata
    : {}
  await supabase.auth.admin.updateUserById(userId, { user_metadata: { ...existing, ...patch } })
}

async function replaceWorkspacePlanState(supabase: any, workspaceId: string, next: {
  planId: string
  status: 'trialing' | 'active'
  trialEndsAt?: string | null
}) {
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
    if (deleteErr) throw new Error(`failed_cleanup_workspace_plan:${deleteErr.message}`)

    const { error: cancelErr } = await supabase
      .from('workspace_plan')
      .update({ status: 'canceled', ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', currentId)
    if (cancelErr) throw new Error(`failed_cancel_existing_plan:${cancelErr.message}`)
  } else {
    const { error: resetErr } = await supabase
      .from('workspace_plan')
      .delete()
      .eq('workspace_id', workspaceId)
    if (resetErr) throw new Error(`failed_reset_workspace_plan:${resetErr.message}`)
  }

  const insertPayload: Record<string, unknown> = {
    workspace_id: workspaceId,
    plan_id: next.planId,
    status: next.status,
    started_at: new Date().toISOString(),
  }
  if (next.status === 'trialing') insertPayload.trial_ends_at = next.trialEndsAt ?? null

  const { error: insertErr } = await supabase.from('workspace_plan').insert(insertPayload)
  if (insertErr) throw new Error(`failed_insert_workspace_plan:${insertErr.message}`)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405)

  const auth = await requireAdminOrInternal(req)
  if (!auth.ok) return jsonResponse({ error: auth.reason }, auth.status)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const siteUrl = (Deno.env.get('SITE_URL') || 'https://ecosign.app').replace(/\/$/, '')

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'missing_supabase_env' }, 500)
  }

  try {
    const body = await req.json().catch(() => ({}))

    const recipientEmail = normalizeEmail(body.email ?? body.recipient_email ?? body.recipientEmail)
    if (!recipientEmail) return jsonResponse({ error: 'missing_email' }, 400)

    const planKey = normalizeText(body.plan_key ?? body.planKey) || 'business'
    const trialMonths = Math.min(24, toPositiveInt(body.trial_months ?? body.trialMonths, 1))
    const nextPlanKey = normalizeText(body.next_plan_key ?? body.nextPlanKey) || planKey

    const discountPercent = toNullableNumber(body.discount_percent ?? body.discountPercent)
    const discountMonths = body.discount_months ?? body.discountMonths
    const discountMonthsInt = discountPercent !== null
      ? Math.min(36, toPositiveInt(discountMonths, 1))
      : null

    const notes = normalizeText(body.notes)

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const redirectTo = `${siteUrl}/dashboard`

    const existingUserId = await getUserIdByEmailBestEffort(supabase, recipientEmail)
    const invite = await generateInviteLink(supabase, recipientEmail, redirectTo)
    const ownerId = existingUserId ?? invite.userId
    if (!ownerId) throw new Error('failed_to_resolve_owner_id')

    const workspaceId = await ensureWorkspaceForOwner(supabase, ownerId)
    const planId = await getPlanIdByKey(supabase, planKey)

    const now = new Date()
    const trialEndsAt = addMonthsUtc(now, trialMonths).toISOString()

    await replaceWorkspacePlanState(supabase, workspaceId, {
      planId,
      status: 'trialing',
      trialEndsAt,
    })

    // Replace any active offer for this workspace with a new one.
    await supabase
      .from('workspace_trial_offers')
      .update({ status: 'revoked', updated_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')

    const { data: offerRow, error: offerErr } = await supabase
      .from('workspace_trial_offers')
      .insert({
        workspace_id: workspaceId,
        owner_id: ownerId,
        recipient_email: recipientEmail,
        plan_key: planKey,
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEndsAt,
        next_plan_key: nextPlanKey,
        discount_percent: discountPercent,
        discount_months: discountMonthsInt,
        status: 'active',
        created_by: auth.ok && auth.mode === 'admin_user' ? auth.userId : null,
        metadata: {
          notes: notes || null,
          decided_by: auth.ok && auth.mode === 'admin_user' ? auth.userEmail : 'internal',
        },
      })
      .select('id')
      .maybeSingle()
    if (offerErr) throw new Error(`failed_insert_offer:${offerErr.message}`)

    await updateUserMetadata(supabase, ownerId, {
      plan: planKey,
      plan_status: 'trialing',
      trial_ends_at: trialEndsAt,
      workspace_id: workspaceId,
      discount_percent: discountPercent,
      discount_months: discountMonthsInt,
      next_plan_key: nextPlanKey,
    })

    const emailPayload = await buildTrialOfferInviteEmail({
      recipientEmail,
      planKey,
      trialMonths,
      trialEndsAt,
      nextPlanKey,
      discountPercent,
      discountMonths: discountMonthsInt,
      actionLink: invite.actionLink,
      notes: notes || null,
      siteUrl,
    })

    const { error: queueErr } = await supabase
      .from('system_emails')
      .insert({
        recipient_email: recipientEmail,
        email_type: 'trial_offer_invite',
        subject: emailPayload.subject,
        body_html: emailPayload.html,
        metadata: {
          workspace_id: workspaceId,
          owner_id: ownerId,
          offer_id: offerRow?.id ?? null,
          plan_key: planKey,
          trial_months: trialMonths,
          trial_ends_at: trialEndsAt,
          next_plan_key: nextPlanKey,
          discount_percent: discountPercent,
          discount_months: discountMonthsInt,
          action_link: invite.actionLink,
        },
        delivery_status: 'pending',
        attempts: 0,
      })
    if (queueErr) throw new Error(`failed_queue_email:${queueErr.message}`)

    return jsonResponse({
      ok: true,
      recipient_email: recipientEmail,
      owner_id: ownerId,
      workspace_id: workspaceId,
      plan_key: planKey,
      trial_months: trialMonths,
      trial_ends_at: trialEndsAt,
      next_plan_key: nextPlanKey,
      discount_percent: discountPercent,
      discount_months: discountMonthsInt,
      offer_id: offerRow?.id ?? null,
      action_link: invite.actionLink,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse({ error: 'internal_error', message }, 500)
  }
})

