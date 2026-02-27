import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { getCorsHeaders } from '../_shared/cors.ts'
import { withRateLimit } from '../_shared/ratelimit.ts'
import { appendEvent, hashIP, getBrowserFamily } from '../_shared/eventHelper.ts'
import { readEcoxRuntimeMetadata } from '../_shared/ecoxRuntime.ts'

const jsonResponse = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })

const normalizeOtp = (otp: string) => otp.replace(/[^A-Za-z0-9]/g, '').toUpperCase()

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder()
  const buf = enc.encode(input)
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

serve(withRateLimit('verify', async (req) => {
  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined)

  if (req.method === 'OPTIONS') {
    if (!isAllowed) return new Response('Forbidden', { status: 403, headers: corsHeaders })
    return new Response('ok', { headers: corsHeaders })
  }

  if (!isAllowed) {
    return jsonResponse({ error: 'Origin not allowed' }, 403, corsHeaders)
  }

  if (Deno.env.get('FASE') !== '1') {
    return jsonResponse({ error: 'disabled', message: 'Function disabled (FASE != 1)' }, 503, corsHeaders)
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders)
  }

  const isUuid = (value: string | undefined) => Boolean(value && /^[0-9a-fA-F-]{36}$/.test(value))

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseAdmin = createClient(supabaseUrl, serviceKey)

    const body = await req.json().catch(() => null)
    const shareId = (body as any)?.share_id as string | undefined
    const otpRaw = (body as any)?.otp as string | undefined
    if (!isUuid(shareId)) {
      return jsonResponse({ success: false, error: 'invalid_share_id' }, 400, corsHeaders)
    }
    if (!otpRaw || typeof otpRaw !== 'string') {
      return jsonResponse({ success: false, error: 'missing_otp' }, 400, corsHeaders)
    }

    const otp = normalizeOtp(otpRaw)
    if (otp.length !== 8) {
      return jsonResponse({ success: false, error: 'invalid_otp_format' }, 400, corsHeaders)
    }

    const otpHash = await sha256Hex(otp)

    const { data: share, error: shareError } = await supabaseAdmin
      .from('document_shares')
      .select('id, document_id, document_entity_id, otp_hash, wrapped_key, wrap_iv, recipient_salt, nda_enabled, nda_accepted_at, expires_at, status')
      .eq('id', shareId)
      .eq('otp_hash', otpHash)
      .eq('status', 'pending')
      .single()

    if (shareError || !share) {
      // Avoid leaking existence of share ids.
      return jsonResponse({ success: false, error: 'invalid_or_expired' }, 403, corsHeaders)
    }

    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return jsonResponse({ success: false, error: 'invalid_or_expired' }, 403, corsHeaders)
    }

    if (share.nda_enabled && !share.nda_accepted_at) {
      return jsonResponse({ success: false, error: 'nda_required' }, 403, corsHeaders)
    }

    const documentEntityId = typeof (share as any)?.document_entity_id === 'string' && (share as any).document_entity_id.length > 0
      ? String((share as any).document_entity_id)
      : null

    if (!documentEntityId) {
      return jsonResponse({ success: false, error: 'missing_document_entity_id' }, 409, corsHeaders)
    }

    const { data: entity, error: entityError } = await supabaseAdmin
      .from('document_entities')
      .select('id, source_name, metadata')
      .eq('id', documentEntityId)
      .single()

    if (entityError || !entity) {
      return jsonResponse({ success: false, error: 'document_entity_not_found' }, 404, corsHeaders)
    }

    const runtime = readEcoxRuntimeMetadata((entity as any).metadata ?? null)
    if (!runtime.encrypted_path) {
      return jsonResponse({ success: false, error: 'missing_encrypted_path' }, 409, corsHeaders)
    }

    const { data: signed, error: signedErr } = await supabaseAdmin
      .storage
      .from(runtime.storage_bucket)
      .createSignedUrl(runtime.encrypted_path, 3600)

    if (signedErr || !signed?.signedUrl) {
      console.error('verify-share-otp signed url failed', signedErr)
      return jsonResponse({ success: false, error: 'download_unavailable' }, 500, corsHeaders)
    }

    // Update last accessed timestamp (best-effort)
    try {
      await supabaseAdmin
        .from('document_shares')
        .update({ accessed_at: new Date().toISOString() })
        .eq('id', shareId)
    } catch (err) {
      console.warn('verify-share-otp: failed to update accessed_at', err)
    }

    // Emit probatory event otp.verified (best-effort)
    try {
      const ipAddress =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        req.headers.get('cf-connecting-ip') ||
        null
      const userAgent = req.headers.get('user-agent') || null
      const ipHash = ipAddress ? await hashIP(ipAddress) : null
      const browserFamily = getBrowserFamily(userAgent)
      await appendEvent(
        supabaseAdmin as any,
        documentEntityId,
        {
          kind: 'otp.verified',
          at: new Date().toISOString(),
          share: {
            share_id: shareId,
          },
          context: {
            ip_hash: ipHash,
            browser: browserFamily,
          }
        } as any,
        'verify-share-otp'
      )
    } catch (err) {
      console.warn('verify-share-otp: otp.verified append failed (best-effort)', err)
    }

    return jsonResponse(
      {
        success: true,
        document_name: (entity as any).source_name ?? 'Documento',
        encrypted_signed_url: signed.signedUrl,
        recipient_salt: share.recipient_salt,
        wrapped_key: share.wrapped_key,
        wrap_iv: share.wrap_iv,
      },
      200,
      corsHeaders,
    )
  } catch (err) {
    console.error('verify-share-otp error', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return jsonResponse({ success: false, error: message }, 500, corsHeaders)
  }
}))
