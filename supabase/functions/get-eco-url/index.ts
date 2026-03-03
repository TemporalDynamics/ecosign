import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { validateSignerAccessToken } from '../_shared/signerAccessToken.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin'
}

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  })

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      path?: string
      workflowId?: string
      signerId?: string
      accessToken?: string
      document_entity_id?: string
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRole) as any

    // --- Protection ECO mode: owner downloads their own ECO ---
    if (body.document_entity_id) {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return jsonResponse({ error: 'Unauthorized' }, 401)
      }

      const userClient = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      ) as any

      const { data: { user }, error: authError } = await userClient.auth.getUser()
      if (authError || !user) {
        return jsonResponse({ error: 'Unauthorized' }, 401)
      }

      const { data: entity, error: entityError } = await supabase
        .from('document_entities')
        .select('id, owner_id, events')
        .eq('id', body.document_entity_id)
        .single()

      if (entityError || !entity) {
        return jsonResponse({ error: 'Document not found' }, 404)
      }

      if (entity.owner_id !== user.id) {
        return jsonResponse({ error: 'Forbidden' }, 403)
      }

      const events = Array.isArray(entity.events) ? entity.events : []
      const finalizedEvent = [...events].reverse().find((e: any) => e?.kind === 'artifact.finalized')
      const ecoStoragePath: string | null = finalizedEvent?.payload?.eco_storage_path ?? null

      if (!ecoStoragePath) {
        return jsonResponse({ error: 'eco_not_ready' }, 404)
      }

      // Normalize: strip leading bucket prefix if present
      const normalizedPath = ecoStoragePath.replace(/^artifacts\//, '')

      const { data, error } = await supabase.storage
        .from('artifacts')
        .createSignedUrl(normalizedPath, 60 * 60)

      if (error || !data?.signedUrl) {
        return jsonResponse({ error: error?.message || 'signed_url_failed' }, 500)
      }

      return jsonResponse({ success: true, signed_url: data.signedUrl })
    }

    // --- Workflow ECO mode: signer downloads evidence file ---
    const path = String(body.path || '')
    const workflowId = String(body.workflowId || '')
    const signerId = String(body.signerId || '')
    const accessToken = String(body.accessToken || '')

    if (!path || !workflowId || !signerId || !accessToken) {
      return jsonResponse({ error: 'path, workflowId, signerId and accessToken required' }, 400)
    }

    const expectedPrefix = `evidence/${workflowId}/${signerId}/`
    if (!path.startsWith(expectedPrefix)) {
      return jsonResponse({ error: 'invalid_path' }, 403)
    }

    const signerValidation = await validateSignerAccessToken<{
      id: string
      workflow_id: string
      access_token_hash: string | null
      token_expires_at: string | null
      token_revoked_at: string | null
    }>(supabase, signerId, accessToken, 'id, workflow_id, access_token_hash, token_expires_at, token_revoked_at')

    if (!signerValidation.ok) {
      return jsonResponse({ error: signerValidation.error }, signerValidation.status)
    }

    if (signerValidation.signer.workflow_id !== workflowId) {
      return jsonResponse({ error: 'Signer does not belong to workflow' }, 403)
    }

    const { data, error } = await supabase.storage
      .from('artifacts')
      .createSignedUrl(path, 60 * 60)

    if (error || !data?.signedUrl) {
      return jsonResponse({ error: error?.message || 'signed_url_failed' }, 500)
    }

    return jsonResponse({ success: true, signed_url: data.signedUrl })
  } catch (err: any) {
    console.error('get-eco-url error', err)
    return jsonResponse({ error: err?.message || 'Unexpected error' }, 500)
  }
})
