// Handler: grant_trial
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import {
  requireAdminOrInternal,
  normalizeEmail,
  normalizeText,
  getPlanIdByKey,
  ensureWorkspaceForOwner,
  getUserIdByEmailBestEffort,
  updateUserMetadataPlan,
  updateUserMetadataWorkspace,
  ensureProfileActiveWorkspace,
} from '../helpers.ts'
import { buildTrialOfferInviteEmail } from '../../_shared/email.ts'

export async function handleGrantTrial(req: Request, corsHeaders: Record<string, string>) {
  const auth = await requireAdminOrInternal(req, 'admin-trials')
  if (!auth.ok) {
    return { ok: false, error: auth.reason, status: auth.status }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const body = await req.json().catch(() => ({}))
    const email = normalizeEmail(body.email)
    const planKey = normalizeText(body.plan_key || body.planKey || 'trial')
    const trialDays = typeof body.trial_days === 'number' ? body.trial_days : 30

    if (!email) {
      return { ok: false, error: 'missing_email', status: 400 }
    }

    // Find or create user
    let userId = await getUserIdByEmailBestEffort(supabase, email)
    let isNewUser = false

    if (!userId) {
      isNewUser = true
      const { data: newUser, error: createErr } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: { plan_key: planKey },
      })
      if (createErr || !newUser?.user?.id) {
        throw new Error(`failed_to_create_user:${createErr?.message ?? 'unknown'}`)
      }
      userId = newUser.user.id
    }

    // Ensure workspace exists
    const workspaceResult = await ensureWorkspaceForOwner(supabase, userId)
    const workspaceId = workspaceResult.id

    // Get plan ID
    const planId = await getPlanIdByKey(supabase, planKey)

    // Set trial plan
    const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()
    
    await supabase
      .from('workspace_plan')
      .insert({
        workspace_id: workspaceId,
        plan_id: planId,
        status: 'trialing',
        started_at: new Date().toISOString(),
        trial_ends_at: trialEndsAt,
      })

    // Update user metadata
    await updateUserMetadataPlan(supabase, userId, { plan_key: planKey })
    await updateUserMetadataWorkspace(supabase, userId, workspaceId)
    await ensureProfileActiveWorkspace(supabase, userId, workspaceId)

    // Generate invite link if new user
    let actionLink: string | null = null
    if (isNewUser) {
      const siteUrl = (Deno.env.get('SITE_URL') || 'https://ecosign.app').replace(/\/$/, '')
      const redirectTo = `${siteUrl}/dashboard`
      const invite = await generateInviteLink(supabase, email, redirectTo)
      actionLink = invite.actionLink
    }

    return {
      ok: true,
      status: 200,
      data: {
        user_id: userId,
        workspace_id: workspaceId,
        plan_key: planKey,
        trial_ends_at: trialEndsAt,
        is_new_user: isNewUser,
        invite_link: actionLink,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message, status: 500 }
  }
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
