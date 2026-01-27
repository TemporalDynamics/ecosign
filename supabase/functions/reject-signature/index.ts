import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { appendEvent as appendCanonicalEvent } from '../_shared/canonicalEventHelper.ts'
import { shouldRejectSignature } from '../../../packages/authority/src/decisions/rejectSignature.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': (Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SITE_URL') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })

interface Payload {
  signerId: string
  reason?: string
}

serve(async (req) => {
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = (await req.json()) as Payload
    if (!body?.signerId) return json({ error: 'signerId is required' }, 400)

    const { data: signer, error: signerError } = await supabase
      .from('workflow_signers')
      .select('id, email, workflow_id, signing_order, status')
      .eq('id', body.signerId)
      .single()

    if (signerError || !signer) {
      return json({ error: 'Signer not found' }, 404)
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
    // Nota: actor_id es indeterminado en service role, asumimos owner por ahora
    const canonicalDecision = shouldRejectSignature({
      actor_id: workflow?.owner_id || null, // Simplificación: asumimos owner
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
    try {
      await supabase.from('shadow_decision_logs').insert({
        decision_code: 'D10_REJECT_SIGNATURE',
        workflow_id: signer.workflow_id,
        signer_id: signer.id,
        legacy_decision: legacyDecision,
        canonical_decision: canonicalDecision,
        context: {
          actor_id: workflow?.owner_id || null,
          operation: 'reject-signature',
          signer_status: signer.status,
          workflow_status: workflow?.status || null,
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
    await supabase
      .from('workflow_signers')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
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
          reason: body.reason || null
        }
      },
      'reject-signature'
    )

    return json({ success: true })
  } catch (error: any) {
    console.error('reject-signature error', error)
    return json({ error: error?.message || 'Unexpected error' }, 500)
  }
})
