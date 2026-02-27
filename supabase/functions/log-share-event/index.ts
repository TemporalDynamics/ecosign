import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { getCorsHeaders } from '../_shared/cors.ts'
import { appendEvent, hashIP, getBrowserFamily } from '../_shared/eventHelper.ts'
import { withRateLimit } from '../_shared/ratelimit.ts'

const jsonResponse = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })

serve(withRateLimit('record', async (req) => {
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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const supabaseAdmin = createClient(supabaseUrl, serviceKey)

    const body = await req.json().catch(() => null)
    const share_id = (body as any)?.share_id as string | undefined
    const event_kind = (body as any)?.event_kind as string | undefined
    const session_id = (body as any)?.session_id as string | undefined

    const isUuid = (value: string | undefined) => Boolean(value && /^[0-9a-fA-F-]{36}$/.test(value))
    const allowed = new Set(['share.created', 'share.opened', 'otp.verified'])

    if (!isUuid(share_id)) {
      return jsonResponse({ success: false, error: 'invalid_share_id' }, 400, corsHeaders)
    }
    if (!event_kind || !allowed.has(event_kind)) {
      return jsonResponse({ success: false, error: 'invalid_event_kind' }, 400, corsHeaders)
    }
    if (session_id && !isUuid(session_id)) {
      return jsonResponse({ success: false, error: 'invalid_session_id' }, 400, corsHeaders)
    }

    // Load share
    const { data: share, error: shareError } = await supabaseAdmin
      .from('document_shares')
      .select('id, document_id, document_entity_id, created_by, expires_at, nda_enabled')
      .eq('id', share_id)
      .single()

    if (shareError || !share) {
      return jsonResponse({ success: false, error: 'share_not_found' }, 404, corsHeaders)
    }

    // Auth is required only for share.created (owner action)
    let actorId: string | null = null
    if (event_kind === 'share.created') {
      const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
      if (!authHeader) {
        return jsonResponse({ success: false, error: 'missing_authorization' }, 401, corsHeaders)
      }

      const supabaseAuth = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
      const { data: userRes, error: userError } = await supabaseAuth.auth.getUser()
      const user = userRes?.user
      if (userError || !user) {
        return jsonResponse({ success: false, error: 'unauthorized' }, 401, corsHeaders)
      }
      actorId = user.id
      if (share.created_by && share.created_by !== user.id) {
        return jsonResponse({ success: false, error: 'forbidden' }, 403, corsHeaders)
      }
    }

    const documentEntityId = typeof (share as any)?.document_entity_id === 'string' && (share as any).document_entity_id.length > 0
      ? String((share as any).document_entity_id)
      : null
    if (!documentEntityId) {
      return jsonResponse({ success: false, error: 'missing_document_entity_id' }, 409, corsHeaders)
    }

    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      req.headers.get('cf-connecting-ip') ||
      null
    const userAgent = req.headers.get('user-agent') || null

    const ipHash = ipAddress ? await hashIP(ipAddress) : null
    const browserFamily = getBrowserFamily(userAgent)
    const at = new Date().toISOString()

    const event = {
      kind: event_kind,
      at,
      share: {
        share_id,
        expires_at: share.expires_at,
        nda_enabled: Boolean(share.nda_enabled),
      },
      context: {
        ip_hash: ipHash,
        browser: browserFamily,
        session_id: session_id ?? null,
      },
      actor_id: actorId,
    }

    const result = await appendEvent(supabaseAdmin, documentEntityId, event as any, 'log-share-event')
    if (!result.success) {
      return jsonResponse({ success: false, error: result.error }, 500, corsHeaders)
    }

    return jsonResponse({ success: true }, 200, corsHeaders)
  } catch (err) {
    console.error('log-share-event error', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return jsonResponse({ success: false, error: message }, 500, corsHeaders)
  }
}))
