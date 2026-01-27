// supabase/functions/verify-access/index.ts
// Edge function to verify NDA link tokens and log access events

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'
import { withRateLimit } from '../_shared/ratelimit.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { parseJsonBody } from '../_shared/validation.ts'
import { VerifyAccessSchema } from '../_shared/schemas.ts'
import { appendEvent, getDocumentEntityId, hashIP, getBrowserFamily } from '../_shared/eventHelper.ts'

// TODO(canon): support document_entity_id (see docs/EDGE_CANON_MIGRATION_PLAN.md)

interface AccessMetadata {
  ip_address?: string
  user_agent?: string
  country?: string
  session_id?: string
}

serve(withRateLimit('verify', async (req) => {
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

    // Parse and validate request body
    const parsed = await parseJsonBody(req, VerifyAccessSchema)
    if (!parsed.ok) {
      return new Response(
        JSON.stringify({ valid: false, error: parsed.error, details: parsed.details }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const { token, event_type = 'view' } = parsed.data

    // Hash the provided token to lookup in DB
    const tokenEncoder = new TextEncoder()
    const tokenData = tokenEncoder.encode(token)
    const hashBuffer = await crypto.subtle.digest('SHA-256', tokenData)
    const tokenHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Find the link by token hash (now includes recipient_id)
    const { data: link, error: linkError } = await supabase
      .from('links')
      .select(`
        id,
        document_id,
        recipient_id,
        expires_at,
        revoked_at,
        require_nda,
        nda_text,
        created_at
      `)
      .eq('token_hash', tokenHash)
      .single()

    if (linkError || !link) {
      console.log('Link not found for token hash:', tokenHash)
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Link not found or invalid'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      )
    }

    // Check if link is revoked
    if (link.revoked_at) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'This link has been revoked'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403
        }
      )
    }

    // Check if link is expired
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'This link has expired',
          expired_at: link.expires_at
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403
        }
      )
    }

    // Get document info
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, title, original_filename, eco_hash, status')
      .eq('id', link.document_id)
      .single()

    if (docError || !document) {
      throw new Error('Document not found')
    }

    if (document.status !== 'active') {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Document is no longer available'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403
        }
      )
    }

    // Get recipient info using direct link (fixed attribution bug)
    let recipient = null
    let recipientError = null

    // First try to get recipient from direct link reference (new links)
    if (link.recipient_id) {
      const { data: recipientData, error: recipientErr } = await supabase
        .from('recipients')
        .select('id, email, recipient_id')
        .eq('id', link.recipient_id)
        .single()

      recipient = recipientData
      recipientError = recipientErr
    }

    // Fallback for old links without recipient_id (backward compatibility)
    if (!recipient) {
      const { data: fallbackRecipient, error: fallbackError } = await supabase
        .from('recipients')
        .select('id, email, recipient_id')
        .eq('document_id', link.document_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      recipient = fallbackRecipient
      recipientError = fallbackError

      if (recipient) {
        console.warn(`Using fallback recipient lookup for link ${link.id} - consider running migration`)
      }
    }

    if (recipientError || !recipient) {
      throw new Error('Recipient not found')
    }

    // Extract access metadata from request headers
    const metadata: AccessMetadata = {
      ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                  req.headers.get('x-real-ip') ||
                  undefined,
      user_agent: req.headers.get('user-agent') || undefined,
      country: req.headers.get('cf-ipcountry') || // Cloudflare
               req.headers.get('x-vercel-ip-country') || // Vercel
               undefined,
      session_id: crypto.randomUUID()
    }

    // Log the access event (legacy table)
    const { error: eventError } = await supabase
      .from('access_events')
      .insert({
        recipient_id: recipient.id,
        event_type,
        ip_address: metadata.ip_address,
        user_agent: metadata.user_agent,
        country: metadata.country,
        session_id: metadata.session_id
      })

    if (eventError) {
      console.error('Error logging access event:', eventError)
      // Don't fail the request if logging fails
    } else {
      console.log(`Access logged: ${event_type} for document ${document.id}`)
    }

    const documentEntityId = await getDocumentEntityId(supabase, link.document_id);

    // === PROBATORY EVENT: share_opened ===
    // Register that someone opened this share link (goes to .eco)
    if (documentEntityId) {
      const ipHash = metadata.ip_address ? await hashIP(metadata.ip_address) : null;
      const browserFamily = getBrowserFamily(metadata.user_agent);

      const eventResult = await appendEvent(
        supabase,
        documentEntityId,
        {
          kind: 'share_opened',
          at: new Date().toISOString(),
          share: {
            link_id: link.id,
            recipient_email: recipient.email,
            via: 'link',
            event_type: event_type, // view, download, forward
          },
          context: {
            ip_hash: ipHash,
            geo: metadata.country || null,
            browser: browserFamily,
            session_id: metadata.session_id,
          }
        },
        'verify-access'
      );

      if (!eventResult.success) {
        console.error('Failed to append share_opened event:', eventResult.error);
        // Don't fail the request, but log it
      }
    } else {
      console.warn(`Could not get document_entity_id for document ${link.document_id}, share_opened event not recorded`);
    }

    // Check if NDA was already accepted
    const { data: ndaAcceptance, error: ndaError } = await supabase
      .from('nda_acceptances')
      .select('id, accepted_at')
      .eq('recipient_id', recipient.id)
      .order('accepted_at', { ascending: false })
      .limit(1)
      .single()

    const ndaAccepted = !ndaError && !!ndaAcceptance
    const allowAccess = !link.require_nda || ndaAccepted

    let pdfSignedUrl: string | null = null
    let ecoSignedUrl: string | null = null

    if (allowAccess) {
      const { data: userDoc, error: userDocError } = await supabase
        .from('user_documents')
        .select('pdf_storage_path, eco_storage_path')
        .eq('id', link.document_id)
        .single()

      if (!userDocError && userDoc) {
        if (userDoc.pdf_storage_path) {
          const { data: pdfUrlData, error: pdfUrlError } = await supabase
            .storage
            .from('user-documents')
            .createSignedUrl(userDoc.pdf_storage_path, 3600)

          if (!pdfUrlError) {
            pdfSignedUrl = pdfUrlData?.signedUrl || null
          }
        }

        if (userDoc.eco_storage_path) {
          const { data: ecoUrlData, error: ecoUrlError } = await supabase
            .storage
            .from('user-documents')
            .createSignedUrl(userDoc.eco_storage_path, 3600)

          if (!ecoUrlError) {
            ecoSignedUrl = ecoUrlData?.signedUrl || null
          }
        }
      }
    }

    // Return link status and document metadata
    return new Response(
      JSON.stringify({
        valid: true,
        document_entity_id: documentEntityId,
        document: {
          title: document.title,
          original_filename: document.original_filename,
          eco_hash: document.eco_hash
        },
        recipient_email: recipient.email,
        require_nda: link.require_nda,
        nda_text: link.nda_text || null,
        nda_accepted: ndaAccepted,
        nda_accepted_at: ndaAcceptance?.accepted_at || null,
        expires_at: link.expires_at,
        session_id: metadata.session_id,
        pdf_signed_url: pdfSignedUrl,
        eco_signed_url: ecoSignedUrl
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error in verify-access:', error)
    return new Response(
      JSON.stringify({
        valid: false,
        error: error.message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
}))
