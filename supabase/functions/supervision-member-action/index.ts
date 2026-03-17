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

async function generateInviteLink(supabase: any, email: string, redirectTo: string) {
  const admin = supabase.auth.admin as any
  const { data, error } = await admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo },
  })
  if (error) throw new Error(`failed_generate_invite_link:${error.message}`)
  const actionLink = data?.properties?.action_link ?? data?.action_link ?? null
  if (!actionLink) throw new Error('missing_action_link')
  return { actionLink: String(actionLink) }
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
    const memberId = typeof body?.member_id === 'string' ? body.member_id : ''
    const action = String(body?.action ?? '')

    if (!workspaceId) return jsonResponse({ ok: false, error: 'missing_workspace_id' }, 400, corsHeaders)
    if (!memberId) return jsonResponse({ ok: false, error: 'missing_member_id' }, 400, corsHeaders)

    const requesterRole = await resolveSupervisorMembership(supabase, authUser.id, workspaceId)
    if (!requesterRole) return jsonResponse({ ok: false, error: 'not_supervisor' }, 403, corsHeaders)

    const { data: target, error: targetErr } = await supabase
      .from('workspace_members')
      .select('id,user_id,member_email,role,status')
      .eq('id', memberId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()
    if (targetErr || !target?.id) return jsonResponse({ ok: false, error: 'member_not_found' }, 404, corsHeaders)

    const targetRole = String(target.role)
    const targetStatus = String(target.status)

    // Supervisor admin cannot manage owner supervisor or supervisor role changes.
    if (requesterRole !== 'owner_supervisor') {
      if (targetRole !== 'agent') return jsonResponse({ ok: false, error: 'insufficient_permissions' }, 403, corsHeaders)
      if (action === 'change_role') return jsonResponse({ ok: false, error: 'insufficient_permissions' }, 403, corsHeaders)
    }

    const nowIso = new Date().toISOString()

    if (action === 'suspend') {
      const { error } = await supabase
        .from('workspace_members')
        .update({ status: 'suspended', updated_at: nowIso })
        .eq('id', memberId)
      if (error) throw new Error(`update_failed:${error.message}`)
      return jsonResponse({ ok: true }, 200, corsHeaders)
    }

    if (action === 'activate') {
      const { error } = await supabase
        .from('workspace_members')
        .update({ status: 'active', updated_at: nowIso })
        .eq('id', memberId)
      if (error) throw new Error(`update_failed:${error.message}`)
      return jsonResponse({ ok: true }, 200, corsHeaders)
    }

    if (action === 'remove_invite') {
      if (targetStatus !== 'invited') return jsonResponse({ ok: false, error: 'not_invited' }, 409, corsHeaders)
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberId)
      if (error) throw new Error(`delete_failed:${error.message}`)
      return jsonResponse({ ok: true }, 200, corsHeaders)
    }

    if (action === 'change_role') {
      const nextRole = String(body?.role ?? '') as 'agent' | 'supervisor_admin'
      if (!['agent', 'supervisor_admin'].includes(nextRole)) return jsonResponse({ ok: false, error: 'invalid_role' }, 400, corsHeaders)
      const { error } = await supabase
        .from('workspace_members')
        .update({ role: nextRole, updated_at: nowIso })
        .eq('id', memberId)
      if (error) throw new Error(`update_failed:${error.message}`)
      return jsonResponse({ ok: true }, 200, corsHeaders)
    }

    if (action === 'resend_invite') {
      if (targetStatus !== 'invited') return jsonResponse({ ok: false, error: 'not_invited' }, 409, corsHeaders)
      const email = normalizeEmail(target.member_email)
      if (!email) return jsonResponse({ ok: false, error: 'missing_member_email' }, 500, corsHeaders)

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

      return jsonResponse({ ok: true }, 200, corsHeaders)
    }

    return jsonResponse({ ok: false, error: 'unknown_action' }, 400, corsHeaders)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse({ ok: false, error: 'internal_error', message }, 500, corsHeaders)
  }
})

