import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'
import { appendEvent as appendCanonicalEvent } from '../_shared/canonicalEventHelper.ts'
import { canonicalize, sha256Hex } from '../_shared/canonicalHash.ts'
import { shouldRejectSignature } from '../../../packages/authority/src/decisions/rejectSignature.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

interface Payload {
  signerId: string
  accessToken?: string
  reason?: string
  rejectionPhase?: 'pre_identity' | 'post_identity' | 'post_view' | 'signature_stage' | 'preaccess' | 'otp' | 'viewing' | 'signing'
}

type CanonicalRejectionPhase = 'pre_identity' | 'post_identity' | 'post_view' | 'signature_stage'

function normalizeRejectionPhase(phase?: Payload['rejectionPhase']): CanonicalRejectionPhase {
  switch (phase) {
    case 'pre_identity':
    case 'post_identity':
    case 'post_view':
    case 'signature_stage':
      return phase
    case 'preaccess':
      return 'pre_identity'
    case 'otp':
      return 'post_identity'
    case 'viewing':
      return 'post_view'
    case 'signing':
      return 'signature_stage'
    default:
      return 'pre_identity'
  }
}

const isTokenHash = (value?: string | null) =>
  !!value && /^[a-f0-9]{64}$/i.test(value)

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function attemptRejectionReceiptTsa(
  supabase: ReturnType<typeof createClient>,
  receiptHash: string
): Promise<{ status: 'confirmed' | 'failed'; provider: string; attempted_at: string; token_b64?: string; token_hash?: string; error?: string }> {
  const attemptedAt = new Date().toISOString()
  try {
    const { data, error } = await supabase.functions.invoke('legal-timestamp', {
      body: { hash_hex: receiptHash }
    })
    if (error || !data?.success || !data?.token) {
      return {
        status: 'failed',
        provider: 'https://freetsa.org/tsr',
        attempted_at: attemptedAt,
        error: error?.message || data?.error || 'tsa_unavailable'
      }
    }

    const tokenB64 = String(data.token)
    const tokenHash = await sha256Hex(tokenB64)
    return {
      status: 'confirmed',
      provider: String(data.tsa_url || 'https://freetsa.org/tsr'),
      attempted_at: attemptedAt,
      token_b64: tokenB64,
      token_hash: tokenHash
    }
  } catch (err: any) {
    return {
      status: 'failed',
      provider: 'https://freetsa.org/tsr',
      attempted_at: attemptedAt,
      error: err?.message || 'tsa_error'
    }
  }
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
    if (!body?.signerId) return jsonResponse({ error: 'signerId is required' }, 400, corsHeaders)
    if (!body?.accessToken) return jsonResponse({ error: 'accessToken is required' }, 400, corsHeaders)

    const { data: signer, error: signerError } = await supabase
      .from('workflow_signers')
      .select('id, email, workflow_id, signing_order, status, access_token_hash')
      .eq('id', body.signerId)
      .single()

    if (signerError || !signer) {
      return jsonResponse({ error: 'Signer not found' }, 404, corsHeaders)
    }

    const providedTokenHash = isTokenHash(body.accessToken)
      ? body.accessToken
      : await hashToken(body.accessToken)

    if (!signer.access_token_hash || signer.access_token_hash !== providedTokenHash) {
      return jsonResponse({ error: 'Invalid or expired access token' }, 403, corsHeaders)
    }

    // Obtener workflow para shadow mode
    const { data: workflow } = await supabase
      .from('signature_workflows')
      .select('id, owner_id, status')
      .eq('id', signer.workflow_id)
      .single()

    // Shadow mode: compute decisions before any mutation
    // Legacy decision: siempre true si el signer existe (no hay validaciones)
    const legacyDecision = Boolean(signer)

    // Canonical decision: validaciones completas
    // With signer token validation, actor_id can be bound to signer email.
    const canonicalDecision = shouldRejectSignature({
      actor_id: signer.email || null,
      signer: signer ? {
        id: signer.id,
        email: signer.email,
        status: signer.status,
        workflow_id: signer.workflow_id,
      } : null,
      workflow: workflow ? {
        owner_id: workflow.owner_id,
        status: workflow.status,
      } : null,
    })

    // Log shadow comparison
    const rejectionPhase = normalizeRejectionPhase(body.rejectionPhase)

    try {
      await supabase.from('shadow_decision_logs').insert({
        decision_code: 'D10_REJECT_SIGNATURE',
        workflow_id: signer.workflow_id,
        signer_id: signer.id,
        legacy_decision: legacyDecision,
        canonical_decision: canonicalDecision,
        context: {
          actor_id: signer.email || null,
          operation: 'reject-signature',
          signer_status: signer.status,
          workflow_status: workflow?.status || null,
          rejection_phase: rejectionPhase,
          phase: 'PASO_2_SHADOW_MODE_D10',
        },
      })
    } catch (logError) {
      console.warn('[D10 SHADOW] Log insert failed', logError)
    }

    if (legacyDecision !== canonicalDecision) {
      console.warn('[SHADOW DIVERGENCE D10]', {
        legacy: legacyDecision,
        canonical: canonicalDecision,
        signer_id: signer.id,
        signer_status: signer.status,
        workflow_status: workflow?.status,
      })
    } else {
      console.log('[SHADOW MATCH D10]', {
        decision: legacyDecision,
        signer_id: signer.id,
      })
    }

    // Ejecutar decisión legacy (autoridad actual)
    const rejectedAt = new Date().toISOString()

    const rejectionReceiptCore = {
      format: 'rr',
      format_version: '1.0',
      version: 'rr.v1',
      issued_at: rejectedAt,
      workflow_id: signer.workflow_id,
      signer_id: signer.id,
      signer_email: signer.email,
      rejection_phase: rejectionPhase,
      reason: body.reason || null
    }
    const receiptHash = await sha256Hex(canonicalize(rejectionReceiptCore))
    const receiptTsa = await attemptRejectionReceiptTsa(supabase, receiptHash)

    await supabase
      .from('workflow_signers')
      .update({
        status: 'rejected',
        updated_at: rejectedAt
      })
      .eq('id', signer.id)

    await appendCanonicalEvent(
      supabase,
      {
        event_type: 'signer.rejected',
        workflow_id: signer.workflow_id,
        signer_id: signer.id,
        payload: {
          email: signer.email,
          signing_order: signer.signing_order,
          previous_status: signer.status,
          rejected_at: rejectedAt,
          reason: body.reason || null,
          rejection_phase: rejectionPhase,
          rejection_receipt: {
            ...rejectionReceiptCore,
            receipt_hash: receiptHash,
            tsa: receiptTsa
          }
        }
      },
      'reject-signature'
    )

    return jsonResponse({ success: true }, 200, corsHeaders)
  } catch (error: any) {
    console.error('reject-signature error', error)
    return jsonResponse({ error: error?.message || 'Unexpected error' }, 500, corsHeaders)
  }
})
