import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { appendEvent as appendCanonicalEvent } from '../_shared/canonicalEventHelper.ts'
import { shouldCancelWorkflow } from '../../../packages/authority/src/decisions/cancelWorkflow.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

serve(async (req) => {
  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined);

  if (Deno.env.get('FASE') !== '1') {
    return new Response(null, { status: 204, headers: corsHeaders });
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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Missing authorization' }, 401, corsHeaders)

    const supabaseAuth = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized', details: userError?.message }, 401, corsHeaders)
    }

    const { workflowId } = await req.json()
    if (!workflowId) return jsonResponse({ error: 'workflowId is required' }, 400, corsHeaders)

    const { data: workflow, error: workflowError } = await supabase
      .from('signature_workflows')
      .select('id, owner_id, status')
      .eq('id', workflowId)
      .single()

    // Shadow mode: compute decisions before any mutation
    const legacyDecision = Boolean(
      workflow &&
      workflow.owner_id === user.id &&
      workflow.status === 'active'
    )
    const canonicalDecision = shouldCancelWorkflow({
      actor_id: user.id,
      workflow: workflow ? { owner_id: workflow.owner_id, status: workflow.status } : null
    })

    const isUuid = typeof workflowId === 'string' &&
      /^[0-9a-fA-F-]{36}$/.test(workflowId)

    if (isUuid) {
      try {
        await supabase.from('shadow_decision_logs').insert({
          decision_code: 'D9_CANCEL_WORKFLOW',
          workflow_id: workflowId,
          signer_id: null,
          legacy_decision: legacyDecision,
          canonical_decision: canonicalDecision,
          context: {
            actor_id: user.id,
            operation: 'cancel-workflow',
            old_status: workflow?.status ?? null,
            phase: 'PASO_2_SHADOW_MODE_D9'
          }
        })
      } catch (logError) {
        console.warn('shadow log insert failed (D9)', logError)
      }
    }

    if (workflowError || !workflow) {
      return jsonResponse({ error: 'Workflow not found' }, 404, corsHeaders)
    }

    if (workflow.owner_id !== user.id) {
      return jsonResponse({ error: 'Forbidden' }, 403, corsHeaders)
    }

    if (workflow.status !== 'active') {
      return jsonResponse({ error: `Workflow cannot be cancelled from status=${workflow.status}` }, 400, corsHeaders)
    }

    const { error: updateError } = await supabase
      .from('signature_workflows')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', workflowId)

    if (updateError) {
      return jsonResponse({ error: 'Failed to cancel workflow' }, 500, corsHeaders)
    }

    await appendCanonicalEvent(
      supabase,
      {
        event_type: 'workflow.cancelled',
        workflow_id: workflowId,
        payload: { previous_status: workflow.status, cancelled_at: new Date().toISOString() },
        actor_id: user.id
      },
      'cancel-workflow'
    )

    return jsonResponse({ success: true }, 200, corsHeaders)
  } catch (error) {
    console.error('cancel-workflow error', error)
    return jsonResponse({ error: 'Internal error' }, 500, corsHeaders)
  }
})
