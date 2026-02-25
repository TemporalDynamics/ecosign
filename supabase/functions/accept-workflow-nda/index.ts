import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { parseJsonBody } from '../_shared/validation.ts'
import { AcceptWorkflowNdaSchema } from '../_shared/schemas.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { NDA_VERSION, normalizeNdaText, resolveNdaTemplateMetadata } from '../_shared/nda/text.ts'
import { validateSignerAccessToken } from '../_shared/signerAccessToken.ts'

const computeSha256 = async (input: string): Promise<string> => {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

serve(async (req) => {
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }

  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined)

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  if (req.method === 'OPTIONS') {
    if (!isAllowed) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders })
    }
    return new Response('ok', { headers: corsHeaders })
  }

  if (!isAllowed) {
    return json({ error: 'Origin not allowed' }, 403)
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const parsed = await parseJsonBody(req, AcceptWorkflowNdaSchema)
    if (!parsed.ok) {
      return json({ error: parsed.error, details: parsed.details }, 400)
    }
    const { signer_id, signer_email, access_token } = parsed.data

    const signerValidation = await validateSignerAccessToken<{
      id: string
      email: string
      nda_accepted: boolean
      workflow_id: string
      access_token_hash: string | null
      token_expires_at: string | null
      token_revoked_at: string | null
    }>(
      supabase,
      signer_id,
      access_token,
      'id, email, nda_accepted, workflow_id, access_token_hash, token_expires_at, token_revoked_at',
    )

    if (!signerValidation.ok) {
      return json({ error: signerValidation.error }, signerValidation.status)
    }

    const signer = signerValidation.signer

    const { data: workflow, error: workflowError } = await supabase
      .from('signature_workflows')
      .select('id, nda_text')
      .eq('id', signer.workflow_id)
      .single()

    if (workflowError || !workflow) {
      return json({ error: 'Workflow not found' }, 404)
    }

    const ndaText = normalizeNdaText(workflow.nda_text || '')
    if (!ndaText) {
      return json({ error: 'NDA text missing for workflow' }, 400)
    }

    const ndaHash = await computeSha256(ndaText);
    const templateMeta = resolveNdaTemplateMetadata(ndaText);

    const signerEmailNormalized = typeof signer.email === 'string' ? signer.email.toLowerCase() : ''
    const emailMatches = signerEmailNormalized !== '' && signerEmailNormalized === signer_email.toLowerCase()
    const legacyDecision = Boolean(emailMatches && !signer.nda_accepted)
    const canonicalDecision = Boolean(emailMatches && !signer.nda_accepted)

    const isUuid = (value: string | null) => Boolean(value && /^[0-9a-fA-F-]{36}$/.test(value))
    try {
      await supabase.from('shadow_decision_logs').insert({
        decision_code: 'D17_ACCEPT_WORKFLOW_NDA',
        workflow_id: null,
        signer_id: isUuid(signer_id) ? signer_id : null,
        legacy_decision: legacyDecision,
        canonical_decision: canonicalDecision,
        context: {
          operation: 'accept-workflow-nda',
          signer_id: signer.id,
          email_matches: emailMatches,
          nda_accepted: signer.nda_accepted,
          phase: 'PASO_2_SHADOW_MODE_D17'
        }
      })
    } catch (logError) {
      console.warn('[D17 SHADOW] Log insert failed', logError)
    }

    if (!emailMatches) {
      return json({ error: 'Email mismatch for signer' }, 400)
    }

    if (signer.nda_accepted) {
      return json({
        success: true,
        alreadyAccepted: true,
        nda_hash: ndaHash,
        nda_version: templateMeta.template_version ?? NDA_VERSION
      })
    }

    const acceptedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('workflow_signers')
      .update({
        nda_accepted: true,
        nda_accepted_at: acceptedAt
      })
      .eq('id', signer_id)

    if (updateError) {
      return json({ error: 'Failed to record NDA acceptance' }, 500)
    }

    // === ECOx Audit-grade event (FAIL-HARD) ===
    const { error: eventError } = await supabase.rpc('log_ecox_event', {
      p_workflow_id: signer.workflow_id,
      p_signer_id: signer.id,
      p_event_type: 'nda.accepted',
      p_source_ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown',
      p_user_agent: req.headers.get('user-agent') || 'unknown',
      p_geolocation: null,
      p_details: {
        nda_hash: ndaHash,
        nda_source: templateMeta.nda_source,
        template_id: templateMeta.template_id,
        template_version: templateMeta.template_version,
        accepted_at: acceptedAt
      },
      p_document_hash_snapshot: null
    });

    if (eventError) {
      console.error('Failed to log nda.accepted ecox event:', eventError);
      // Attempt rollback (best-effort) to avoid accepting NDA without audit-grade event
      try {
        await supabase
          .from('workflow_signers')
          .update({ nda_accepted: false, nda_accepted_at: null })
          .eq('id', signer_id);
      } catch (rollbackError) {
        console.error('Failed to rollback NDA acceptance after ecox error', rollbackError);
      }
      return json({ error: 'Failed to register NDA acceptance event' }, 500);
    }

    return json({
      success: true,
      nda_hash: ndaHash,
      nda_version: templateMeta.template_version ?? NDA_VERSION,
      accepted_at: acceptedAt
    })
  } catch (error) {
    console.error('accept-workflow-nda error', error)
    return json({ error: 'Internal error' }, 500)
  }
})
