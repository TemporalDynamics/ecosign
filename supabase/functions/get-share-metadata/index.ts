import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { getCorsHeaders } from '../_shared/cors.ts'
import { withRateLimit } from '../_shared/ratelimit.ts'

const jsonResponse = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })

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
    if (!isUuid(shareId)) {
      return jsonResponse({ success: false, error: 'invalid_share_id' }, 400, corsHeaders)
    }

    const { data: share, error: shareError } = await supabaseAdmin
      .from('document_shares')
      .select('id, document_id, nda_enabled, nda_text, nda_accepted_at, expires_at, status, user_documents!inner(document_name)')
      .eq('id', shareId)
      .single()

    if (shareError || !share) {
      return jsonResponse({ success: false, error: 'invalid_or_expired' }, 404, corsHeaders)
    }

    if (share.status !== 'pending') {
      return jsonResponse({ success: false, error: 'invalid_or_expired' }, 404, corsHeaders)
    }

    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return jsonResponse({ success: false, error: 'invalid_or_expired' }, 404, corsHeaders)
    }

    return jsonResponse(
      {
        success: true,
        share_id: share.id,
        nda_enabled: Boolean(share.nda_enabled),
        nda_text: share.nda_text ?? '',
        nda_accepted: Boolean(share.nda_accepted_at),
        expires_at: share.expires_at,
        document_name: (share as any).user_documents?.document_name ?? 'Documento',
      },
      200,
      corsHeaders,
    )
  } catch (err) {
    console.error('get-share-metadata error', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return jsonResponse({ success: false, error: message }, 500, corsHeaders)
  }
}))
