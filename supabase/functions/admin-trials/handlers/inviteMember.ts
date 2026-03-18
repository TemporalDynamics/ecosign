// Handler: invite_member
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import {
  requireAdminOrInternal,
  normalizeEmail,
  getPlanEffectiveLimits,
  countActiveMembers,
  generateInviteLink,
  ensureProfileActiveWorkspace,
  updateUserMetadataWorkspace,
} from '../helpers.ts'
import { buildWorkspaceMemberInviteEmail } from '../../_shared/email.ts'

export async function handleInviteMember(req: Request, corsHeaders: Record<string, string>) {
  const auth = await requireAdminOrInternal(req, 'admin-trials')
  if (!auth.ok) {
    return { ok: false, error: auth.reason, status: auth.status }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const body = await req.json().catch(() => ({}))
    const workspaceId = typeof body?.workspace_id === 'string' ? body.workspace_id : ''
    const email = normalizeEmail(body?.email)
    const role = String(body?.role ?? '') as 'agent' | 'supervisor_admin'

    if (!workspaceId) {
      return { ok: false, error: 'missing_workspace_id', status: 400 }
    }
    if (!email) {
      return { ok: false, error: 'missing_email', status: 400 }
    }
    if (!['agent', 'supervisor_admin'].includes(role)) {
      return { ok: false, error: 'invalid_role', status: 400 }
    }

    // Verify workspace exists
    const { data: ws, error: wsErr } = await supabase
      .from('workspaces')
      .select('id,name,owner_id')
      .eq('id', workspaceId)
      .maybeSingle()
    if (wsErr || !ws?.id) {
      return { ok: false, error: 'workspace_not_found', status: 404 }
    }

    // Check limits
    const limits = await getPlanEffectiveLimits(supabase, workspaceId)
    const reserved = await countActiveMembers(supabase, workspaceId)

    if (role === 'agent' && limits.agent_seats_limit !== null && reserved.agents >= Number(limits.agent_seats_limit)) {
      return { ok: false, error: 'agent_seat_limit_reached', status: 409 }
    }
    if (role === 'supervisor_admin' && limits.supervisor_seats_limit !== null && reserved.supervisors >= Number(limits.supervisor_seats_limit)) {
      return { ok: false, error: 'supervisor_seat_limit_reached', status: 409 }
    }

    // Generate invite link
    const siteUrl = (Deno.env.get('SITE_URL') || 'https://ecosign.app').replace(/\/$/, '')
    const redirectTo = `${siteUrl}/dashboard`
    const invite = await generateInviteLink(supabase, email, redirectTo)

    // Create workspace member record
    const nowIso = new Date().toISOString()
    const { error: upsertErr } = await supabase
      .from('workspace_members')
      .upsert({
        workspace_id: workspaceId,
        user_id: invite.userId,
        role,
        status: 'invited',
        member_email: email,
        invited_at: nowIso,
        invited_by: (auth as any).userId || 'admin',
        updated_at: nowIso,
      }, { onConflict: 'workspace_id,user_id' })
    if (upsertErr) {
      throw new Error(`member_upsert_failed:${upsertErr.message}`)
    }

    await ensureProfileActiveWorkspace(supabase, invite.userId, workspaceId)
    await updateUserMetadataWorkspace(supabase, invite.userId, workspaceId)

    // Queue email
    const emailPayload = await buildWorkspaceMemberInviteEmail({
      recipientEmail: email,
      workspaceName: String(ws.name ?? 'Equipo EcoSign'),
      role,
      actionLink: invite.actionLink,
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
          invited_user_id: invite.userId,
          role,
          action_link: invite.actionLink,
        },
        delivery_status: 'pending',
        attempts: 0,
      })

    return {
      ok: true,
      status: 200,
      data: { invited_user_id: invite.userId },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message, status: 500 }
  }
}
