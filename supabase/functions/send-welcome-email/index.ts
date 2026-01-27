import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { buildFounderWelcomeEmail } from '../_shared/email.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': (Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SITE_URL') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: 'Missing Supabase configuration' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get userId from request body (called by database trigger)
    const { userId } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user data
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId)

    if (userError || !user || !user.email) {
      console.error('Error fetching user:', userError)
      return new Response(
        JSON.stringify({ error: 'User not found or has no email' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if welcome email already sent (via metadata or separate table)
    const { data: existingNotification } = await supabase
      .from('system_emails')
      .select('id')
      .eq('recipient_email', user.email)
      .eq('email_type', 'welcome_founder')
      .maybeSingle()

    if (existingNotification) {
      console.log(`Welcome email already sent to ${user.email}`)
      return new Response(
        JSON.stringify({ success: true, message: 'Welcome email already sent' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract user name from metadata
    const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0]

    // Get site URL for links
    const siteUrl = Deno.env.get('SITE_URL') || 'https://ecosign.app'
    const dashboardUrl = `${siteUrl}/dashboard`
    const docsUrl = `${siteUrl}/docs`
    const supportUrl = `${siteUrl}/support`

    // Badge number: crear si no existe
    const { data: existingBadge, error: badgeErr } = await supabase
      .from('founder_badges')
      .select('badge_number')
      .eq('user_id', userId)
      .maybeSingle()

    let badgeNumber = existingBadge?.badge_number ?? null

    if (!badgeNumber) {
      const { data: newBadge, error: insertBadgeErr } = await supabase
        .from('founder_badges')
        .insert({ user_id: userId })
        .select('badge_number')
        .maybeSingle()

      if (insertBadgeErr) {
        console.error('Error creating founder badge:', insertBadgeErr)
      } else {
        badgeNumber = newBadge?.badge_number ?? null
      }
    }

    // Build email
    const emailPayload = await buildFounderWelcomeEmail({
      userEmail: user.email,
      userName,
      founderNumber: badgeNumber ?? user.user_metadata?.founder_number ?? user.user_metadata?.founderNumber ?? null,
      dashboardUrl,
      docsUrl,
      supportUrl
    })

    // Queue email into system_emails for processing
    const { error: insertError } = await supabase
      .from('system_emails')
      .insert({
        recipient_email: user.email,
        email_type: 'welcome_founder',
        subject: emailPayload.subject,
        body_html: emailPayload.html,
        metadata: {
          user_id: userId,
          user_name: userName,
          founder_number: badgeNumber
        },
        delivery_status: 'pending',
        attempts: 0
      })

    if (insertError) {
      console.error('Error inserting system_email:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to queue welcome email', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Welcome email queued for ${user.email}`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
