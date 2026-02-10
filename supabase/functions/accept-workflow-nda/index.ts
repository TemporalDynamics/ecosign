import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { parseJsonBody } from '../_shared/validation.ts'
import { AcceptWorkflowNdaSchema } from '../_shared/schemas.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

const NDA_VERSION = 'v1';
const NDA_TEXT_URL_PRIMARY = new URL('../../../../docs/legal/nda/v1.txt', import.meta.url);
const NDA_TEXT_URL_FALLBACK = new URL('../_shared/nda/v1.txt', import.meta.url);

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
    const { signer_id, signer_email } = parsed.data

    // Load canonical NDA text (v1) and compute hash
    let ndaText = '';
    try {
      ndaText = await Deno.readTextFile(NDA_TEXT_URL_PRIMARY);
    } catch (err) {
      console.warn('Primary NDA text not found, using fallback copy:', err);
      try {
        ndaText = await Deno.readTextFile(NDA_TEXT_URL_FALLBACK);
      } catch (fallbackErr) {
        console.error('Failed to read NDA canonical text (fallback also missing):', fallbackErr);
        return json({ error: 'NDA canonical text not found' }, 500);
      }
    }
    const canonicalText = ndaText.replace(/\r\n/g, '\n');
    const ndaHash = await computeSha256(canonicalText);

    const { data: signer, error } = await supabase
      .from('workflow_signers')
      .select('id, email, nda_accepted, workflow_id')
      .eq('id', signer_id)
      .single()

    if (error || !signer) return json({ error: 'Signer not found' }, 404)

    const emailMatches = signer.email.toLowerCase() === signer_email.toLowerCase()
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
      return json({ success: true, alreadyAccepted: true, nda_hash: ndaHash, nda_version: NDA_VERSION })
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

    // === ECOx Audit-grade event ===
    try {
      const { error: eventError } = await supabase.rpc('log_ecox_event', {
        p_workflow_id: signer.workflow_id,
        p_signer_id: signer.id,
        p_event_type: 'nda.accepted',
        p_source_ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown',
        p_user_agent: req.headers.get('user-agent') || 'unknown',
        p_geolocation: null,
        p_details: {
          nda_version: NDA_VERSION,
          nda_hash: ndaHash,
          nda_source: 'docs/legal/nda/v1.txt',
          accepted_at: acceptedAt
        },
        p_document_hash_snapshot: null
      });

      if (eventError) {
        console.error('Failed to log nda.accepted ecox event:', eventError);
      }
    } catch (eventErr) {
      console.warn('ECOx event logging failed:', eventErr);
    }

    return json({
      success: true,
      nda_hash: ndaHash,
      nda_version: NDA_VERSION,
      accepted_at: acceptedAt
    })
  } catch (error) {
    console.error('accept-workflow-nda error', error)
    return json({ error: 'Internal error' }, 500)
  }
})
