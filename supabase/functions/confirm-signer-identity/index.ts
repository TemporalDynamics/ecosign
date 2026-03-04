import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { appendEvent as appendCanonicalEvent } from '../_shared/canonicalEventHelper.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { validateSignerAccessToken } from '../_shared/signerAccessToken.ts'

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' }
  })

interface Payload {
  signerId: string
  accessToken: string
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
    if (!body?.accessToken?.trim()) return json({ error: 'accessToken is required' }, 400, corsHeaders)
    if (!body?.firstName?.trim() || !body?.lastName?.trim()) {
      return json({ error: 'Nombre y apellido son obligatorios' }, 400, corsHeaders)
    }
    if (!body?.confirmedRecipient || !body?.acceptedLogging) {
      return json({ error: 'Se requiere confirmación de identidad y registro' }, 400, corsHeaders)
    }

    const signerValidation = await validateSignerAccessToken<{
      id: string
      email: string
      name: string | null
      workflow_id: string
      signing_order: number | null
      status: string | null
      access_token_hash: string | null
      token_expires_at: string | null
      token_revoked_at: string | null
    }>(
      supabase,
      body.signerId,
      body.accessToken,
      'id, email, name, workflow_id, signing_order, status, access_token_hash, token_expires_at, token_revoked_at',
    )

    if (!signerValidation.ok) {
      return json({ error: signerValidation.error }, signerValidation.status, corsHeaders)
    }

    const signer = signerValidation.signer
    const { data: workflow } = await supabase
      .from('signature_workflows')
      .select('status')
      .eq('id', signer.workflow_id)
      .single()

    if (workflow?.status && workflow.status !== 'active') {
      return json(
        { error: `Workflow is not active (status=${workflow.status})` },
        403,
        corsHeaders
      )
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

    return json({ success: true }, 200, corsHeaders)
  } catch (error: any) {
    console.error('confirm-signer-identity error', error)
    return json({ error: error?.message || 'Unexpected error' }, 500, corsHeaders)
  }
})
