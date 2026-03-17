import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { buildWorkspaceMemberInviteEmail, normalizeEmail } from '../_shared/email.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': (Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SITE_URL') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
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

function parseAdminEmailsEnv(): string[] {
  const raw = (Deno.env.get('ADMIN_EMAILS') ?? '').trim()
  if (!raw) return []
  return raw.split(',').map((v) => normalizeEmail(v)).filter(Boolean)
}

async function resolveAuthUser(supabase: any, authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}

async function getPlanEffectiveLimits(supabase: any, workspaceId: string) {
  const { data, error } = await supabase.rpc('compute_workspace_effective_limits_v2', {
    p_workspace_id: workspaceId,
  })
  if (error || !Array.isArray(data) || data.length === 0) {
    return { agent_seats_limit: null, supervisor_seats_limit: null }
  }
  const row = data[0] as any
  return {
    agent_seats_limit: row.agent_seats_limit ?? row.seats_limit ?? null,
    supervisor_seats_limit: row.supervisor_seats_limit ?? null,
  }
}

async function countActiveMembers(supabase: any, workspaceId: string) {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('role,status')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
  if (error) throw new Error(`failed_list_members:${error.message}`)

  let supervisors = 0
  let agents = 0
  for (const row of data ?? []) {
    const role = String((row as any).role)
    if (role === 'agent') agents += 1
    if (role === 'owner_supervisor' || role === 'supervisor_admin') supervisors += 1
  }
  return { supervisors, agents }
}

async function generateInviteLink(supabase: any, email: string, redirectTo: string) {
  const admin = supabase.auth.admin as any
  const { data, error } = await admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo },
  })
  if (error) throw new Error(`failed_generate_invite_link:${error.message}`)
  const actionLink = data?.properties?.action_link ?? data?.action_link ?? null
  const userId = data?.user?.id ?? data?.user_id ?? null
  if (!actionLink) throw new Error('missing_action_link')
  if (!userId) throw new Error('missing_user_id')
  return { actionLink: String(actionLink), userId: String(userId) }
}

function randomWrapSaltHex(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function ensureProfileActiveWorkspace(supabase: any, userId: string, workspaceId: string) {
  const wrapSalt = randomWrapSaltHex()
  const { error } = await supabase
    .from('profiles')
    .upsert({
      user_id: userId,
      wrap_salt: wrapSalt,
      active_workspace_id: workspaceId,
    }, { onConflict: 'user_id' })
  if (error) {
    console.warn('ensureProfileActiveWorkspace failed', { userId, message: error.message })
  }
}

async function updateUserMetadataWorkspace(supabase: any, userId: string, patch: Record<string, unknown>) {
  const { data: userRes, error: getErr } = await supabase.auth.admin.getUserById(userId)
  if (getErr || !userRes?.user) return
  const existing = (userRes.user.user_metadata && typeof userRes.user.user_metadata === 'object')
    ? userRes.user.user_metadata
    : {}
  await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { ...existing, ...patch },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: 'missing_supabase_env' }, 500)

  const adminEmails = parseAdminEmailsEnv()
  if (adminEmails.length === 0) return jsonResponse({ error: 'admin_emails_not_configured' }, 403)

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const authUser = await resolveAuthUser(supabase, req.headers.get('Authorization'))
  if (!authUser?.email || !authUser?.id) return jsonResponse({ error: 'unauthorized' }, 401)
  if (!adminEmails.includes(normalizeEmail(authUser.email))) return jsonResponse({ error: 'not_admin' }, 403)

  try {
    const body = await req.json().catch(() => ({}))
    const workspaceId = normalizeText(body.workspace_id ?? body.workspaceId)
    const email = normalizeEmail(body.email)
    const role = normalizeText(body.role) as 'agent' | 'supervisor_admin'

    if (!workspaceId) return jsonResponse({ error: 'missing_workspace_id' }, 400)
    if (!email) return jsonResponse({ error: 'missing_email' }, 400)
    if (!['agent', 'supervisor_admin'].includes(role)) return jsonResponse({ error: 'invalid_role' }, 400)

    const { data: ws, error: wsErr } = await supabase
      .from('workspaces')
      .select('id,name,owner_id')
      .eq('id', workspaceId)
      .maybeSingle()
    if (wsErr || !ws?.id) return jsonResponse({ error: 'workspace_not_found' }, 404)

    const limits = await getPlanEffectiveLimits(supabase, workspaceId)
    const counts = await countActiveMembers(supabase, workspaceId)

    if (role === 'agent' && limits.agent_seats_limit !== null && counts.agents >= Number(limits.agent_seats_limit)) {
      return jsonResponse({ error: 'agent_seat_limit_reached', details: { agents: counts.agents, limit: limits.agent_seats_limit } }, 409)
    }
    if (role === 'supervisor_admin' && limits.supervisor_seats_limit !== null && counts.supervisors >= Number(limits.supervisor_seats_limit)) {
      return jsonResponse({ error: 'supervisor_seat_limit_reached', details: { supervisors: counts.supervisors, limit: limits.supervisor_seats_limit } }, 409)
    }

    const siteUrl = (Deno.env.get('SITE_URL') || 'https://ecosign.app').replace(/\/$/, '')
    const redirectTo = `${siteUrl}/dashboard`
    const invite = await generateInviteLink(supabase, email, redirectTo)

    const { error: memberErr } = await supabase
      .from('workspace_members')
      .upsert({
        workspace_id: workspaceId,
        user_id: invite.userId,
        role,
        status: 'invited',
        member_email: email,
        invited_at: new Date().toISOString(),
        invited_by: authUser.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id,user_id' })
    if (memberErr) throw new Error(`failed_upsert_member:${memberErr.message}`)

    await ensureProfileActiveWorkspace(supabase, invite.userId, workspaceId)

    await updateUserMetadataWorkspace(supabase, invite.userId, {
      workspace_id: workspaceId,
      workspace_role: role,
    })

    const emailPayload = await buildWorkspaceMemberInviteEmail({
      recipientEmail: email,
      workspaceName: String(ws.name ?? 'Equipo EcoSign'),
      role,
      actionLink: invite.actionLink,
      siteUrl,
    })

    const { error: queueErr } = await supabase
      .from('system_emails')
      .insert({
        recipient_email: email,
        email_type: 'workspace_member_invite',
        subject: emailPayload.subject,
        body_html: emailPayload.html,
        metadata: {
          workspace_id: workspaceId,
          invited_user_id: invite.userId,
          role,
          action_link: invite.actionLink,
          invited_by: authUser.id,
        },
        delivery_status: 'pending',
        attempts: 0,
      })
    if (queueErr) throw new Error(`failed_queue_email:${queueErr.message}`)

    return jsonResponse({
      ok: true,
      workspace_id: workspaceId,
      role,
      invited_user_id: invite.userId,
      recipient_email: email,
      action_link: invite.actionLink,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse({ error: 'internal_error', message }, 500)
  }
})
