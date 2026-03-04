import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { validateSignerAccessToken } from '../_shared/signerAccessToken.ts'
import { appendEvent } from '../_shared/eventHelper.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

const jsonResponse = (data: unknown, status: number, cors: Record<string, string>) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

serve(async (req) => {
  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined)

  if (req.method === 'OPTIONS') {
    if (!isAllowed) return new Response('Forbidden', { status: 403, headers: corsHeaders })
    return new Response('ok', { headers: corsHeaders })
  }

  if (!isAllowed) return jsonResponse({ error: 'Origin not allowed' }, 403, corsHeaders)
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders)

  try {
    const body = (await req.json().catch(() => ({}))) as {
      signer_id?: string
      workflow_id?: string
      access_token?: string
      resource?: 'pdf' | 'eco'
      witness_hash?: string | null
    }

    const signerId = String(body.signer_id ?? '')
    const workflowId = String(body.workflow_id ?? '')
    const accessToken = String(body.access_token ?? '')
    const resource = body.resource === 'eco' ? 'eco' : 'pdf'
    const witnessHash = typeof body.witness_hash === 'string' ? body.witness_hash : null

    if (!signerId || !workflowId || !accessToken) {
      return jsonResponse({ error: 'signer_id, workflow_id and access_token required' }, 400, corsHeaders)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    ) as any

    const signerValidation = await validateSignerAccessToken<{
      id: string
      workflow_id: string
      signing_order: number | null
      access_token_hash: string | null
      token_expires_at: string | null
      token_revoked_at: string | null
    }>(
      supabase,
      signerId,
      accessToken,
      'id, workflow_id, signing_order, access_token_hash, token_expires_at, token_revoked_at',
    )

    if (!signerValidation.ok) {
      return jsonResponse({ error: signerValidation.error }, signerValidation.status, corsHeaders)
    }

    if (signerValidation.signer.workflow_id !== workflowId) {
      return jsonResponse({ error: 'Signer does not belong to workflow' }, 403, corsHeaders)
    }

    const { data: workflow } = await supabase
      .from('signature_workflows')
      .select('document_entity_id')
      .eq('id', workflowId)
      .single()

    if (!workflow?.document_entity_id) {
      // Workflow has no entity — record is a no-op but not an error for the client
      return jsonResponse({ success: true, recorded: false }, 200, corsHeaders)
    }

    await appendEvent(
      supabase,
      workflow.document_entity_id,
      {
        kind: 'signature.evidence.downloaded',
        at: new Date().toISOString(),
        payload: {
          signer_id: signerId,
          step_index: signerValidation.signer.signing_order ?? null,
          resource,
          witness_hash: witnessHash,
        },
      },
      'record-evidence-download',
    )

    return jsonResponse({ success: true, recorded: true }, 200, corsHeaders)
  } catch (err: any) {
    console.error('record-evidence-download error', err)
    return jsonResponse({ error: err?.message || 'Unexpected error' }, 500, corsHeaders)
  }
})
