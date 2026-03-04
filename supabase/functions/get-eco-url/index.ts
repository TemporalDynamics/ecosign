import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { validateSignerAccessToken } from '../_shared/signerAccessToken.ts'
import { appendEvent } from '../_shared/eventHelper.ts'

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
      // Owner-for-signer mode: owner requests a signer's evidence URL
      ownerForSignerId?: string
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRole) as any

    // --- Protection ECO mode: owner (or authorized participant) downloads final ECO ---
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

      const isOwner = entity.owner_id === user.id

      // Owner-for-signer mode: owner fetches a specific signer's evidence URL.
      // Only the document owner can request this — no participant elevation.
      if (body.ownerForSignerId) {
        if (!isOwner) {
          return jsonResponse({ error: 'Forbidden' }, 403)
        }
        const targetSignerId = String(body.ownerForSignerId)
        const events = Array.isArray(entity.events) ? entity.events : []

        // Primary: look for signature.evidence.generated in entity events.
        // This is written by generate-signature-evidence (async, post-TSA job).
        const evidenceGenEvent = [...events].reverse().find((e: any) =>
          e?.kind === 'signature.evidence.generated' &&
          e?.payload?.signer_id === targetSignerId
        )
        let artifactPath: string | null = evidenceGenEvent?.payload?.artifact_path ?? null

        // Fallback: look for eco.snapshot.issued in workflow_events.
        // This is written by apply-signer-signature inline (synchronous, always present).
        // eco_path in that event uses the same storage location as artifact_path.
        if (!artifactPath) {
          const { data: wfEvent } = await supabase
            .from('workflow_events')
            .select('payload')
            .eq('signer_id', targetSignerId)
            .eq('event_type', 'eco.snapshot.issued')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          const fallbackPath = wfEvent?.payload?.eco_path ?? null
          if (typeof fallbackPath === 'string' && fallbackPath.length > 0) {
            artifactPath = fallbackPath
          }
        }

        if (!artifactPath) {
          return jsonResponse({ error: 'signer_evidence_not_ready' }, 404)
        }

        const { data, error } = await supabase.storage
          .from('artifacts')
          .createSignedUrl(artifactPath, 60 * 60)

        if (error || !data?.signedUrl) {
          return jsonResponse({ error: error?.message || 'signed_url_failed' }, 500)
        }

        return jsonResponse({ success: true, signed_url: data.signedUrl, artifact_path: artifactPath })
      }

      // === final_document_visibility enforcement ===
      // Owner always has access. Non-owner access requires:
      //   1. workflow.final_document_visibility = 'participants'
      //   2. user's email is a signed signer on the linked workflow
      if (!isOwner) {
        const { data: workflow } = await supabase
          .from('signature_workflows')
          .select('id, final_document_visibility')
          .eq('document_entity_id', body.document_entity_id)
          .maybeSingle()

        if (!workflow) {
          return jsonResponse({ error: 'Forbidden' }, 403)
        }

        if (workflow.final_document_visibility !== 'participants') {
          return jsonResponse({ error: 'final_document_restricted_to_owner' }, 403)
        }

        // Verify the requesting user is a signed signer on this workflow
        const userEmail = typeof user.email === 'string' ? user.email.toLowerCase() : null
        if (!userEmail) {
          return jsonResponse({ error: 'Forbidden' }, 403)
        }

        const { data: signer } = await supabase
          .from('workflow_signers')
          .select('id')
          .eq('workflow_id', workflow.id)
          .ilike('email', userEmail)
          .eq('status', 'signed')
          .maybeSingle()

        if (!signer) {
          return jsonResponse({ error: 'Forbidden' }, 403)
        }
      }

      // Access granted — serve final ECO
      const events = Array.isArray(entity.events) ? entity.events : []
      const finalizedEvent = [...events].reverse().find((e: any) => e?.kind === 'artifact.finalized')
      const ecoStoragePath: string | null = finalizedEvent?.payload?.eco_storage_path ?? null

      if (!ecoStoragePath) {
        return jsonResponse({ error: 'eco_not_ready' }, 404)
      }

      // eco_storage_path is stored as "artifacts/{id}/v1.eco.json" — this IS the path
      // within the artifacts bucket. Use it directly without stripping any prefix.
      const { data, error } = await supabase.storage
        .from('artifacts')
        .createSignedUrl(ecoStoragePath, 60 * 60)

      if (error || !data?.signedUrl) {
        return jsonResponse({ error: error?.message || 'signed_url_failed' }, 500)
      }

      return jsonResponse({ success: true, signed_url: data.signedUrl })
    }

    // --- Workflow ECO mode: signer downloads their own evidence file ---
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
      signing_order: number | null
      access_token_hash: string | null
      token_expires_at: string | null
      token_revoked_at: string | null
    }>(supabase, signerId, accessToken, 'id, workflow_id, signing_order, access_token_hash, token_expires_at, token_revoked_at')

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

    // Best-effort: record ECO download event in entity ledger
    try {
      const { data: workflow } = await supabase
        .from('signature_workflows')
        .select('document_entity_id')
        .eq('id', workflowId)
        .single()

      if (workflow?.document_entity_id) {
        // Extract witness_hash from path: evidence/{workflowId}/{signerId}/{witnessHash}.eco.json
        const filename = path.split('/').pop() ?? ''
        const witnessHash = filename.replace(/\.eco\.json$/, '') || null

        await appendEvent(
          supabase,
          workflow.document_entity_id,
          {
            kind: 'signature.evidence.downloaded',
            at: new Date().toISOString(),
            payload: {
              signer_id: signerId,
              step_index: signerValidation.signer.signing_order ?? null,
              resource: 'eco',
              witness_hash: witnessHash,
            },
          },
          'get-eco-url',
        )
      }
    } catch (evErr) {
      console.warn('get-eco-url: failed to record evidence.downloaded event (best-effort)', evErr)
    }

    return jsonResponse({ success: true, signed_url: data.signedUrl })
  } catch (err: any) {
    console.error('get-eco-url error', err)
    return jsonResponse({ error: err?.message || 'Unexpected error' }, 500)
  }
})
