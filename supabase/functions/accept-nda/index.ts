// supabase/functions/accept-nda/index.ts
// Edge function to record NDA acceptance with signature metadata

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'
import { withRateLimit } from '../_shared/ratelimit.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { parseJsonBody } from '../_shared/validation.ts'
import { AcceptNdaSchema } from '../_shared/schemas.ts'
import { appendEvent, getDocumentEntityId, hashIP, getBrowserFamily } from '../_shared/eventHelper.ts'

serve(withRateLimit('accept', async (req) => {
  const { headers: corsHeaders, isAllowed } = getCorsHeaders(req.headers.get('origin') || undefined)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (!isAllowed) {
    return new Response('CORS not allowed', { status: 403, headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const parsed = await parseJsonBody(req, AcceptNdaSchema)
    if (!parsed.ok) {
      return new Response(
        JSON.stringify({ success: false, error: parsed.error, details: parsed.details }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const body = parsed.data as any
    const {
      token,
      signer_name,
      signer_email,
      nda_version = '1.0',
      browser_fingerprint
    } = body

    // Hash token to lookup link
    const tokenEncoder = new TextEncoder()
    const tokenData = tokenEncoder.encode(token)
    const tokenHashBuffer = await crypto.subtle.digest('SHA-256', tokenData)
    const tokenHash = Array.from(new Uint8Array(tokenHashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    const { data: link, error: linkError } = await supabase
      .from('links')
      .select('id, recipient_id, nda_text')
      .eq('token_hash', tokenHash)
      .single()

    if (linkError || !link?.recipient_id) {
      throw new Error('Invalid or expired link')
    }

    // Verify recipient exists
    const { data: recipient, error: recipientError } = await supabase
      .from('recipients')
      .select('id, email, document_id')
      .eq('id', link.recipient_id)
      .single()

    if (recipientError || !recipient) {
      throw new Error('Recipient not found')
    }

    // Check if NDA already accepted
    const { data: existingNda } = await supabase
      .from('nda_acceptances')
      .select('id, accepted_at')
      .eq('recipient_id', recipient.id)
      .single()

    const legacyDecision = Boolean(
      token &&
      signer_name &&
      signer_email &&
      link?.recipient_id &&
      recipient &&
      !existingNda
    )

    const canonicalDecision = Boolean(
      token &&
      signer_name &&
      signer_email &&
      link &&
      link.recipient_id &&
      recipient &&
      !existingNda
    )

    try {
      await supabase.from('shadow_decision_logs').insert({
        decision_code: 'D16_ACCEPT_NDA',
        workflow_id: null,
        signer_id: null,
        legacy_decision: legacyDecision,
        canonical_decision: canonicalDecision,
        context: {
          operation: 'accept-nda',
          link_id: link?.id ?? null,
          recipient_id: recipient?.id ?? null,
          has_existing_acceptance: Boolean(existingNda),
          phase: 'PASO_2_SHADOW_MODE_D16'
        }
      })
    } catch (logError) {
      console.warn('[D16 SHADOW] Log insert failed', logError)
    }

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

    // Fetch NDA text for this link (specific link_id or fallback to latest)
    let ndaText: string | null = null

    ndaText = link.nda_text || null

    // Generate NDA hash (hash of the acceptance details + NDA text)
    const ndaContent = JSON.stringify({
      recipient_id: recipient.id,
      signer_name,
      signer_email,
      nda_version,
      nda_text: ndaText || null,
      timestamp: new Date().toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent
    })

    const encoder = new TextEncoder()
    const data = encoder.encode(ndaContent)
    const ndaHashBuffer = await crypto.subtle.digest('SHA-256', data)
    const ndaHash = Array.from(new Uint8Array(ndaHashBuffer))
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
      legal_text_hash: ndaHash,
      nda_text: ndaText || null
    }

    // Insert NDA acceptance record
    const { data: ndaAcceptance, error: ndaError } = await supabase
      .from('nda_acceptances')
      .insert({
        recipient_id: recipient.id,
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
        recipient_id: recipient.id,
        event_type: 'view', // NDA acceptance is treated as first view
        ip_address: ipAddress,
        user_agent: userAgent,
        session_id: `nda-${ndaAcceptance.id}`
      })

    console.log(`NDA accepted: ${ndaAcceptance.id} by ${signer_email}`)

    // === PROBATORY EVENT: nda.accepted ===
    // Register NDA acceptance in canonical events ledger (goes to .eco)
    try {
      const documentEntityId = await getDocumentEntityId(supabase, recipient.document_id)
      if (documentEntityId) {
        const ipHash = ipAddress ? await hashIP(ipAddress) : null
        const browserFamily = getBrowserFamily(userAgent)

        const eventResult = await appendEvent(
          supabase,
          documentEntityId,
          {
            kind: 'nda.accepted',
            at: ndaAcceptance.accepted_at || new Date().toISOString(),
            nda: {
              link_id: link.id,
              acceptance_id: ndaAcceptance.id,
              recipient_email: signer_email,
              signer_name,
              nda_hash: ndaHash,
              nda_version,
              acceptance_method: 'checkbox'
            },
            context: {
              ip_hash: ipHash,
              geo: null,
              browser: browserFamily,
              session_id: `nda-${ndaAcceptance.id}`
            }
          },
          'accept-nda'
        )

        if (!eventResult.success) {
          console.error('Failed to append nda.accepted event:', eventResult.error)
        }
      } else {
        console.warn(`Could not get document_entity_id for document ${recipient.document_id}, nda.accepted event not recorded`)
      }
    } catch (e) {
      console.warn('accept-nda probatory event recording failed', e)
    }

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
  } catch (error: any) {
    console.error('Error in accept-nda:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
}))
