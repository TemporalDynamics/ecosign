// supabase/functions/generate-link/index.ts
// Edge function to generate secure NDA links for document sharing

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'
import { sendEmail, buildSignerInvitationEmail } from '../_shared/email.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateLinkRequest {
  document_id: string
  recipient_email: string
  expires_in_hours?: number
  require_nda?: boolean
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role for DB operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabaseAuth = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse request body
    const body: GenerateLinkRequest = await req.json()
    const {
      document_id,
      recipient_email,
      expires_in_hours = 72, // Default 3 days
      require_nda = true
    } = body

    if (!document_id || !recipient_email) {
      throw new Error('Missing required fields: document_id and recipient_email')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(recipient_email)) {
      throw new Error('Invalid email format')
    }

    // Verify document belongs to user
    const { data: doc, error: docError } = await supabase
      .from('user_documents')
      .select('id, user_id, document_name')
      .eq('id', document_id)
      .single()

    if (docError || !doc) {
      throw new Error('Document not found')
    }

    if (doc.user_id !== user.id) {
      throw new Error('Not authorized to share this document')
    }

    // Generate secure random token (32 bytes = 64 hex chars)
    const tokenBytes = crypto.getRandomValues(new Uint8Array(32))
    const token = Array.from(tokenBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Hash the token for storage (we never store plaintext)
    const tokenEncoder = new TextEncoder()
    const tokenData = tokenEncoder.encode(token)
    const hashBuffer = await crypto.subtle.digest('SHA-256', tokenData)
    const tokenHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Generate recipient ID (16 bytes = 32 hex chars)
    const recipientIdBytes = crypto.getRandomValues(new Uint8Array(16))
    const recipientIdHex = Array.from(recipientIdBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Calculate expiration
    const expiresAt = expires_in_hours
      ? new Date(Date.now() + expires_in_hours * 60 * 60 * 1000).toISOString()
      : null

    // Create recipient record
    const { data: recipient, error: recipientError } = await supabase
      .from('recipients')
      .insert({
        document_id,
        email: recipient_email,
        recipient_id: recipientIdHex
      })
      .select()
      .single()

    if (recipientError) {
      console.error('Error creating recipient:', recipientError)
      throw new Error('Failed to create recipient record')
    }

    // Create link record with direct recipient reference
    const { data: link, error: linkError } = await supabase
      .from('links')
      .insert({
        document_id,
        recipient_id: recipient.id, // Direct link to recipient for correct attribution
        token_hash: tokenHash,
        expires_at: expiresAt,
        require_nda
      })
      .select()
      .single()

    if (linkError) {
      console.error('Error creating link:', linkError)
      // Cleanup recipient if link creation fails
      await supabase.from('recipients').delete().eq('id', recipient.id)
      throw new Error('Failed to create link record')
    }

    // Build the access URL (token is in the URL, not stored)
    const appUrl = Deno.env.get('APP_URL') || 'https://app.verifysign.pro'
    const accessUrl = `${appUrl}/nda/${token}`

    // Log the link creation event
    console.log(`Link created: ${link.id} for document ${document_id} to ${recipient_email}`)

    // --- Send Email Invitation ---
    let emailSent = false;
    try {
      const senderName = user.user_metadata?.full_name || user.email; // Get sender name from user metadata or email
      const emailPayload = buildSignerInvitationEmail({
        signerEmail: recipient_email,
        documentName: doc.document_name,
        signLink: accessUrl,
        expiresAt: expiresAt || '', // Ensure expiresAt is a string
        senderName: senderName
      });
      const emailResult = await sendEmail(emailPayload);
      emailSent = emailResult.success;
      if (!emailSent) {
        console.error('Failed to send email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('Error sending email:', emailError);
    }
    // --- End Send Email Invitation ---

    // Return the plaintext token URL (only time it's available)
    return new Response(
      JSON.stringify({
        success: true,
        link_id: link.id,
        recipient_id: recipient.id,
        access_url: accessUrl,
        expires_at: expiresAt,
        require_nda,
        document_title: doc.document_name,
        recipient_email,
        email_sent: emailSent // Indicate if email was sent
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error in generate-link:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message === 'Unauthorized' ? 401 : 400
      }
    )
  }
})
