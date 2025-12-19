import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'
import { buildFounderWelcomeEmail, sendEmail } from '../_shared/email.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
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
      .from('workflow_notifications')
      .select('id')
      .eq('recipient_email', user.email)
      .eq('notification_type', 'welcome_founder')
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

    // Build email
    const emailPayload = buildFounderWelcomeEmail({
      userEmail: user.email,
      userName,
      dashboardUrl,
      docsUrl,
      supportUrl
    })

    // Insert notification into workflow_notifications for tracking
    const { error: insertError } = await supabase
      .from('workflow_notifications')
      .insert({
        recipient_email: user.email,
        notification_type: 'welcome_founder',
        subject: emailPayload.subject,
        body_html: emailPayload.html,
        delivery_status: 'pending',
        metadata: {
          userId: user.id,
          sentAt: new Date().toISOString()
        }
      })

    if (insertError) {
      console.error('Error inserting notification:', insertError)
      // Don't fail - continue to send email directly
    }

    // Send email via Resend
    const result = await sendEmail({
      to: emailPayload.to,
      subject: emailPayload.subject,
      html: emailPayload.html
    })

    if (!result.success) {
      console.error('Error sending welcome email:', result.error)
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: result.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ Welcome email sent to ${user.email}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Welcome email sent to ${user.email}`,
        emailId: result.id
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
