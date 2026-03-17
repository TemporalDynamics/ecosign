// Handler: member_action
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import {
  resolveAuthUser,
  resolveSupervisorMembership,
  generateInviteLink,
} from '../helpers.ts'
import { buildWorkspaceMemberInviteEmail, normalizeEmail } from '../../_shared/email.ts'

export async function handleMemberAction(req: Request, corsHeaders: Record<string, string>) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const authUser = await resolveAuthUser(supabase, req.headers.get('Authorization'))
  if (!authUser?.id) {
    return { ok: false, error: 'unauthorized', status: 401 }
  }

  const body = await req.json().catch(() => ({}))
  const workspaceId = typeof body?.workspace_id === 'string' ? body.workspace_id : ''
  const memberId = typeof body?.member_id === 'string' ? body.member_id : ''
  const action = String(body?.action ?? '')

  if (!workspaceId) {
    return { ok: false, error: 'missing_workspace_id', status: 400 }
  }
  if (!memberId) {
    return { ok: false, error: 'missing_member_id', status: 400 }
  }

  const requesterRole = await resolveSupervisorMembership(supabase, authUser.id, workspaceId)
  if (!requesterRole) {
    return { ok: false, error: 'not_supervisor', status: 403 }
  }

  const { data: target, error: targetErr } = await supabase
    .from('workspace_members')
    .select('id,user_id,member_email,role,status')
    .eq('id', memberId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  if (targetErr || !target?.id) {
    return { ok: false, error: 'member_not_found', status: 404 }
  }

  const targetRole = String(target.role)
  const targetStatus = String(target.status)

  // Supervisor admin cannot manage owner supervisor or supervisor role changes.
  if (requesterRole !== 'owner_supervisor') {
    if (targetRole !== 'agent') {
      return { ok: false, error: 'insufficient_permissions', status: 403 }
    }
    if (action === 'change_role') {
      return { ok: false, error: 'insufficient_permissions', status: 403 }
    }
  }

  const nowIso = new Date().toISOString()

  if (action === 'suspend') {
    const { error } = await supabase
      .from('workspace_members')
      .update({ status: 'suspended', updated_at: nowIso })
      .eq('id', memberId)
    if (error) throw new Error(`update_failed:${error.message}`)
    return { ok: true, status: 200 }
  }

  if (action === 'activate') {
    const { error } = await supabase
      .from('workspace_members')
      .update({ status: 'active', updated_at: nowIso })
      .eq('id', memberId)
    if (error) throw new Error(`update_failed:${error.message}`)
    return { ok: true, status: 200 }
  }

  if (action === 'remove_invite') {
    if (targetStatus !== 'invited') {
      return { ok: false, error: 'not_invited', status: 409 }
    }
    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('id', memberId)
    if (error) throw new Error(`delete_failed:${error.message}`)
    return { ok: true, status: 200 }
  }

  if (action === 'change_role') {
    const nextRole = String(body?.role ?? '') as 'agent' | 'supervisor_admin'
    if (!['agent', 'supervisor_admin'].includes(nextRole)) {
      return { ok: false, error: 'invalid_role', status: 400 }
    }
    const { error } = await supabase
      .from('workspace_members')
      .update({ role: nextRole, updated_at: nowIso })
      .eq('id', memberId)
    if (error) throw new Error(`update_failed:${error.message}`)
    return { ok: true, status: 200 }
  }

  if (action === 'resend_invite') {
    if (targetStatus !== 'invited') {
      return { ok: false, error: 'not_invited', status: 409 }
    }
    const email = normalizeEmail(target.member_email)
    if (!email) {
      return { ok: false, error: 'missing_member_email', status: 500 }
    }

    const { data: ws } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', workspaceId)
      .maybeSingle()

    const siteUrl = (Deno.env.get('SITE_URL') || 'https://ecosign.app').replace(/\/$/, '')
    const redirectTo = `${siteUrl}/dashboard`
    const link = await generateInviteLink(supabase, email, redirectTo)

    const role = targetRole === 'supervisor_admin' ? 'supervisor_admin' : 'agent'
    const emailPayload = await buildWorkspaceMemberInviteEmail({
      recipientEmail: email,
      workspaceName: String(ws?.name ?? 'Equipo EcoSign'),
      role,
      actionLink: link.actionLink,
      siteUrl,
    })

    await supabase
      .from('system_emails')
      .insert({
        recipient_email: email,
        email_type: 'workspace_member_invite',
        subject: emailPayload.subject,
        body_html: emailPayload.html,
        metadata: {
          workspace_id: workspaceId,
          invited_user_id: String(target.user_id),
          role,
          action_link: link.actionLink,
          invited_by: authUser.id,
          resent: true,
        },
        delivery_status: 'pending',
        attempts: 0,
      })

    await supabase
      .from('workspace_members')
      .update({ invited_at: nowIso, invited_by: authUser.id, updated_at: nowIso })
      .eq('id', memberId)

    return { ok: true, status: 200 }
  }

  return { ok: false, error: 'unknown_action', status: 400 }
}
