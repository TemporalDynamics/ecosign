import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { appendEvent as appendCanonicalEvent } from '../_shared/canonicalEventHelper.ts'
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

    if (workflowError || !workflow) {
      return jsonResponse({ error: 'Workflow not found' }, 404, corsHeaders)
    }

    if (workflow.owner_id !== user.id) {
      return jsonResponse({ error: 'Forbidden' }, 403, corsHeaders)
    }

    if (!['ready', 'active'].includes(workflow.status)) {
      return jsonResponse({ error: `Workflow cannot be cancelled from status=${workflow.status}` }, 400, corsHeaders)
    }

    const cancellationEvent = await appendCanonicalEvent(
      supabase,
      {
        event_type: 'workflow.cancelled',
        workflow_id: workflowId,
        payload: { previous_status: workflow.status, cancelled_at: new Date().toISOString() },
        actor_id: user.id
      },
      'cancel-workflow'
    )
    if (!cancellationEvent.success) {
      return jsonResponse({ error: 'Failed to cancel workflow', details: cancellationEvent.error }, 500, corsHeaders)
    }

    // Hard-revoke signer access tokens and mark pending signers as cancelled.
    const { error: revokeErr } = await supabase
      .from('workflow_signers')
      .update({
        token_revoked_at: new Date().toISOString(),
        signing_lock_id: null,
        signing_lock_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('workflow_id', workflowId)
      .not('status', 'in', '(signed,cancelled)')
    if (revokeErr) {
      console.error('cancel-workflow: failed to hard-revoke signers', revokeErr)
    }

    return jsonResponse({ success: true }, 200, corsHeaders)
  } catch (error) {
    console.error('cancel-workflow error', error)
    return jsonResponse({ error: 'Internal error' }, 500, corsHeaders)
  }
})
