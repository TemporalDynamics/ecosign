// supabase/functions/accept-nda/index.ts
// Edge function to record NDA acceptance with signature metadata

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AcceptNdaRequest {
  recipient_id: string
  signer_name: string
  signer_email: string
  nda_version?: string
  browser_fingerprint?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const body: AcceptNdaRequest = await req.json()
    const {
      recipient_id,
      signer_name,
      signer_email,
      nda_version = '1.0',
      browser_fingerprint
    } = body

    if (!recipient_id || !signer_name || !signer_email) {
      throw new Error('Missing required fields: recipient_id, signer_name, signer_email')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(signer_email)) {
      throw new Error('Invalid email format')
    }

    // Verify recipient exists
    const { data: recipient, error: recipientError } = await supabase
      .from('recipients')
      .select('id, email, document_id')
      .eq('id', recipient_id)
      .single()

    if (recipientError || !recipient) {
      throw new Error('Recipient not found')
    }

    // Check if NDA already accepted
    const { data: existingNda } = await supabase
      .from('nda_acceptances')
      .select('id, accepted_at')
      .eq('recipient_id', recipient_id)
      .single()

    if (existingNda) {
      return new Response(
        JSON.stringify({
          success: true,
          already_accepted: true,
          accepted_at: existingNda.accepted_at,
          message: 'NDA was already accepted'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Extract metadata from request
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                      req.headers.get('x-real-ip') ||
                      null
    const userAgent = req.headers.get('user-agent') || null

    // Generate NDA hash (hash of the acceptance details for non-repudiation)
    const ndaContent = JSON.stringify({
      recipient_id,
      signer_name,
      signer_email,
      nda_version,
      timestamp: new Date().toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent
    })

    const encoder = new TextEncoder()
    const data = encoder.encode(ndaContent)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const ndaHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Create signature data object (for legal audit trail)
    const signatureData = {
      signer_name,
      signer_email,
      nda_version,
      acceptance_timestamp: new Date().toISOString(),
      browser_fingerprint: browser_fingerprint || null,
      consent_text: 'I acknowledge that I have read and agree to be bound by the terms of this Non-Disclosure Agreement.',
      legal_text_hash: ndaHash
    }

    // Insert NDA acceptance record
    const { data: ndaAcceptance, error: ndaError } = await supabase
      .from('nda_acceptances')
      .insert({
        recipient_id,
        eco_nda_hash: ndaHash,
        ip_address: ipAddress,
        user_agent: userAgent,
        signature_data: signatureData
      })
      .select()
      .single()

    if (ndaError) {
      console.error('Error recording NDA acceptance:', ndaError)
      throw new Error('Failed to record NDA acceptance')
    }

    // Log the NDA acceptance as an access event
    await supabase
      .from('access_events')
      .insert({
        recipient_id,
        event_type: 'view', // NDA acceptance is treated as first view
        ip_address: ipAddress,
        user_agent: userAgent,
        session_id: `nda-${ndaAcceptance.id}`
      })

    console.log(`NDA accepted: ${ndaAcceptance.id} by ${signer_email}`)

    return new Response(
      JSON.stringify({
        success: true,
        acceptance_id: ndaAcceptance.id,
        accepted_at: ndaAcceptance.accepted_at,
        nda_hash: ndaHash,
        message: 'NDA accepted successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error in accept-nda:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
