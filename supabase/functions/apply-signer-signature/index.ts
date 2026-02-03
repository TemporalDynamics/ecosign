import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { captureAndApplySignature } from '../_shared/signatureCapture.ts'
import { shouldApplySignerSignature } from '../../../packages/authority/src/decisions/applySignerSignature.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { appendEvent } from '../_shared/eventHelper.ts'
import { decryptToken } from '../_shared/cryptoHelper.ts'

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

serve(async (req) => {
  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined)

  const json = (data: unknown, status = 200) =>
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

  if (Deno.env.get('FASE') !== '1') {
    return json({ error: 'disabled', message: 'Function disabled (FASE != 1)' }, 503)
  }

  if (!isAllowed) {
    return json({ error: 'Origin not allowed' }, 403)
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json()
    const { signerId, accessToken, workflowId, witness_pdf_hash, applied_at, identity_level, signatureData, fieldValues } = body

    if (!signerId && !accessToken) {
      return json({ error: 'Missing signerId or accessToken' }, 400)
    }
    if (signerId && !workflowId) {
      return json({ error: 'Missing workflowId for signerId flow' }, 400)
    }

    // Resolve signer
    let signer: any = null

    if (signerId) {
      console.log('apply-signer-signature: Looking for signerId:', signerId)

      const { data, error } = await supabase
        .from('workflow_signers')
        .select(`
          id,
          workflow_id,
          email,
          name,
          signing_order,
          status,
          access_token_hash,
          token_expires_at,
          token_revoked_at,
          signer_otps!inner(verified_at)
        `)
        .eq('id', signerId)
        .single()

      console.log('apply-signer-signature: Query result:', { data, error })

      if (error || !data) {
        console.error('apply-signer-signature: Signer not found', { signerId, error })
        return json({ error: 'Signer not found' }, 404)
      }

      // Map the joined data to match expected structure
      // Note: signer_otps is returned as an array due to the join
      const otpData = Array.isArray(data.signer_otps) ? data.signer_otps[0] : data.signer_otps
      signer = {
        ...data,
        otp_verified: otpData?.verified_at != null,
        signer_otps: otpData
      }
    } else if (accessToken) {
      // accessToken may be raw or already hashed
      const tokenHash = /^[a-f0-9]{64}$/i.test(accessToken) ? accessToken : await (async () => {
        const enc = new TextEncoder()
        const buf = enc.encode(accessToken)
        const hash = await crypto.subtle.digest('SHA-256', buf)
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
      })()

      console.log('apply-signer-signature: Looking for accessToken (hash):', tokenHash.substring(0, 10) + '...')

      const { data, error } = await supabase
        .from('workflow_signers')
        .select(`
          id,
          workflow_id,
          email,
          name,
          signing_order,
          status,
          access_token_hash,
          token_expires_at,
          token_revoked_at,
          signer_otps!inner(verified_at)
        `)
        .eq('access_token_hash', tokenHash)
        .single()

      console.log('apply-signer-signature: Query result (token):', { data, error })

      if (error || !data) {
        console.error('apply-signer-signature: Signer not found for token', { tokenHash: tokenHash.substring(0, 10) + '...', error })
        return json({ error: 'Signer not found for token' }, 404)
      }

      // Map the joined data to match expected structure
      // Note: signer_otps is returned as an array due to the join
      const otpData = Array.isArray(data.signer_otps) ? data.signer_otps[0] : data.signer_otps
      signer = {
        ...data,
        otp_verified: otpData?.verified_at != null,
        signer_otps: otpData
      }
    }

    const workflowIdMismatch = Boolean(workflowId && signer.workflow_id !== workflowId)
    if (workflowIdMismatch) {
      console.error('apply-signer-signature: Workflow mismatch', {
        signerId: signer.id,
        signerWorkflowId: signer.workflow_id,
        providedWorkflowId: workflowId
      })
    }

    // Fetch workflow early for canonical decision and batching
    const { data: workflow, error: wfError } = await supabase
      .from('signature_workflows')
      .select('id, document_entity_id, status, delivery_mode, original_filename')
      .eq('id', signer.workflow_id)
      .single()

    // GATE: Check if token has been revoked
    const tokenRevoked = Boolean(signer.token_revoked_at)
    if (tokenRevoked) {
      console.error('apply-signer-signature: Token revoked', {
        signerId: signer.id,
        revokedAt: signer.token_revoked_at
      })
    }

    // GATE: Check if token has expired
    const tokenExpired = Boolean(
      signer.token_expires_at && new Date(signer.token_expires_at) < new Date()
    )
    if (tokenExpired) {
      console.error('apply-signer-signature: Token expired', {
        signerId: signer.id,
        expiredAt: signer.token_expires_at
      })
    }

    // GATE: Check if signer is in a terminal state
    const terminalStates = ['signed', 'cancelled', 'expired']
    const signerTerminal = terminalStates.includes(signer.status)
    if (signerTerminal) {
      console.error('apply-signer-signature: Signer in terminal state', {
        signerId: signer.id,
        status: signer.status
      })
    }

    // Validate OTP confirmed
    console.log('apply-signer-signature: Validating OTP', {
      signerId: signer.id,
      otpVerified: signer.otp_verified,
      otpVerifiedAt: signer.signer_otps?.verified_at
    })

    const otpVerified = Boolean(signer.otp_verified)
    if (!otpVerified) {
      console.error('apply-signer-signature: OTP not verified', {
        signerId: signer.id,
        otpVerifiedAt: signer.signer_otps?.verified_at
      })
    }

    const legacyDecision = Boolean(
      (signerId || accessToken) &&
      (!signerId || workflowId) &&
      signer &&
      !workflowIdMismatch &&
      workflow &&
      !tokenRevoked &&
      !tokenExpired &&
      !signerTerminal &&
      otpVerified
    )

    const canonicalDecision = shouldApplySignerSignature({
      signer: signer ? {
        id: signer.id,
        workflow_id: signer.workflow_id,
        status: signer.status,
        token_expires_at: signer.token_expires_at ?? null,
        token_revoked_at: signer.token_revoked_at ?? null,
        otp_verified: otpVerified
      } : null,
      workflow: workflow ? {
        id: workflow.id,
        document_entity_id: workflow.document_entity_id ?? null
      } : null,
      payload: {
        signerId,
        accessToken,
        workflowId
      }
    })

    const logWorkflowId = workflow?.id ?? (typeof workflowId === 'string' ? workflowId : null)
    const logSignerId = signer?.id ?? (typeof signerId === 'string' ? signerId : null)
    const isUuid = (value: string | null) => Boolean(value && /^[0-9a-fA-F-]{36}$/.test(value))

    if (isUuid(logWorkflowId) || isUuid(logSignerId)) {
      try {
        await supabase.from('shadow_decision_logs').insert({
          decision_code: 'D12_APPLY_SIGNER_SIGNATURE',
          workflow_id: isUuid(logWorkflowId) ? logWorkflowId : null,
          signer_id: isUuid(logSignerId) ? logSignerId : null,
          legacy_decision: legacyDecision,
          canonical_decision: canonicalDecision,
          context: {
            operation: 'apply-signer-signature',
            workflow_id: signer?.workflow_id ?? null,
            signer_status: signer?.status ?? null,
            workflow_status: workflow?.status ?? null,
            token_revoked_at: signer?.token_revoked_at ?? null,
            token_expires_at: signer?.token_expires_at ?? null,
            otp_verified: otpVerified,
            workflow_id_mismatch: workflowIdMismatch,
            phase: 'PASO_2_SHADOW_MODE_D12'
          }
        })
      } catch (logError) {
        console.warn('shadow log insert failed (D12)', logError)
      }
    }

    if (workflowIdMismatch) {
      return json({ error: 'Signer does not belong to this workflow' }, 403)
    }

    if (tokenRevoked) {
      return json({ error: 'Token has been revoked' }, 403)
    }

    if (tokenExpired) {
      return json({ error: 'Token has expired' }, 403)
    }

    if (signerTerminal) {
      return json({ error: `Cannot sign: signer status is ${signer.status}` }, 403)
    }

    // Enforce sequential order: only the signer whose turn it is may sign.
    if (signer.status !== 'ready_to_sign') {
      return json({ error: `Cannot sign: signer is not ready_to_sign (status=${signer.status})` }, 403)
    }

    if (!otpVerified) {
      return json({ error: 'OTP not verified for signer' }, 403)
    }

    if (wfError || !workflow) {
      console.error('apply-signer-signature: Workflow not found', wfError)
      return json({ error: 'Workflow not found' }, 404)
    }

    if (!workflow.document_entity_id) {
      // Contract: signature flow must be bound to a document_entity_id.
      // Without it we cannot resolve signer batches or record signature instances.
      console.error('apply-signer-signature: Missing document_entity_id on workflow', {
        workflowId: workflow.id,
        signerId: signer.id
      })
      return json(
        {
          error: 'missing_document_entity_id',
          message: 'No se pudo aplicar la firma: el workflow no está asociado a un document_entity_id.'
        },
        409
      )
    }

    // Get all batches assigned to this signer
    const { data: batches, error: batchError } = await supabase
      .from('batches')
      .select('id')
      .eq('document_entity_id', workflow.document_entity_id)
      .eq('assigned_signer_id', signer.id)

    if (batchError) {
      console.error('apply-signer-signature: Error fetching batches', batchError)
      return json({ error: 'Could not fetch batches' }, 500)
    }

    if (!batches || batches.length === 0) {
      console.warn('apply-signer-signature: No batches assigned to signer', { signerId: signer.id })
      // Canonical contract: a signer may only sign if at least one batch is assigned.
      // This is not a server error; it is an invalid state for signing.
      return json(
        {
          error: 'missing_signature_batch',
          message: 'Faltan campos asignados a este firmante. Pedile al creador que asigne los espacios de firma.'
        },
        409
      )
    } else {
      // Persist non-signature field values for this signer (required before signing)
      try {
        const batchIds = batches.map((b: any) => b.id).filter(Boolean)
        const values = (fieldValues && typeof fieldValues === 'object') ? fieldValues as Record<string, string> : {}

        const { data: wfFields, error: wfFieldsErr } = await supabase
          .from('workflow_fields')
          .select('id, field_type, required')
          .in('batch_id', batchIds)

        if (wfFieldsErr) {
          console.warn('apply-signer-signature: failed to load workflow_fields for value persistence', wfFieldsErr)
        } else {
          const allowed = new Map((wfFields ?? []).map((f: any) => [f.id, f]))
          const missingRequired: string[] = []
          for (const f of (wfFields ?? [])) {
            if (!f.required) continue
            if (f.field_type === 'signature') continue
            const v = values[f.id]
            if (!v || String(v).trim().length === 0) {
              missingRequired.push(f.id)
            }
          }

          if (missingRequired.length > 0) {
            return json(
              {
                error: 'missing_required_fields',
                message: 'Completá los campos requeridos antes de firmar.',
                field_ids: missingRequired,
              },
              409,
            )
          }

          for (const [fieldId, value] of Object.entries(values)) {
            const f = allowed.get(fieldId)
            if (!f) continue
            if (f.field_type === 'signature') continue
            await supabase
              .from('workflow_fields')
              .update({ value: String(value ?? '') })
              .eq('id', fieldId)
          }
        }
      } catch (fieldErr) {
        console.warn('apply-signer-signature: field value persistence failed (best-effort)', fieldErr)
      }

      // Apply signature to all batches
      for (const batch of batches) {
        try {
          await captureAndApplySignature(supabase as any, {
            workflow_id: signer.workflow_id,
            document_entity_id: workflow.document_entity_id,
            batch_id: batch.id,
            signer_id: signer.id,
            signature_payload: signatureData || {}
          })
        } catch (captureError: any) {
          console.error('apply-signer-signature: Error capturing signature for batch', {
            batchId: batch.id,
            error: captureError.message
          })
          return json({ error: 'Could not apply signature to batch', details: captureError.message }, 500)
        }
      }
    }

    // Insert canonical event: use existing event_type allowed by DB
    const eventPayload = {
      witness_pdf_hash: witness_pdf_hash || null,
      applied_at: applied_at || new Date().toISOString(),
      identity_level: identity_level || null
    }

    const { error: insertErr } = await supabase
      .from('workflow_events')
      .insert({
        workflow_id: signer.workflow_id,
        signer_id: signer.id,
        event_type: 'signer.signed',
        payload: eventPayload
      })

    if (insertErr) {
      console.error('insert workflow_event failed', insertErr)
      return json({ error: 'Could not insert event', details: insertErr.message }, 500)
    }

    // Probatario (document_entities.events[]) - best effort; must not block.
    try {
      await appendEvent(
        supabase as any,
        workflow.document_entity_id,
        {
          kind: 'signature.completed',
          at: applied_at || new Date().toISOString(),
          signer: {
            id: signer.id,
            email: signer.email ?? null,
            name: signer.name ?? null,
            order: signer.signing_order ?? null
          },
          workflow: {
            id: signer.workflow_id,
            document_entity_id: workflow.document_entity_id
          },
          evidence: {
            witness_pdf_hash: witness_pdf_hash || null,
            identity_level: identity_level || null,
            batches_signed: batches.map((b: any) => b.id)
          }
        },
        'apply-signer-signature'
      )
    } catch (eventErr) {
      console.warn('apply-signer-signature: signature.completed append failed (best-effort)', eventErr)
    }

    // Update signer status and persist signature data
    const { error: signerUpdErr } = await supabase
      .from('workflow_signers')
      .update({ status: 'signed', signed_at: new Date().toISOString(), signature_data: signatureData || null })
      .eq('id', signer.id)

    if (signerUpdErr) {
      console.error('update signer failed', signerUpdErr)
      return json({ error: 'Could not update signer', details: signerUpdErr.message }, 500)
    }

    // NOTE: do not update signature_workflows.status here.
    // The allowed states are enforced by DB constraint and the sequential flow is advanced via advance_workflow().

    // Advance sequential flow (best-effort): promote next signer to ready_to_sign.
    // This MUST NOT block the successful signature record.
    try {
      await supabase.rpc('advance_workflow', { p_workflow_id: signer.workflow_id })
    } catch (advanceErr) {
      console.warn('advance_workflow failed', advanceErr)
    }

    // Create next signer notification (idempotent) if delivery_mode=email.
    try {
      const deliveryMode = (workflow as any)?.delivery_mode || 'email'
      if (deliveryMode === 'email') {
        const { data: nextSigner } = await supabase
          .from('workflow_signers')
          .select('id, email, name, signing_order, access_token_hash, access_token_ciphertext, access_token_nonce, status')
          .eq('workflow_id', signer.workflow_id)
          .eq('status', 'ready_to_sign')
          .single()

        if (nextSigner) {
          const { data: existingNotif } = await supabase
            .from('workflow_notifications')
            .select('id')
            .eq('workflow_id', signer.workflow_id)
            .eq('signer_id', nextSigner.id)
            .eq('notification_type', 'your_turn_to_sign')
            .limit(1)
            .maybeSingle()

          if (!existingNotif) {
            const appUrl = Deno.env.get('APP_URL') || 'https://app.ecosign.app'
            let tokenOrHash: string | null = nextSigner.access_token_hash
            if (nextSigner.access_token_ciphertext && nextSigner.access_token_nonce) {
              try {
                tokenOrHash = await decryptToken({
                  ciphertext: nextSigner.access_token_ciphertext,
                  nonce: nextSigner.access_token_nonce,
                })
              } catch (err) {
                console.warn('apply-signer-signature: failed to decrypt next signer token; falling back to hash', err)
              }
            }
            const nextSignerUrl = tokenOrHash ? `${appUrl}/sign/${tokenOrHash}` : null
            const originalFilename = (workflow as any)?.original_filename || 'Documento'
            const displayName = (nextSigner.name || nextSigner.email || '').split('@')[0]

            if (nextSignerUrl) {
              await supabase
                .from('workflow_notifications')
                .insert({
                  workflow_id: signer.workflow_id,
                  recipient_email: nextSigner.email,
                  recipient_type: 'signer',
                  signer_id: nextSigner.id,
                  notification_type: 'your_turn_to_sign',
                  subject: `Tenés un documento para firmar — ${originalFilename}`,
                  body_html: `<html><body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #0f172a;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);">
    <p style="margin:0 0 12px;color:#0f172a;">Hola ${displayName},</p>
    <p style="margin:0 0 12px;color:#334155;">Es tu turno de firmar:</p>
    <p style="margin:0 0 16px;font-weight:600;color:#0f172a;">${originalFilename}</p>
    <p style="margin:16px 0;">
      <a href="${nextSignerUrl}" style="display:inline-block;padding:14px 22px;background:#0ea5e9;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;">Ver y Firmar Documento</a>
    </p>
    <p style="margin:16px 0 0;color:#0f172a;font-weight:600;">EcoSign. Transparencia que acompaña.</p>
    <p style="margin:8px 0 0;color:#94a3b8;font-size:12px;">Este enlace es personal e intransferible.</p>
  </div>
</body></html>`,
                  delivery_status: 'pending'
                })
            } else {
              console.warn('apply-signer-signature: next signer has no access_token_hash; skipping notification', {
                workflowId: signer.workflow_id,
                nextSignerId: nextSigner.id
              })
            }
          }
        }
      }
    } catch (notifErr) {
      console.warn('apply-signer-signature: next signer notification failed (best-effort)', notifErr)
    }

    // Trigger email delivery for any newly created pending notifications (best-effort).
    await triggerEmailDelivery(supabase as any)

    return json({ success: true })

  } catch (err: any) {
    console.error('apply-signer-signature error', err)
    return json({ error: err?.message || 'Unexpected error' }, 500)
  }
})
