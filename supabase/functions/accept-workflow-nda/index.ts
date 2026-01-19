import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { parseJsonBody } from '../_shared/validation.ts'
import { AcceptWorkflowNdaSchema } from '../_shared/schemas.ts'

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

serve(async (req) => {
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

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

    const { data: signer, error } = await supabase
      .from('workflow_signers')
      .select('id, email, nda_accepted')
      .eq('id', signer_id)
      .single()

    if (error || !signer) return json({ error: 'Signer not found' }, 404)

    if (signer.email.toLowerCase() !== signer_email.toLowerCase()) {
      return json({ error: 'Email mismatch for signer' }, 400)
    }

    if (signer.nda_accepted) {
      return json({ success: true, alreadyAccepted: true })
    }

    const { error: updateError } = await supabase
      .from('workflow_signers')
      .update({
        nda_accepted: true,
        nda_accepted_at: new Date().toISOString()
      })
      .eq('id', signer_id)

    if (updateError) {
      return json({ error: 'Failed to record NDA acceptance' }, 500)
    }

    return json({ success: true })
  } catch (error) {
    console.error('accept-workflow-nda error', error)
    return json({ error: 'Internal error' }, 500)
  }
})
