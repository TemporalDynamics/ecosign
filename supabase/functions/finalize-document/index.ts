import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { requireInternalAuth } from '../_shared/internalAuth.ts'
import { appendEvent } from '../_shared/eventHelper.ts'
import { buildCanonicalEcoCertificate } from '../_shared/ecoCanonicalCertificate.ts'
import { signFinalEcoInstitutionally } from '../_shared/ecoInstitutionalSignature.ts'
import { attemptRekorProofForProtection } from '../_shared/rekorProof.ts'
import { buildEpiBlockFromEvents, deriveContentAt } from '../_shared/epiCanvas.ts'

type ClosureTrigger =
  | 'bitcoin_confirmed'
  | 'bitcoin_final_failed'
  | 'manual'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

async function verifyUploadedEcoHash(
  supabase: ReturnType<typeof createClient>,
  ecoStoragePath: string,
  expectedHash: string
): Promise<void> {
  const { data: fileResp, error: fileErr } = await supabase.storage
    .from('artifacts')
    .download(ecoStoragePath)

  if (fileErr || !fileResp) {
    throw new Error(`eco_download_failed: ${fileErr?.message ?? 'storage error'}`)
  }

  const ab = await fileResp.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', new Uint8Array(ab))
  const actualHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  if (actualHash !== expectedHash) {
    throw new Error(`eco_hash_mismatch: expected ${expectedHash} got ${actualHash}`)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 204 })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const auth = requireInternalAuth(req, { allowCronSecret: true })
  if (!auth.ok) return jsonResponse({ error: 'Forbidden' }, 403)

  const body = (await req.json().catch(() => ({}))) as {
    document_entity_id?: string
    closure_trigger?: ClosureTrigger
    events_snapshot?: unknown[]
  }

  const documentEntityId = String(body.document_entity_id ?? '').trim()
  const closureTrigger: ClosureTrigger = body.closure_trigger ?? 'manual'

  if (!documentEntityId) return jsonResponse({ error: 'document_entity_id required' }, 400)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Always fetch entity metadata from DB (source_name, hashes, etc.)
  const { data: entity, error: entityError } = await supabase
    .from('document_entities')
    .select('id, source_name, source_hash, witness_hash, signed_hash, events, created_at')
    .eq('id', documentEntityId)
    .single()

  if (entityError || !entity) return jsonResponse({ error: 'Document not found' }, 404)

  // Use caller-supplied events snapshot when available.
  // The worker re-reads events immediately after its own appendEvent commit
  // (READ COMMITTED: guaranteed to include the trigger event), then passes
  // that snapshot here. This eliminates the race condition without any sleep.
  // Fall back to entity.events if no snapshot was provided (e.g. manual calls).
  const events = Array.isArray(body.events_snapshot) && body.events_snapshot.length > 0
    ? body.events_snapshot
    : Array.isArray(entity.events) ? entity.events : []

  // Idempotent guard: if already finalized, noop
  if (events.some((e: any) => e?.kind === 'artifact.finalized')) {
    return jsonResponse({ success: true, noop: true, reason: 'already_finalized' })
  }

  const finalizedAt = new Date().toISOString()

  try {
    // Build ECO from current state of events (includes all confirmed proofs up to now)
    const ecoCertificate = buildCanonicalEcoCertificate({
      document_entity_id: documentEntityId,
      document_name: entity.source_name ?? null,
      source_hash: entity.source_hash ?? null,
      witness_hash: entity.witness_hash ?? null,
      signed_hash: entity.signed_hash ?? null,
      issued_at: finalizedAt,
      issued_at_source_override: 'artifact.finalized.at (finalize-document)',
      events,
      snapshot_kind: 'final_artifact',
    })

    const contentAt = deriveContentAt(events, entity.created_at ?? null)
    const epiBlock = await buildEpiBlockFromEvents({
      source_hash: entity.source_hash ?? null,
      content_at: contentAt || null,
      events,
    })
    if (epiBlock) {
      ;(ecoCertificate as Record<string, unknown>).epi = epiBlock
    }

    // Institutional signature
    const signedResult = await signFinalEcoInstitutionally(
      ecoCertificate as Record<string, unknown>,
    )

    // Best-effort Rekor proof (non-blocking)
    const witnessHash = entity.witness_hash ?? entity.source_hash ?? null
    let rekorStatus: 'confirmed' | 'failed' | 'skipped' = 'skipped'

    if (witnessHash) {
      try {
        const rekorTimeoutMs = Math.max(
          3000,
          Math.min(
            Number.parseInt(String(Deno.env.get('REKOR_TIMEOUT_MS') || '12000'), 10) || 12000,
            30000,
          ),
        )
        const rekorResult = await attemptRekorProofForProtection({
          witness_hash: witnessHash,
          document_entity_id: documentEntityId,
          timeout_ms: rekorTimeoutMs,
        })
        if (rekorResult.status === 'confirmed') {
          await appendEvent(supabase as any, documentEntityId, {
            kind: 'rekor.confirmed',
            at: rekorResult.attempted_at,
            payload: {
              ref: rekorResult.ref,
              statement_hash: rekorResult.statement_hash ?? null,
              statement_type: rekorResult.statement_type ?? null,
              public_key_b64: rekorResult.public_key_b64 ?? null,
              log_index: rekorResult.log_index ?? null,
              integrated_time: rekorResult.integrated_time ?? null,
              witness_hash: witnessHash,
              elapsed_ms: rekorResult.elapsed_ms ?? null,
              closure_trigger: closureTrigger,
            },
          }, 'finalize-document')
          rekorStatus = 'confirmed'
          console.log(`✅ rekor.confirmed for entity ${documentEntityId}`)
        } else {
          rekorStatus = 'failed'
          console.warn(`[finalize-document] Rekor non-critical: ${rekorResult.status}`)
        }
      } catch (rekorErr) {
        rekorStatus = 'failed'
        console.warn('[finalize-document] Rekor attempt threw (non-critical):', rekorErr)
      }
    }

    // Serialize the signed ECO to the exact bytes that will be stored.
    // eco_hash MUST be computed from these bytes — not from any in-memory object —
    // so that sha256(file_in_storage) === eco_hash_in_event, making the hash
    // independently verifiable by anyone who downloads the file.
    const ecoJson = JSON.stringify(signedResult.eco, null, 2)
    const ecoBytes = new TextEncoder().encode(ecoJson)

    const hashBuffer = await crypto.subtle.digest('SHA-256', ecoBytes)
    const ecoHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    // Upload ECO to storage (fail-hard: the file must be in storage before the event is emitted,
    // so verify-access and get-eco-url can always serve it via eco_storage_path).
    const ecoStoragePath = `artifacts/${documentEntityId}/v1.eco.json`
    const { error: uploadErr } = await supabase.storage
      .from('artifacts')
      .upload(ecoStoragePath, new Blob([ecoBytes], { type: 'application/json' }), {
        upsert: true,
        contentType: 'application/json',
      })

    if (uploadErr) {
      console.error('[finalize-document] ECO upload failed:', uploadErr)
      return jsonResponse({ error: 'eco_upload_failed', details: uploadErr.message }, 500)
    }

    try {
      await verifyUploadedEcoHash(supabase, ecoStoragePath, ecoHash)
    } catch (verifyErr: any) {
      console.error('[finalize-document] ECO hash mismatch after upload:', verifyErr)
      return jsonResponse(
        {
          error: 'eco_hash_mismatch',
          details: verifyErr?.message || 'Uploaded ECO does not match expected hash',
          retryable: true,
        },
        500
      )
    }

    // Emit artifact.finalized — canonical closure event.
    // eco_storage_path makes the file reachable by verify-access and get-eco-url.
    // eco_hash is sha256 of the bytes in storage — verifiable independently.
    const publicKeyId = (signedResult.eco as any)?.ecosign_signature?.public_key_id ?? null

    await appendEvent(supabase as any, documentEntityId, {
      kind: 'artifact.finalized',
      at: finalizedAt,
      payload: {
        closure_trigger: closureTrigger,
        eco_hash: ecoHash,
        eco_storage_path: ecoStoragePath,
        eco_institutional_signature: signedResult.signed ? 'present' : 'absent',
        eco_institutional_signature_reason: signedResult.reason ?? null,
        public_key_id: publicKeyId,
        rekor: rekorStatus,
        eco_format: 'eco.v2.canonical.certificate',
      },
    }, 'finalize-document')

    console.log(`✅ artifact.finalized for entity ${documentEntityId} trigger=${closureTrigger} eco_storage_path=${ecoStoragePath}`)

    return jsonResponse({
      success: true,
      document_entity_id: documentEntityId,
      closure_trigger: closureTrigger,
      eco_hash: ecoHash,
      eco_storage_path: ecoStoragePath,
      signed: signedResult.signed,
      rekor: rekorStatus,
      finalized_at: finalizedAt,
    })
  } catch (err: any) {
    console.error('[finalize-document] error:', err)
    return jsonResponse({ error: err?.message || 'Unexpected error' }, 500)
  }
})
