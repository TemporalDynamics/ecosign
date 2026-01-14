import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
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
  signerId: string
  firstName: string
  lastName: string
  email: string
  confirmedRecipient: boolean
  acceptedLogging: boolean
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = (await req.json()) as Payload
    if (!body?.signerId) return json({ error: 'signerId is required' }, 400)
    if (!body?.firstName?.trim() || !body?.lastName?.trim()) {
      return json({ error: 'Nombre y apellido son obligatorios' }, 400)
    }
    if (!body?.confirmedRecipient || !body?.acceptedLogging) {
      return json({ error: 'Se requiere confirmación de identidad y registro' }, 400)
    }

    const { data: signer, error: signerError } = await supabase
      .from('workflow_signers')
      .select('id, email, name, workflow_id, signing_order')
      .eq('id', body.signerId)
      .single()

    if (signerError || !signer) {
      return json({ error: 'Signer not found' }, 404)
    }

    const fullName = `${body.firstName.trim()} ${body.lastName.trim()}`

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

    return json({ success: true })
  } catch (error: any) {
    console.error('confirm-signer-identity error', error)
    return json({ error: error?.message || 'Unexpected error' }, 500)
  }
})
