import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { appendEvent as appendCanonicalEvent } from '../_shared/canonicalEventHelper.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': (Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SITE_URL') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Missing authorization' }, 401)

    const supabaseAuth = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized', details: userError?.message }, 401)
    }

    const { workflowId } = await req.json()
    if (!workflowId) return jsonResponse({ error: 'workflowId is required' }, 400)

    const { data: workflow, error: workflowError } = await supabase
      .from('signature_workflows')
      .select('id, owner_id, status')
      .eq('id', workflowId)
      .single()

    if (workflowError || !workflow) {
      return jsonResponse({ error: 'Workflow not found' }, 404)
    }

    if (workflow.owner_id !== user.id) {
      return jsonResponse({ error: 'Forbidden' }, 403)
    }

    if (['completed', 'cancelled', 'archived'].includes(workflow.status)) {
      return jsonResponse({ error: 'Workflow cannot be cancelled' }, 400)
    }

    const { error: updateError } = await supabase
      .from('signature_workflows')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', workflowId)

    if (updateError) {
      return jsonResponse({ error: 'Failed to cancel workflow' }, 500)
    }

    await appendCanonicalEvent(
      supabase,
      {
        event_type: 'workflow.cancelled',
        workflow_id: workflowId,
        payload: { previous_status: workflow.status },
        actor_id: user.id
      },
      'cancel-workflow'
    )

    return jsonResponse({ success: true })
  } catch (error) {
    console.error('cancel-workflow error', error)
    return jsonResponse({ error: 'Internal error' }, 500)
  }
})
