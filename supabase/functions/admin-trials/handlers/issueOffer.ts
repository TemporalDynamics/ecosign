// Handler: issue_offer
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import {
  requireAdminOrInternal,
  normalizeEmail,
  normalizeText,
  getPlanIdByKey,
  ensureWorkspaceForOwner,
  getUserIdByEmailBestEffort,
  generateInviteLink,
  updateUserMetadataWorkspace,
  ensureProfileActiveWorkspace,
  addMonthsUtc,
} from '../helpers.ts'
import { buildTrialOfferInviteEmail } from '../../_shared/email.ts'

export async function handleIssueOffer(req: Request, corsHeaders: Record<string, string>) {
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
    const nextPlanKey = normalizeText(body.next_plan_key || body.nextPlanKey || 'pro')
    const discountPercent = typeof body.discount_percent === 'number' ? body.discount_percent : 50
    const discountMonths = typeof body.discount_months === 'number' ? body.discount_months : 3

    if (!email) {
      return { ok: false, error: 'missing_email', status: 400 }
    }

    // Find or create user
    let userId = await getUserIdByEmailBestEffort(supabase, email)
    if (!userId) {
      return { ok: false, error: 'user_not_found', status: 404 }
    }

    // Ensure workspace exists
    const workspaceResult = await ensureWorkspaceForOwner(supabase, userId)
    const workspaceId = workspaceResult.id

    // Check for existing active offer
    const { data: existingOffer } = await supabase
      .from('workspace_trial_offers')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .maybeSingle()

    if (existingOffer?.id) {
      return { ok: false, error: 'offer_already_exists', status: 409 }
    }

    // Create offer
    const { error: offerErr } = await supabase
      .from('workspace_trial_offers')
      .insert({
        workspace_id: workspaceId,
        next_plan_key: nextPlanKey,
        discount_percent: discountPercent,
        discount_months: discountMonths,
        status: 'active',
        expires_at: addMonthsUtc(new Date(), 1).toISOString(),
      })

    if (offerErr) {
      throw new Error(`failed_to_create_offer:${offerErr.message}`)
    }

    // Generate invite link
    const siteUrl = (Deno.env.get('SITE_URL') || 'https://ecosign.app').replace(/\/$/, '')
    const redirectTo = `${siteUrl}/dashboard`
    const invite = await generateInviteLink(supabase, email, redirectTo)

    // Send email
    const emailPayload = await buildTrialOfferInviteEmail({
      recipientEmail: email,
      workspaceName: 'EcoSign',
      nextPlanKey,
      discountPercent,
      discountMonths,
      actionLink: invite.actionLink,
      siteUrl,
    })

    await supabase
      .from('system_emails')
      .insert({
        recipient_email: email,
        email_type: 'trial_offer',
        subject: emailPayload.subject,
        body_html: emailPayload.html,
        metadata: {
          workspace_id: workspaceId,
          offer_next_plan_key: nextPlanKey,
          discount_percent: discountPercent,
          discount_months: discountMonths,
        },
        delivery_status: 'pending',
        attempts: 0,
      })

    return {
      ok: true,
      status: 200,
      data: {
        user_id: userId,
        workspace_id: workspaceId,
        offer: {
          next_plan_key: nextPlanKey,
          discount_percent: discountPercent,
          discount_months: discountMonths,
        },
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message, status: 500 }
  }
}
