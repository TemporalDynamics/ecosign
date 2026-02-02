/**
 * accept-share-nda Edge Function
 * 
 * Registra la aceptación de NDA para document_shares (flujo E2E)
 * 
 * BLOQUE 2 — FASE 2.1: Implementación de R4
 * - Genera hash del NDA
 * - Registra IP + timestamp
 * - Almacena metadata probatoria
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'
import { withRateLimit } from '../_shared/ratelimit.ts'
import { appendEvent, getDocumentEntityId, hashIP, getBrowserFamily } from '../_shared/eventHelper.ts'
import { parseJsonBody } from '../_shared/validation.ts'
import { AcceptShareNdaSchema } from '../_shared/schemas.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

async function generateNdaHash(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

serve(withRateLimit('accept', async (req) => {
  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined)

  if (req.method === 'OPTIONS') {
    if (!isAllowed) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders })
    }
    return new Response('ok', { headers: corsHeaders })
  }

  if (!isAllowed) {
    return new Response(
      JSON.stringify({ success: false, error: 'Origin not allowed' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const parsed = await parseJsonBody(req, AcceptShareNdaSchema)
    if (!parsed.ok) {
      return new Response(
        JSON.stringify({ success: false, error: parsed.error, details: parsed.details }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const {
      share_id,
      signer_email,
      signer_name,
      browser_fingerprint
    } = parsed.data

    // Get share data
    const { data: share, error: shareError } = await supabase
      .from('document_shares')
      .select('id, document_id, recipient_email, nda_text, nda_enabled, nda_accepted_at')
      .eq('id', share_id)
      .single()

    if (shareError || !share) {
      throw new Error('Share not found')
    }

    // Validate email matches
    const emailMatches = share.recipient_email.toLowerCase() === signer_email.toLowerCase()
    const legacyDecision = Boolean(emailMatches && share.nda_enabled && !share.nda_accepted_at)
    const canonicalDecision = Boolean(emailMatches && share.nda_enabled && !share.nda_accepted_at)

    try {
      await supabase.from('shadow_decision_logs').insert({
        decision_code: 'D19_ACCEPT_SHARE_NDA',
        workflow_id: null,
        signer_id: null,
        legacy_decision: legacyDecision,
        canonical_decision: canonicalDecision,
        context: {
          operation: 'accept-share-nda',
          share_id,
          nda_enabled: share.nda_enabled,
          nda_accepted_at: share.nda_accepted_at,
          email_matches: emailMatches,
          phase: 'PASO_2_SHADOW_MODE_D19'
        }
      })
    } catch (logError) {
      console.warn('[D19 SHADOW] Log insert failed', logError)
    }

    if (!emailMatches) {
      throw new Error('Email mismatch')
    }

    // Check if NDA is required
    if (!share.nda_enabled) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'NDA not required for this share'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Check if already accepted
    if (share.nda_accepted_at) {
      return new Response(
        JSON.stringify({
          success: true,
          already_accepted: true,
          accepted_at: share.nda_accepted_at,
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
    const country = req.headers.get('cf-ipcountry') || // Cloudflare
                    req.headers.get('x-vercel-ip-country') || // Vercel
                    null
    const sessionId = crypto.randomUUID()
    const timestamp = new Date().toISOString()

    // Generate NDA hash (R4: evidencia probatoria de QUÉ se aceptó)
    const ndaContent = JSON.stringify({
      share_id,
      signer_name: signer_name || signer_email.split('@')[0],
      signer_email,
      nda_text: share.nda_text || '',
      timestamp,
      ip_address: ipAddress,
      user_agent: userAgent
    })

    const ndaHash = await generateNdaHash(ndaContent)

    // Prepare acceptance metadata
    const acceptanceMetadata = {
      eco_nda_hash: ndaHash,
      signer_name: signer_name || signer_email.split('@')[0],
      signer_email,
      acceptance_timestamp: timestamp,
      ip_address: ipAddress,
      user_agent: userAgent,
      browser_fingerprint: browser_fingerprint || null,
      consent_text: 'I acknowledge that I have read and agree to be bound by the terms of this Non-Disclosure Agreement.',
      nda_version: '1.0'
    }

    // Update share with NDA acceptance
    const { error: updateError } = await supabase
      .from('document_shares')
      .update({
        nda_accepted_at: timestamp,
        nda_acceptance_metadata: acceptanceMetadata
      })
      .eq('id', share_id)

    if (updateError) {
      console.error('Error recording NDA acceptance:', updateError)
      throw new Error('Failed to record NDA acceptance')
    }

    console.log(`NDA accepted for share ${share_id} by ${signer_email}`)

    // === PROBATORY EVENT: nda.accepted ===
    // Register NDA acceptance in canonical events ledger
    const documentEntityId = await getDocumentEntityId(supabase, share.document_id);
    if (documentEntityId) {
      const ipHash = ipAddress ? await hashIP(ipAddress) : null;
      const browserFamily = getBrowserFamily(userAgent);

      const eventResult = await appendEvent(
        supabase,
        documentEntityId,
        {
          kind: 'nda.accepted',
          at: timestamp,
          nda: {
            share_id: share_id,
            recipient_email: signer_email,
            nda_hash: ndaHash,
            acceptance_method: 'checkbox'
          },
          context: {
            ip_hash: ipHash,
            geo: country,
            browser: browserFamily,
            session_id: sessionId
          }
        },
        'accept-share-nda'
      );

      if (!eventResult.success) {
        console.error('Failed to append nda.accepted event:', eventResult.error);
        // Don't fail the request, NDA was accepted successfully
      }
    } else {
      console.warn(`Could not get document_entity_id for document ${share.document_id}, nda.accepted event not recorded`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        acceptance_id: share_id,
        accepted_at: timestamp,
        nda_hash: ndaHash,
        message: 'NDA accepted successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error in accept-share-nda:', error)
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
}))
