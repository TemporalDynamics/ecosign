// supabase/functions/verify-access/index.ts
// Edge function to verify NDA link tokens and log access events

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'
import { withRateLimit } from '../_shared/ratelimit.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { parseJsonBody } from '../_shared/validation.ts'
import { VerifyAccessSchema } from '../_shared/schemas.ts'
import { appendEvent, hashIP, getBrowserFamily } from '../_shared/eventHelper.ts'

interface AccessMetadata {
  ip_address?: string
  user_agent?: string
  country?: string
  session_id?: string
}

type EventLike = { kind?: string; payload?: Record<string, unknown> };

function getLatestEcoStoragePath(events: unknown): string | null {
  if (!Array.isArray(events)) return null;
  for (let idx = events.length - 1; idx >= 0; idx -= 1) {
    const event = events[idx] as EventLike;
    if (event?.kind !== 'artifact.finalized') continue;
    const payload = event.payload;
    const ecoPath = payload?.eco_storage_path;
    if (typeof ecoPath === 'string' && ecoPath.trim().length > 0) {
      return ecoPath;
    }
  }
  return null;
}

async function createSignedUrlWithFallback(
  supabase: any,
  path: string,
  primaryBucket: string,
  fallbackBucket?: string,
): Promise<string | null> {
  const primary = await supabase.storage.from(primaryBucket).createSignedUrl(path, 3600);
  if (!primary.error && primary.data?.signedUrl) {
    return primary.data.signedUrl;
  }

  if (!fallbackBucket) {
    return null;
  }

  const fallback = await supabase.storage.from(fallbackBucket).createSignedUrl(path, 3600);
  if (!fallback.error && fallback.data?.signedUrl) {
    return fallback.data.signedUrl;
  }

  return null;
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
        document_entity_id,
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

    // Get document info (legacy projection), if available.
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, title, original_filename, eco_hash, status, document_entity_id')
      .eq('id', link.document_id)
      .maybeSingle()

    if (docError) {
      console.warn('verify-access documents lookup warning:', docError.message)
    }

    if (document && document.status !== 'active') {
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

    const documentEntityId = typeof (link as any).document_entity_id === 'string' && (link as any).document_entity_id.length > 0
      ? String((link as any).document_entity_id)
      : (typeof (document as any)?.document_entity_id === 'string' && (document as any).document_entity_id.length > 0
        ? String((document as any).document_entity_id)
        : null)

    if (!documentEntityId) {
      throw new Error('Document entity not found')
    }

    const { data: entity, error: entityError } = await supabase
      .from('document_entities')
      .select('id, source_name, source_storage_path, witness_current_storage_path, events')
      .eq('id', documentEntityId)
      .single()

    if (entityError || !entity) {
      throw new Error('Document entity not found')
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
      console.log(`Access logged: ${event_type} for entity ${documentEntityId}`)
    }

    // === PROBATORY EVENT: share.opened ===
    // Register that someone opened this share link (goes to .eco)
    const ipHash = metadata.ip_address ? await hashIP(metadata.ip_address) : null;
    const browserFamily = getBrowserFamily(metadata.user_agent);

    const eventResult = await appendEvent(
      supabase,
      documentEntityId,
      {
        kind: 'share.opened',
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
      console.error('Failed to append share.opened event:', eventResult.error);
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
      if (entity.witness_current_storage_path) {
        pdfSignedUrl = await createSignedUrlWithFallback(
          supabase,
          entity.witness_current_storage_path,
          'user-documents',
        )
      }

      const ecoStoragePath = getLatestEcoStoragePath((entity as any).events)
      if (ecoStoragePath) {
        ecoSignedUrl = await createSignedUrlWithFallback(
          supabase,
          ecoStoragePath,
          'artifacts',
          'user-documents',
        )
      }
    }

    // Return link status and document metadata
    return new Response(
      JSON.stringify({
        valid: true,
        document_entity_id: documentEntityId,
        document: {
          title: document?.title ?? (entity as any).source_name,
          original_filename: document?.original_filename ?? (entity as any).source_name,
          eco_hash: document?.eco_hash ?? null
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
    const message = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({
        valid: false,
        error: message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
}))
