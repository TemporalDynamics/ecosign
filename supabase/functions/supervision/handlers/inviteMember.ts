// Handler: invite_member
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import {
  resolveAuthUser,
  resolveSupervisorMembership,
  getPlanEffectiveLimits,
  countReserved,
  generateInviteLink,
  ensureProfileActiveWorkspace,
  randomWrapSaltHex,
} from '../helpers.ts'
import { buildWorkspaceMemberInviteEmail, normalizeEmail } from '../../_shared/email.ts'

export async function handleInviteMember(req: Request, corsHeaders: Record<string, string>) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const authUser = await resolveAuthUser(supabase, req.headers.get('Authorization'))
  if (!authUser?.id) {
    return { ok: false, error: 'unauthorized', status: 401 }
  }

  const body = await req.json().catch(() => ({}))
  const workspaceId = typeof body?.workspace_id === 'string' ? body.workspace_id : ''
  const recipientEmail = normalizeEmail(body?.email)
  const role = String(body?.role ?? '') as 'agent' | 'supervisor_admin'

  if (!workspaceId) {
    return { ok: false, error: 'missing_workspace_id', status: 400 }
  }
  if (!recipientEmail) {
    return { ok: false, error: 'missing_email', status: 400 }
  }
  if (!['agent', 'supervisor_admin'].includes(role)) {
    return { ok: false, error: 'invalid_role', status: 400 }
  }

  const requesterRole = await resolveSupervisorMembership(supabase, authUser.id, workspaceId)
  if (!requesterRole) {
    return { ok: false, error: 'not_supervisor', status: 403 }
  }
  if (requesterRole !== 'owner_supervisor' && role !== 'agent') {
    return { ok: false, error: 'only_owner_can_invite_supervisors', status: 403 }
  }

  const { data: ws } = await supabase
    .from('workspaces')
    .select('id,name')
    .eq('id', workspaceId)
    .maybeSingle()
  if (!ws?.id) {
    return { ok: false, error: 'workspace_not_found', status: 404 }
  }

  const limits = await getPlanEffectiveLimits(supabase, workspaceId)
  const reserved = await countReserved(supabase, workspaceId)

  if (role === 'agent' && limits.agent_seats_limit !== null && reserved.agents >= Number(limits.agent_seats_limit)) {
    return { ok: false, error: 'agent_seat_limit_reached', status: 409 }
  }
  if (role === 'supervisor_admin' && limits.supervisor_seats_limit !== null && reserved.supervisors >= Number(limits.supervisor_seats_limit)) {
    return { ok: false, error: 'supervisor_seat_limit_reached', status: 409 }
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
    }, { onConflict: 'user_id' })
  if (upsertErr) {
    throw new Error(`member_upsert_failed:${upsertErr.message}`)
  }

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
  if (queueErr) {
    throw new Error(`queue_email_failed:${queueErr.message}`)
  }

  return {
    ok: true,
    status: 200,
    data: { invited_user_id: invite.userId },
  }
}
