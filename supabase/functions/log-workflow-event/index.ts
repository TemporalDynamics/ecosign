import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.92.0?target=deno'
import { appendEvent as appendCanonicalEvent } from '../_shared/canonicalEventHelper.ts'

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
  workflowId: string
  signerId?: string
  eventType: string
  payload?: Record<string, unknown>
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
    if (!body?.workflowId) return json({ error: 'workflowId is required' }, 400)
    if (!body?.eventType) return json({ error: 'eventType is required' }, 400)
    if (body.eventType !== 'document.decrypted') {
      return json({ error: 'eventType not allowed' }, 403)
    }
    if (!body.signerId) return json({ error: 'signerId is required' }, 400)

    const { data: signer, error: signerError } = await supabase
      .from('workflow_signers')
      .select('id, workflow_id')
      .eq('id', body.signerId)
      .eq('workflow_id', body.workflowId)
      .single()

    if (signerError || !signer) {
      return json({ error: 'Signer not found for workflow' }, 404)
    }

    const { data: otpRecord } = await supabase
      .from('signer_otps')
      .select('verified_at')
      .eq('signer_id', body.signerId)
      .single()

    if (!otpRecord?.verified_at) {
      return json({ error: 'OTP not verified' }, 403)
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
      return json({ error: result.error || 'Failed to append event' }, 400)
    }

    return json({ success: true })
  } catch (error: any) {
    console.error('log-workflow-event error', error)
    return json({ error: error?.message || 'Unexpected error' }, 500)
  }
})
