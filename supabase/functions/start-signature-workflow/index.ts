import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { appendEvent } from '../_shared/canonicalEventHelper.ts'
import { buildCanonicalFieldSchemaV1, hashCanonicalFieldSchemaV1 } from '../_shared/fieldSchema.ts'
import { withRateLimit } from '../_shared/ratelimit.ts'
import {
  generateSecretToken,
  createTokenHash,
  encryptToken,
} from '../_shared/cryptoHelper.ts'
import { shouldStartSignatureWorkflow } from '../../../packages/authority/src/decisions/startSignatureWorkflow.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

interface Signer {
  email: string
  name?: string
  signingOrder: number
  requireLogin?: boolean
  requireNda?: boolean
  quickAccess?: boolean
}

interface StartWorkflowRequest {
  documentUrl: string
  documentHash: string
  originalFilename: string
  documentEntityId?: string
  signatureType?: 'ECOSIGN' | 'SIGNNOW'
  signers: Signer[]
  forensicConfig: {
    rfc3161: boolean
    polygon: boolean
    bitcoin: boolean
  }
  /**
   * Delivery mode for signer notifications.
   * - 'email': Send invitation emails to signers automatically (default)
   * - 'link': No automatic emails, creator shares link manually
   * Immutable after workflow creation.
   */
  deliveryMode?: 'email' | 'link'
}

function extractStoragePath(url: string): string | null {
  try {
    const parsed = new URL(url)
    const match = parsed.pathname.match(/\/storage\/v1\/object\/(?:sign|public)\/([^/]+)\/(.+)$/)
    if (!match) return null
    const path = decodeURIComponent(match[2])
    return path || null
  } catch {
    return null
  }
}

async function triggerEmailDelivery(supabase: ReturnType<typeof createClient>) {
  try {
    const cronSecret = Deno.env.get('CRON_SECRET')
    if (!cronSecret) {
      console.warn('send-pending-emails skipped: missing CRON_SECRET')
      return
    }
    await supabase.functions.invoke('send-pending-emails', {
      headers: { 'x-cron-secret': cronSecret }
    })
  } catch (error) {
    console.warn('send-pending-emails invoke failed', error)
  }
}

serve(withRateLimit('workflow', async (req) => {
  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined)

  const jsonResponse = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  if (req.method === 'OPTIONS') {
    if (!isAllowed) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders })
    }
    return new Response('ok', { headers: corsHeaders })
  }

  if (!isAllowed) {
    return jsonResponse({ error: 'Origin not allowed' }, 403)
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization' }, 401)
    }

    const supabaseAuth = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized', details: userError?.message }, 401)
    }

    const body: StartWorkflowRequest = await req.json()
    const {
      documentUrl,
      documentHash,
      originalFilename,
      documentEntityId,
      signatureType,
      signers,
      forensicConfig,
      deliveryMode = 'email' // Default to email for backwards compatibility
    } = body

    if (!documentUrl || !documentHash || !originalFilename || !signers || signers.length === 0) {
      const legacyDecision = false
      const canonicalDecision = shouldStartSignatureWorkflow({
        actor_id: user.id,
        payload: {
          documentUrl,
          documentHash,
          originalFilename,
          documentEntityId,
          signatureType,
          signers,
          forensicConfig,
          deliveryMode
        }
      })

      try {
        await supabase.from('shadow_decision_logs').insert({
          decision_code: 'D13_START_SIGNATURE_WORKFLOW',
          workflow_id: null,
          signer_id: null,
          legacy_decision: legacyDecision,
          canonical_decision: canonicalDecision,
          context: {
            operation: 'start-signature-workflow',
            phase: 'PASO_2_SHADOW_MODE_D13',
            reason: 'missing_required_fields',
            signers_count: signers ? signers.length : 0,
            delivery_mode: deliveryMode ?? null
          }
        })
      } catch (logError) {
        console.warn('shadow log insert failed (D13)', logError)
      }

      return jsonResponse({ error: 'Missing required fields' }, 400)
    }

    // Validate deliveryMode if provided
    if (deliveryMode && !['email', 'link'].includes(deliveryMode)) {
      const legacyDecision = false
      const canonicalDecision = shouldStartSignatureWorkflow({
        actor_id: user.id,
        payload: {
          documentUrl,
          documentHash,
          originalFilename,
          documentEntityId,
          signatureType,
          signers,
          forensicConfig,
          deliveryMode
        }
      })

      try {
        await supabase.from('shadow_decision_logs').insert({
          decision_code: 'D13_START_SIGNATURE_WORKFLOW',
          workflow_id: null,
          signer_id: null,
          legacy_decision: legacyDecision,
          canonical_decision: canonicalDecision,
          context: {
            operation: 'start-signature-workflow',
            phase: 'PASO_2_SHADOW_MODE_D13',
            reason: 'invalid_delivery_mode',
            signers_count: signers.length,
            delivery_mode: deliveryMode
          }
        })
      } catch (logError) {
        console.warn('shadow log insert failed (D13)', logError)
      }

      return jsonResponse({ error: 'Invalid deliveryMode. Must be "email" or "link"' }, 400)
    }

    const legacyDecision = true
    const canonicalDecision = shouldStartSignatureWorkflow({
      actor_id: user.id,
      payload: {
        documentUrl,
        documentHash,
        originalFilename,
        documentEntityId,
        signers,
        forensicConfig,
        deliveryMode,
        signatureType
      }
    })

    try {
      await supabase.from('shadow_decision_logs').insert({
        decision_code: 'D13_START_SIGNATURE_WORKFLOW',
        workflow_id: null,
        signer_id: null,
        legacy_decision: legacyDecision,
        canonical_decision: canonicalDecision,
        context: {
          operation: 'start-signature-workflow',
          phase: 'PASO_2_SHADOW_MODE_D13',
          signers_count: signers.length,
          delivery_mode: deliveryMode ?? 'email',
          has_document_entity_id: Boolean(documentEntityId)
        }
      })
    } catch (logError) {
      console.warn('shadow log insert failed (D13)', logError)
    }

    const documentPath = extractStoragePath(documentUrl)

    const workflowPayload = {
      owner_id: user.id,
      original_filename: originalFilename,
      original_file_url: documentUrl,
      document_path: documentPath ?? null,
      document_hash: documentHash,
      status: 'active',
      forensic_config: forensicConfig,
      delivery_mode: deliveryMode, // 'email' or 'link' - immutable after creation
      ...(signatureType ? { signature_type: signatureType } : {}),
      ...(documentEntityId ? { document_entity_id: documentEntityId } : {})
    }

    const { data: workflow, error: workflowError } = await supabase
      .from('signature_workflows')
      .insert(workflowPayload)
      .select()
      .single()

    if (workflowError || !workflow) {
      return jsonResponse({ error: 'Failed to create workflow', details: workflowError?.message }, 500)
    }

    const { data: version, error: versionError } = await supabase
      .from('workflow_versions')
      .insert({
        workflow_id: workflow.id,
        version_number: 1,
        document_url: documentUrl,
        document_hash: documentHash,
        change_reason: 'initial',
        status: 'active'
      })
      .select()
      .single()

    if (versionError || !version) {
      return jsonResponse({ error: 'Failed to create workflow version', details: versionError?.message }, 500)
    }

    const cleanupWorkflow = async () => {
      try { await supabase.from('workflow_signers').delete().eq('workflow_id', workflow.id) } catch {}
      try { await supabase.from('workflow_versions').delete().eq('workflow_id', workflow.id) } catch {}
      try { await supabase.from('signature_workflows').delete().eq('id', workflow.id) } catch {}
    }

    const signersToInsert = []
    const accessTokens: Record<string, { token: string, tokenHash: string }> = {}
    const tokenLifetimeDays = 7

    for (const signer of signers) {
      const token = await generateSecretToken()
      const tokenHash = await createTokenHash(token)
      const { ciphertext, nonce } = await encryptToken(token)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + tokenLifetimeDays)

      const quickAccess = signer.quickAccess ?? false
      const requireLogin = quickAccess ? false : (signer.requireLogin ?? true)
      const requireNda = quickAccess ? false : (signer.requireNda ?? true)

      const signerRecord = {
        workflow_id: workflow.id,
        signing_order: signer.signingOrder,
        email: signer.email,
        name: signer.name || null,
        require_login: requireLogin,
        require_nda: requireNda,
        quick_access: quickAccess,
        // Status will be promoted to ready_to_sign only after batch binding succeeds.
        status: 'invited',
        access_token_hash: tokenHash,
        access_token_ciphertext: ciphertext,
        access_token_nonce: nonce,
        token_expires_at: expiresAt.toISOString()
      }

      signersToInsert.push(signerRecord)
      accessTokens[signer.email] = { token, tokenHash }
    }

    // HYPOTHESIS DEBUGGING: Log the exact payload before the insert.
    console.log('[DEBUG] signersToInsert payload:', JSON.stringify(signersToInsert, null, 2));

    const { data: insertedSigners, error: signersError } = await supabase
      .from('workflow_signers')
      .insert(signersToInsert)
      .select('id, email, status, signing_order')

    if (signersError) {
      // HYPOTHESIS DEBUGGING: Log insert failure.
      console.error('[DEBUG] Failed to insert signers.', signersError);
      return jsonResponse({ error: 'Failed to create signers', details: signersError?.message }, 500)
    }

    // HYPOTHESIS DEBUGGING: Log insert success.
    console.log(`[DEBUG] Successfully inserted ${insertedSigners?.length || 0} signers.`);
    
    // ... (Canonical event logging remains the same)

    const appUrl = Deno.env.get('APP_URL') || 'https://app.ecosign.app'

    // P1.3 — Bind workflow_fields (batch_id + assigned_to email) to batches.assigned_signer_id
    // and enforce: each signer must have >= 1 assigned batch before we allow signing.
    if (!workflow.document_entity_id) {
      await cleanupWorkflow()
      return jsonResponse({
        error: 'missing_document_entity_id',
        message: 'No se pudo iniciar el workflow sin document_entity_id.'
      }, 409)
    }

    const { data: wfFields, error: wfFieldsErr } = await supabase
      .from('workflow_fields')
      .select('batch_id, assigned_to')
      .eq('document_entity_id', workflow.document_entity_id)

    if (wfFieldsErr) {
      console.error('Failed to fetch workflow_fields for binding', wfFieldsErr)
      await cleanupWorkflow()
      return jsonResponse({ error: 'failed_to_bind_fields', details: wfFieldsErr.message }, 500)
    }

    const batchToEmail = new Map<string, string>()
    const unassignedBatchIds = new Set<string>()

    for (const row of (wfFields || []) as any[]) {
      const bid = row.batch_id as string | null
      if (!bid) continue
      const email = (row.assigned_to as string | null)?.trim().toLowerCase() || null
      if (!email) {
        unassignedBatchIds.add(bid)
        continue
      }
      const existing = batchToEmail.get(bid)
      if (existing && existing !== email) {
        await cleanupWorkflow()
        return jsonResponse({
          error: 'inconsistent_batch_assignment',
          message: `Batch ${bid} tiene assigned_to inconsistente.`
        }, 409)
      }
      batchToEmail.set(bid, email)
    }

    if (unassignedBatchIds.size > 0) {
      await cleanupWorkflow()
      return jsonResponse({
        error: 'missing_signature_batch',
        message: 'Hay batches sin asignar a un firmante.',
        unassigned_batch_ids: Array.from(unassignedBatchIds)
      }, 409)
    }

    const signerByEmail = new Map<string, any>()
    for (const s of insertedSigners || []) {
      const email = (s.email as string).trim().toLowerCase()
      signerByEmail.set(email, s)
    }

    const batchUpdates: { id: string; document_entity_id: string; assigned_signer_id: string }[] = []
    const unknownEmails = new Set<string>()
    for (const [bid, email] of batchToEmail.entries()) {
      const signer = signerByEmail.get(email)
      if (!signer) {
        unknownEmails.add(email)
        continue
      }
      // Upsert must include document_entity_id in case the batches row does not exist yet.
      batchUpdates.push({
        id: bid,
        document_entity_id: workflow.document_entity_id,
        assigned_signer_id: signer.id
      })
    }

    if (unknownEmails.size > 0) {
      await cleanupWorkflow()
      return jsonResponse({
        error: 'missing_signature_batch',
        message: 'Hay batches asignados a emails que no existen en la lista de firmantes.',
        unknown_emails: Array.from(unknownEmails)
      }, 409)
    }

    if (batchUpdates.length === 0) {
      await cleanupWorkflow()
      return jsonResponse({
        error: 'missing_signature_batch',
        message: 'No hay batches asignados a firmantes.'
      }, 409)
    }

    const { error: batchUpdErr } = await supabase
      .from('batches')
      .upsert(batchUpdates, { onConflict: 'id' })

    if (batchUpdErr) {
      console.error('Failed to update batch assignments', batchUpdErr)
      await cleanupWorkflow()
      return jsonResponse({ error: 'failed_to_bind_fields', details: batchUpdErr.message }, 500)
    }

    // Canonical assignment: persist signer UUID on workflow_fields for hashing.
    const fieldAssignmentResults = await Promise.all(
      batchUpdates.map((b) =>
        supabase
          .from('workflow_fields')
          .update({ assigned_signer_id: b.assigned_signer_id })
          .eq('document_entity_id', b.document_entity_id)
          .eq('batch_id', b.id)
      )
    )

    const fieldAssignmentError = fieldAssignmentResults.find((r) => r.error)?.error
    if (fieldAssignmentError) {
      console.error('Failed to update workflow_fields assigned_signer_id', fieldAssignmentError)
      await cleanupWorkflow()
      return jsonResponse({ error: 'failed_to_bind_fields', details: fieldAssignmentError.message }, 500)
    }

    // Canonical: compute fields_schema_hash after assignment is resolved.
    try {
      const { data: schemaFields, error: schemaErr } = await supabase
        .from('workflow_fields')
        .select('external_field_id, field_type, position, required, assigned_signer_id, metadata')
        .eq('document_entity_id', workflow.document_entity_id)

      if (schemaErr) {
        console.warn('fields_schema_hash: failed to load workflow_fields', schemaErr)
      } else {
        const schema = buildCanonicalFieldSchemaV1({
          workflow_id: workflow.id,
          document_entity_id: workflow.document_entity_id,
          fields: (schemaFields || []) as any
        })
        const schemaHash = await hashCanonicalFieldSchemaV1(schema)
        const committedAt = new Date().toISOString()

        await supabase
          .from('signature_workflows')
          .update({
            fields_schema_hash: schemaHash,
            fields_schema_version: 1,
            fields_schema_committed_at: committedAt
          })
          .eq('id', workflow.id)

        await appendEvent(
          supabase as any,
          {
            event_type: 'fields.schema.committed',
            workflow_id: workflow.id,
            signer_id: null,
            payload: {
              document_entity_id: workflow.document_entity_id,
              fields_schema_hash: schemaHash,
              schema_version: 1,
              fields_count: schema.fields.length
            }
          },
          'start-signature-workflow'
        )
      }
    } catch (schemaHashErr) {
      console.warn('fields_schema_hash: compute failed (best-effort)', schemaHashErr)
    }

    // Enforce: each signer must have >= 1 batch.
    const signerIdsWithBatch = new Set(batchUpdates.map((b) => b.assigned_signer_id))
    const missingSigners = (insertedSigners || []).filter((s: any) => !signerIdsWithBatch.has(s.id))
    if (missingSigners.length > 0) {
      await cleanupWorkflow()
      return jsonResponse({
        error: 'missing_signature_batch',
        message: 'Faltan batches asignados para algunos firmantes.',
        missing_signers: missingSigners.map((s: any) => ({ id: s.id, email: s.email }))
      }, 409)
    }

    // Promote first signer to ready_to_sign only after binding succeeds.
    const first = (insertedSigners || []).find((s: any) => s.signing_order === 1)
    if (first) {
      const { error: promoteErr } = await supabase
        .from('workflow_signers')
        .update({ status: 'ready_to_sign' })
        .eq('id', first.id)
      if (promoteErr) {
        console.error('Failed to promote first signer to ready_to_sign', promoteErr)
        await cleanupWorkflow()
        return jsonResponse({ error: 'failed_to_start', details: promoteErr.message }, 500)
      }
    }

    // Create notification only for the first signer (sequential flow)
    const notifications = []
    if (deliveryMode === 'email') {
      for (const insertedSigner of insertedSigners) {
        if (insertedSigner.signing_order !== 1) continue

        const token = accessTokens[insertedSigner.email]?.token
        if (!token) continue

        const signLink = `${appUrl}/sign/${token}`
        const expiresDate = new Date()
        expiresDate.setDate(expiresDate.getDate() + tokenLifetimeDays)
        const displayName = insertedSigner.email.split('@')[0]

        notifications.push({
          workflow_id: workflow.id,
          recipient_email: insertedSigner.email,
          recipient_type: 'signer',
          signer_id: insertedSigner.id,
          notification_type: 'your_turn_to_sign',
          subject: `Tenés un documento para firmar — ${originalFilename}`,
          body_html: `<html><body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #0f172a;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);">
              <p style="margin:0 0 12px;color:#0f172a;">Hola ${displayName},</p>
              <p style="margin:0 0 12px;color:#334155;">Te enviaron un documento para firmar:</p>
              <p style="margin:0 0 16px;font-weight:600;color:#0f172a;">${originalFilename}</p>
              <p style="margin:0 0 16px;color:#334155;">EcoSign certifica tu firma con trazabilidad completa y te entrega una copia segura, para que siempre tengas tu propia evidencia.</p>
              <p style="margin:16px 0;">
                <a href="${signLink}" style="display:inline-block;padding:14px 22px;background:#0ea5e9;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;">Ver y Firmar Documento</a>
              </p>
              <p style="margin:0 0 12px;color:#64748b;font-size:12px;">Link válido hasta: ${expiresDate.toLocaleDateString('es-AR')}</p>
              <p style="margin:16px 0 0;color:#0f172a;font-weight:600;">EcoSign. Transparencia que acompaña.</p>
              <p style="margin:8px 0 0;color:#94a3b8;font-size:12px;">Este enlace es personal e intransferible. Todas las acciones quedan registradas por seguridad.</p>
            </div>
          </body></html>`,
          delivery_status: 'pending'
        })
      }
    }

    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from('workflow_notifications')
        .insert(notifications)

      if (notifError) {
        console.error('Failed to create notifications:', notifError)
        // Don't fail the workflow creation, just log the error
      } else {
        console.log(`✅ Created ${notifications.length} notifications`)
      }
    }

    await triggerEmailDelivery(supabase)

    const firstSigner = signers.find(s => s.signingOrder === 1)
    const firstSignerToken = firstSigner ? accessTokens[firstSigner.email]?.token : null
    const signUrl = firstSignerToken ? `${appUrl}/sign/${firstSignerToken}` : null
    
    let debugInfo = {}
    if (Deno.env.get('ENV') === 'local') {
        debugInfo = {
            accessTokens: Object.keys(accessTokens).reduce((acc, email) => {
                const { token, tokenHash } = accessTokens[email]
                acc[email] = {
                    token,
                    tokenHash,
                    url: `${appUrl}/sign/${token}`
                }
                return acc
            }, {} as Record<string, { token: string, tokenHash: string, url: string }>)
        }
    }

    const notificationMessage = deliveryMode === 'email'
      ? `Workflow started. ${signers.length} signer(s) added. First signer notified by email.`
      : `Workflow started. ${signers.length} signer(s) added. Share the link manually (no email sent).`

    return jsonResponse({
      success: true,
      workflowId: workflow.id,
      versionId: version.id,
      status: workflow.status,
      deliveryMode,
      signersCount: signers.length,
      firstSignerUrl: signUrl,
      message: notificationMessage,
      _debug: debugInfo
    })

  } catch (error: any) {
    console.error('Error in start-signature-workflow:', error)
    return jsonResponse({ error: error?.message, stack: error?.stack }, 500)
  }
}))
