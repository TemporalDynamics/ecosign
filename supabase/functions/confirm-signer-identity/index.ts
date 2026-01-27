import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { appendEvent as appendCanonicalEvent } from '../_shared/canonicalEventHelper.ts'
import { shouldConfirmIdentity } from '../../../packages/authority/src/decisions/confirmIdentity.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' }
  })

interface Payload {
  signerId: string
  firstName: string
  lastName: string
  email: string
  confirmedRecipient: boolean
  acceptedLogging: boolean
}

serve(async (req) => {
  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined)
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }
  if (req.method === 'OPTIONS') {
    if (!isAllowed) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders })
    }
    return new Response('ok', { headers: corsHeaders })
  }
  if (!isAllowed) return json({ error: 'Origin not allowed' }, 403, corsHeaders)
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, corsHeaders)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = (await req.json()) as Payload
    if (!body?.signerId) return json({ error: 'signerId is required' }, 400, corsHeaders)
    if (!body?.firstName?.trim() || !body?.lastName?.trim()) {
      return json({ error: 'Nombre y apellido son obligatorios' }, 400, corsHeaders)
    }
    if (!body?.confirmedRecipient || !body?.acceptedLogging) {
      return json({ error: 'Se requiere confirmación de identidad y registro' }, 400, corsHeaders)
    }

    const { data: signer, error: signerError } = await supabase
      .from('workflow_signers')
      .select('id, email, name, workflow_id, signing_order, status')
      .eq('id', body.signerId)
      .single()

    if (signerError || !signer) {
      return json({ error: 'Signer not found' }, 404, corsHeaders)
    }

    const fullName = `${body.firstName.trim()} ${body.lastName.trim()}`

    // Shadow mode: compute decisions before any mutation
    // Legacy decision: validaciones básicas (trimmed names + flags)
    const legacyDecision = Boolean(
      signer &&
      body.firstName?.trim() &&
      body.lastName?.trim() &&
      body.confirmedRecipient &&
      body.acceptedLogging
    )

    // Canonical decision: validaciones completas (estados + deduplicación)
    const canonicalDecision = shouldConfirmIdentity({
      signer: signer ? {
        id: signer.id,
        email: signer.email,
        name: signer.name,
        status: signer.status,
        workflow_id: signer.workflow_id,
      } : null,
      identity: {
        firstName: body.firstName,
        lastName: body.lastName,
        confirmedRecipient: body.confirmedRecipient,
        acceptedLogging: body.acceptedLogging,
      },
    })

    // Log shadow comparison
    try {
      await supabase.from('shadow_decision_logs').insert({
        decision_code: 'D11_CONFIRM_IDENTITY',
        workflow_id: signer.workflow_id,
        signer_id: signer.id,
        legacy_decision: legacyDecision,
        canonical_decision: canonicalDecision,
        context: {
          operation: 'confirm-identity',
          signer_status: signer.status,
          signer_name_before: signer.name,
          confirmed_recipient: body.confirmedRecipient,
          accepted_logging: body.acceptedLogging,
          phase: 'PASO_2_SHADOW_MODE_D11',
        },
      })
    } catch (logError) {
      console.warn('[D11 SHADOW] Log insert failed', logError)
    }

    if (legacyDecision !== canonicalDecision) {
      console.warn('[SHADOW DIVERGENCE D11]', {
        legacy: legacyDecision,
        canonical: canonicalDecision,
        signer_id: signer.id,
        signer_status: signer.status,
        signer_name: signer.name,
      })
    } else {
      console.log('[SHADOW MATCH D11]', {
        decision: legacyDecision,
        signer_id: signer.id,
      })
    }

    // Ejecutar decisión legacy (autoridad actual)
    await supabase
      .from('workflow_signers')
      .update({
        name: fullName,
        updated_at: new Date().toISOString()
      })
      .eq('id', signer.id)

    await appendCanonicalEvent(
      supabase,
      {
        event_type: 'signer.identity_confirmed',
        workflow_id: signer.workflow_id,
        signer_id: signer.id,
        payload: {
          email: signer.email,
          signing_order: signer.signing_order
        }
      },
      'confirm-signer-identity'
    )

    return json({ success: true }, 200, corsHeaders)
  } catch (error: any) {
    console.error('confirm-signer-identity error', error)
    return json({ error: error?.message || 'Unexpected error' }, 500, corsHeaders)
  }
})
