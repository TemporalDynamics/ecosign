import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { appendEvent as appendCanonicalEvent } from '../_shared/canonicalEventHelper.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { validateSignerAccessToken } from '../_shared/signerAccessToken.ts'

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

interface Payload {
  workflowId: string
  signerId?: string
  accessToken?: string
  eventType: string
  payload?: Record<string, unknown>
}

serve(async (req) => {
  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined);

  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204, headers: corsHeaders });
  }

  if (req.method === 'OPTIONS') {
    if (!isAllowed) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }
    return new Response('ok', { headers: corsHeaders });
  }

  if (!isAllowed) {
    return jsonResponse({ error: 'Origin not allowed' }, 403, corsHeaders);
  }

  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = (await req.json()) as Payload
    if (!body?.workflowId) return jsonResponse({ error: 'workflowId is required' }, 400, corsHeaders)
    if (!body?.eventType) return jsonResponse({ error: 'eventType is required' }, 400, corsHeaders)
    if (body.eventType !== 'document.decrypted') {
      return jsonResponse({ error: 'eventType not allowed' }, 403, corsHeaders)
    }
    if (!body.signerId) return jsonResponse({ error: 'signerId is required' }, 400, corsHeaders)
    if (!body.accessToken?.trim()) {
      return jsonResponse({ error: 'accessToken is required' }, 400, corsHeaders)
    }

    const signerValidation = await validateSignerAccessToken<{
      id: string
      workflow_id: string
      access_token_hash: string | null
      token_expires_at: string | null
      token_revoked_at: string | null
    }>(
      supabase,
      body.signerId,
      body.accessToken,
      'id, workflow_id, access_token_hash, token_expires_at, token_revoked_at'
    )

    if (!signerValidation.ok) {
      return jsonResponse({ error: signerValidation.error }, signerValidation.status, corsHeaders)
    }

    const signer = signerValidation.signer
    if (signer.workflow_id !== body.workflowId) {
      return jsonResponse({ error: 'Signer does not belong to workflow' }, 403, corsHeaders)
    }

    const { data: otpRecord } = await supabase
      .from('signer_otps')
      .select('verified_at')
      .eq('signer_id', body.signerId)
      .single()

    if (!otpRecord?.verified_at) {
      return jsonResponse({ error: 'OTP not verified' }, 403, corsHeaders)
    }

    const result = await appendCanonicalEvent(
      supabase,
      {
        event_type: body.eventType as any,
        workflow_id: body.workflowId,
        signer_id: body.signerId ?? null,
        payload: body.payload ?? {}
      },
      'log-workflow-event'
    )

    if (!result.success) {
      return jsonResponse({ error: result.error || 'Failed to append event' }, 400, corsHeaders)
    }

    return jsonResponse({ success: true }, 200, corsHeaders)
  } catch (error: any) {
    console.error('log-workflow-event error', error)
    return jsonResponse({ error: error?.message || 'Unexpected error' }, 500, corsHeaders)
  }
})
