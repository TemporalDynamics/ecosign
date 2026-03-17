import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { getCorsHeaders } from '../_shared/cors.ts'
import { buildWorkspaceMemberInviteEmail, normalizeEmail } from '../_shared/email.ts'

const jsonResponse = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })

async function resolveAuthUser(supabase: any, authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}

async function resolveSupervisorMembership(supabase: any, userId: string, workspaceId: string) {
  const { data } = await supabase
    .from('workspace_members')
    .select('role,status')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .in('role', ['owner_supervisor', 'supervisor_admin'])
    .maybeSingle()
  if (!data?.role) return null
  return String(data.role) as 'owner_supervisor' | 'supervisor_admin'
}

async function getPlanEffectiveLimits(supabase: any, workspaceId: string) {
  const { data } = await supabase.rpc('compute_workspace_effective_limits', { p_workspace_id: workspaceId })
  const row = Array.isArray(data) && data.length > 0 ? data[0] as any : null
  return {
    agent_seats_limit: row?.agent_seats_limit ?? row?.seats_limit ?? null,
    supervisor_seats_limit: row?.supervisor_seats_limit ?? null,
  }
}

async function countReserved(supabase: any, workspaceId: string) {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('role,status')
    .eq('workspace_id', workspaceId)
    .in('status', ['active', 'invited'])
  if (error) throw new Error(`members_query_failed:${error.message}`)
  let agents = 0
  let supervisors = 0
  for (const row of data ?? []) {
    const role = String((row as any).role)
    if (role === 'agent') agents += 1
    if (role === 'owner_supervisor' || role === 'supervisor_admin') supervisors += 1
  }
  return { agents, supervisors }
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
    // best-effort; handle_new_user trigger should create the profile anyway
    console.warn('ensureProfileActiveWorkspace failed', { userId, message: error.message })
  }
}

serve(async (req) => {
  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined)

  if (req.method === 'OPTIONS') {
    if (!isAllowed) return new Response('Forbidden', { status: 403, headers: corsHeaders })
    return new Response('ok', { status: 200, headers: corsHeaders })
  }
  if (!isAllowed) return jsonResponse({ ok: false, error: 'origin_not_allowed' }, 403, corsHeaders)
  if (req.method !== 'POST') return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405, corsHeaders)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ ok: false, error: 'missing_supabase_env' }, 500, corsHeaders)

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const authUser = await resolveAuthUser(supabase, req.headers.get('Authorization'))
    if (!authUser?.id) return jsonResponse({ ok: false, error: 'unauthorized' }, 401, corsHeaders)

    const body = await req.json().catch(() => ({}))
    const workspaceId = typeof body?.workspace_id === 'string' ? body.workspace_id : ''
    const recipientEmail = normalizeEmail(body?.email)
    const role = String(body?.role ?? '') as 'agent' | 'supervisor_admin'

    if (!workspaceId) return jsonResponse({ ok: false, error: 'missing_workspace_id' }, 400, corsHeaders)
    if (!recipientEmail) return jsonResponse({ ok: false, error: 'missing_email' }, 400, corsHeaders)
    if (!['agent', 'supervisor_admin'].includes(role)) return jsonResponse({ ok: false, error: 'invalid_role' }, 400, corsHeaders)

    const requesterRole = await resolveSupervisorMembership(supabase, authUser.id, workspaceId)
    if (!requesterRole) return jsonResponse({ ok: false, error: 'not_supervisor' }, 403, corsHeaders)
    if (requesterRole !== 'owner_supervisor' && role !== 'agent') {
      return jsonResponse({ ok: false, error: 'only_owner_can_invite_supervisors' }, 403, corsHeaders)
    }

    const { data: ws } = await supabase
      .from('workspaces')
      .select('id,name')
      .eq('id', workspaceId)
      .maybeSingle()
    if (!ws?.id) return jsonResponse({ ok: false, error: 'workspace_not_found' }, 404, corsHeaders)

    const limits = await getPlanEffectiveLimits(supabase, workspaceId)
    const reserved = await countReserved(supabase, workspaceId)

    if (role === 'agent' && limits.agent_seats_limit !== null && reserved.agents >= Number(limits.agent_seats_limit)) {
      return jsonResponse({ ok: false, error: 'agent_seat_limit_reached' }, 409, corsHeaders)
    }
    if (role === 'supervisor_admin' && limits.supervisor_seats_limit !== null && reserved.supervisors >= Number(limits.supervisor_seats_limit)) {
      return jsonResponse({ ok: false, error: 'supervisor_seat_limit_reached' }, 409, corsHeaders)
    }

    const siteUrl = (Deno.env.get('SITE_URL') || 'https://ecosign.app').replace(/\/$/, '')
    const redirectTo = `${siteUrl}/dashboard`
    const invite = await generateInviteLink(supabase, recipientEmail, redirectTo)

    const nowIso = new Date().toISOString()
    const { error: upsertErr } = await supabase
      .from('workspace_members')
      .upsert({
        workspace_id: workspaceId,
        user_id: invite.userId,
        role,
        status: 'invited',
        member_email: recipientEmail,
        invited_at: nowIso,
        invited_by: authUser.id,
        updated_at: nowIso,
      }, { onConflict: 'workspace_id,user_id' })
    if (upsertErr) throw new Error(`member_upsert_failed:${upsertErr.message}`)

    await ensureProfileActiveWorkspace(supabase, invite.userId, workspaceId)

    const emailPayload = await buildWorkspaceMemberInviteEmail({
      recipientEmail: recipientEmail,
      workspaceName: String(ws.name ?? 'Equipo EcoSign'),
      role,
      actionLink: invite.actionLink,
      siteUrl,
    })

    const { error: queueErr } = await supabase
      .from('system_emails')
      .insert({
        recipient_email: recipientEmail,
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
    if (queueErr) throw new Error(`queue_email_failed:${queueErr.message}`)

    return jsonResponse({ ok: true, invited_user_id: invite.userId }, 200, corsHeaders)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse({ ok: false, error: 'internal_error', message }, 500, corsHeaders)
  }
})
