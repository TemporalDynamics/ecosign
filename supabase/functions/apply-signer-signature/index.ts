import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { captureAndApplySignature } from '../_shared/signatureCapture.ts'
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'
import { shouldApplySignerSignature } from '../../../packages/authority/src/decisions/applySignerSignature.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { appendEvent } from '../_shared/eventHelper.ts'
import { appendEvent as appendCanonicalEvent } from '../_shared/canonicalEventHelper.ts'
import { canonicalize, sha256Hex } from '../_shared/canonicalHash.ts'
import { attemptRekorProof } from '../_shared/rekorProof.ts'
import { decryptToken } from '../_shared/cryptoHelper.ts'

async function triggerEmailDelivery(supabase: ReturnType<typeof createClient>) {
  try {
    const cronSecret = Deno.env.get('CRON_SECRET')
    if (!cronSecret) {
      const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      if (!serviceRole) {
        console.warn('send-pending-emails skipped: missing CRON_SECRET and service role')
        return
      }
      await supabase.functions.invoke('send-pending-emails', {
        headers: { Authorization: `Bearer ${serviceRole}` }
      })
      return
    }
    await supabase.functions.invoke('send-pending-emails', {
      headers: { 'x-cron-secret': cronSecret }
    })
  } catch (error) {
    console.warn('send-pending-emails invoke failed', error)
  }
}

async function loadWorkflowPdf(
  supabase: ReturnType<typeof createClient>,
  documentPath: string
): Promise<Uint8Array> {
  if (/^https?:\/\//i.test(documentPath)) {
    const resp = await fetch(documentPath)
    if (!resp.ok) throw new Error('No se pudo descargar el documento del workflow')
    const ab = await resp.arrayBuffer()
    return new Uint8Array(ab)
  }

  const { data: fileResp, error: fileErr } = await supabase.storage
    .from('user-documents')
    .download(documentPath)

  if (fileErr || !fileResp) {
    throw new Error(`No se pudo descargar el documento (${fileErr?.message || 'storage error'})`)
  }

  const ab = await fileResp.arrayBuffer()
  return new Uint8Array(ab)
}

async function uploadWorkflowPdf(
  supabase: ReturnType<typeof createClient>,
  documentPath: string,
  pdfBytes: Uint8Array
): Promise<void> {
  const { error: uploadErr } = await supabase.storage
    .from('user-documents')
    .upload(documentPath, pdfBytes, {
      contentType: 'application/pdf',
      upsert: true
    })

  if (uploadErr) {
    throw new Error(`No se pudo subir el PDF firmado: ${uploadErr.message}`)
  }
}

function decodeDataUrl(dataUrl: string): { bytes: Uint8Array; isPng: boolean } {
  const [meta, b64] = dataUrl.split(',')
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  const isPng = Boolean(meta && meta.includes('png')) || (bytes[0] === 0x89 && bytes[1] === 0x50)
  return { bytes, isPng }
}

function normalizeText(value: string): string {
  return value
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeDate(value: string): string {
  const raw = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toISOString().slice(0, 10);
}

async function hashSignatureCapture(signatureData: any): Promise<string | null> {
  if (!signatureData) return null;
  if (typeof signatureData === 'string') {
    return sha256Hex(signatureData);
  }
  if (typeof signatureData?.dataUrl === 'string') {
    return sha256Hex(signatureData.dataUrl);
  }
  return sha256Hex(canonicalize(signatureData));
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function attemptTsaProof(params: {
  witness_hash: string;
  timeout_ms: number;
}): Promise<{ kind: string; status: string; provider: string; ref: string | null; attempted_at: string; token_b64?: string; witness_hash?: string }> {
  const attemptedAt = new Date().toISOString();
  if (!params.witness_hash) {
    return { kind: 'tsa', status: 'failed', provider: 'freetsa', ref: null, attempted_at: attemptedAt };
  }
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !serviceRole) {
    return { kind: 'tsa', status: 'failed', provider: 'freetsa', ref: null, attempted_at: attemptedAt };
  }

  try {
    const url = `${supabaseUrl}/functions/v1/legal-timestamp`;
    const resp = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceRole,
          Authorization: `Bearer ${serviceRole}`,
        },
        body: JSON.stringify({ hash_hex: params.witness_hash }),
      },
      params.timeout_ms
    );

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data?.success || !data?.token) {
      return {
        kind: 'tsa',
        status: resp.ok ? 'failed' : 'timeout',
        provider: data?.tsa_url || 'freetsa',
        ref: null,
        attempted_at: attemptedAt,
      };
    }

    const tokenB64 = String(data.token);
    const tokenHash = await sha256Hex(tokenB64);
    return {
      kind: 'tsa',
      status: 'confirmed',
      provider: data?.tsa_url || 'freetsa',
      ref: tokenHash,
      attempted_at: attemptedAt,
      token_b64: tokenB64,
      witness_hash: params.witness_hash,
    };
  } catch (_err) {
    return {
      kind: 'tsa',
      status: 'timeout',
      provider: 'freetsa',
      ref: null,
      attempted_at: attemptedAt,
      witness_hash: params.witness_hash
    };
  }
}


async function stampSignerOnPdf(params: {
  supabase: ReturnType<typeof createClient>
  documentPath: string
  signatureData: { dataUrl?: string }
  fields: Array<{
    id: string
    field_type: 'signature' | 'text' | 'date'
    value: string | null
    position: { page: number; x: number; y: number; width: number; height: number }
    apply_to_all_pages?: boolean | null
  }>
}): Promise<Uint8Array> {
  const { supabase, documentPath, signatureData, fields } = params
  const pdfBytes = await loadWorkflowPdf(supabase, documentPath)
  const pdfDoc = await PDFDocument.load(pdfBytes)

  const pages = pdfDoc.getPages()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let signatureImage: any = null
  const signatureUrl = signatureData?.dataUrl
  if (signatureUrl && typeof signatureUrl === 'string') {
    try {
      const { bytes, isPng } = decodeDataUrl(signatureUrl)
      signatureImage = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes)
    } catch (err) {
      console.warn('apply-signer-signature: failed to decode signature image', err)
    }
  }

  const drawOnPage = (pageIndex: number, field: any) => {
    const page = pages[pageIndex]
    if (!page) return
    const { width: pageW, height: pageH } = page.getSize()
    const pos = field.position
    if (!pos) return

    const w = pos.width * pageW
    const h = pos.height * pageH
    const x = pos.x * pageW
    const yTop = pos.y * pageH
    const y = pageH - yTop - h

    if (field.field_type === 'signature') {
      if (!signatureImage) return
      page.drawImage(signatureImage, { x, y, width: w, height: h })
      return
    }

    const value = typeof field.value === 'string' ? field.value.trim() : ''
    if (!value) return
    const padding = 6
    const fontSize = Math.max(10, Math.min(14, h - padding * 2))
    page.drawRectangle({
      x,
      y,
      width: w,
      height: h,
      color: rgb(1, 1, 1),
      opacity: 1
    })
    page.drawText(value, {
      x: x + padding,
      y: y + Math.max(padding, (h - fontSize) / 2),
      size: fontSize,
      font: field.field_type === 'date' ? boldFont : font,
      color: rgb(0.12, 0.12, 0.12),
      maxWidth: Math.max(0, w - padding * 2)
    })
  }

  for (const field of fields) {
    const basePage = Math.max(0, (field.position?.page ?? 1) - 1)
    if (field.apply_to_all_pages) {
      for (let i = 0; i < pages.length; i += 1) {
        drawOnPage(i, field)
      }
    } else {
      drawOnPage(Math.min(basePage, pages.length - 1), field)
    }
  }

  const stampedBytes = await pdfDoc.save()
  return new Uint8Array(stampedBytes)
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
    let witnessHashForEvent: string | null = witness_pdf_hash || null
    let signedPdfPath: string | null = null
    let signerStateHash: string | null = null
    let signatureCaptureHash: string | null = null
    let ecoSnapshotPath: string | null = null
    let ecoSnapshotUrl: string | null = null

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
          require_login,
          quick_access,
          signer_otps(verified_at)
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
          require_login,
          quick_access,
          signer_otps(verified_at)
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
      .select('id, owner_id, document_entity_id, status, delivery_mode, original_filename, document_path, document_hash, forensic_config, fields_schema_hash, fields_schema_version')
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

    // Validate OTP confirmed (unless quick_access or require_login=false)
    const otpRequired = !(signer.quick_access || signer.require_login === false)
    console.log('apply-signer-signature: Validating OTP', {
      signerId: signer.id,
      otpVerified: signer.otp_verified,
      otpVerifiedAt: signer.signer_otps?.verified_at,
      otpRequired
    })

    const otpVerified = Boolean(signer.otp_verified)
    if (otpRequired && !otpVerified) {
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
        otp_verified: otpRequired ? otpVerified : true,
        require_login: signer.require_login ?? null,
        quick_access: signer.quick_access ?? null
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
      const batchIds = batches.map((b: any) => b.id).filter(Boolean)
      // Persist non-signature field values for this signer (required before signing)
      try {
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

      // Stamp signer fields and signature onto the workflow PDF (required).
      if (!workflow.document_path) {
        return json(
          {
            error: 'missing_document_path',
            message: 'No se pudo estampar la firma: el workflow no tiene document_path.'
          },
          409
        )
      }

      const { data: signerFields, error: signerFieldsErr } = await supabase
        .from('workflow_fields')
        .select('id, field_type, value, position, apply_to_all_pages')
        .in('batch_id', batchIds)

      if (signerFieldsErr) {
        console.error('apply-signer-signature: failed to fetch signer fields for stamping', signerFieldsErr)
        return json({ error: 'Could not stamp fields', details: signerFieldsErr.message }, 500)
      }

      const stampedBytes = await stampSignerOnPdf({
        supabase,
        documentPath: workflow.document_path,
        signatureData: signatureData || {},
        fields: (signerFields ?? []) as any
      })

      // Always overwrite workflow.document_path so the next signer sees the latest witness PDF.
      await uploadWorkflowPdf(supabase, workflow.document_path, stampedBytes)

      const hashBuf = await crypto.subtle.digest('SHA-256', stampedBytes)
      const hashHex = Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')

      // Canonical witness hash for this act.
      witnessHashForEvent = hashHex

      // Also store a per-signer witness PDF (immutable path) for delivery + audit.
      signedPdfPath = `signed/${workflow.id}/${signer.id}/${hashHex}.pdf`
      try {
        await uploadWorkflowPdf(supabase, signedPdfPath, stampedBytes)
      } catch (signedUploadErr) {
        console.warn('apply-signer-signature: failed to upload signed witness PDF', signedUploadErr)
        signedPdfPath = null
      }

      // Update workflow hash so downstream consumers use the stamped PDF hash.
      const { error: wfHashErr } = await supabase
        .from('signature_workflows')
        .update({ document_hash: hashHex, updated_at: new Date().toISOString() })
        .eq('id', signer.workflow_id)

      if (wfHashErr) {
        console.warn('apply-signer-signature: failed to update workflow document_hash', wfHashErr)
      }

      // Update document_entities witness hash (canonical reference for TSA/anchors).
      if (workflow.document_entity_id) {
        try {
          const nowIso = new Date().toISOString()
          const { data: entity } = await supabase
            .from('document_entities')
            .select('witness_history')
            .eq('id', workflow.document_entity_id)
            .single()

          const history = Array.isArray((entity as any)?.witness_history)
            ? (entity as any).witness_history
            : []

          history.push({
            at: nowIso,
            hash: hashHex,
            source: 'signature_flow',
            workflow_id: signer.workflow_id,
            signer_id: signer.id
          })

          const { error: entityErr } = await supabase
            .from('document_entities')
            .update({
              witness_hash: hashHex,
              witness_current_hash: hashHex,
              witness_current_status: 'signed',
              witness_current_mime: 'application/pdf',
              witness_current_generated_at: nowIso,
              witness_current_storage_path: signedPdfPath || workflow.document_path,
              witness_history: history
            })
            .eq('id', workflow.document_entity_id)

          if (entityErr) {
            console.warn('apply-signer-signature: failed to update document_entities witness hash', entityErr)
          }
        } catch (entityUpdateErr) {
          console.warn('apply-signer-signature: witness hash update failed', entityUpdateErr)
        }
      }

      // Canonical signer_state_hash (best-effort, must not block)
      try {
        const { data: signerFieldsForHash, error: signerFieldsErr } = await supabase
          .from('workflow_fields')
          .select('external_field_id, field_type, value, assigned_signer_id')
          .in('batch_id', batchIds)
          .eq('assigned_signer_id', signer.id)

        if (signerFieldsErr) {
          console.warn('signer_state_hash: failed to load workflow_fields', signerFieldsErr)
        } else {
          const values = (signerFieldsForHash || [])
            .filter((f: any) => f?.external_field_id && f?.field_type !== 'signature')
            .map((f: any) => {
              const raw = typeof f.value === 'string' ? f.value : ''
              const normalized =
                f.field_type === 'date' ? normalizeDate(raw) : normalizeText(raw);
              return {
                field_id: f.external_field_id as string,
                value: normalized
              };
            })
            .sort((a: any, b: any) => a.field_id.localeCompare(b.field_id));

          signatureCaptureHash = await hashSignatureCapture(signatureData);
          const signerState = {
            version: 'signer_state.v1',
            fields_schema_hash: (workflow as any)?.fields_schema_hash ?? null,
            signer_id: signer.id,
            values,
            signature_capture_hash: signatureCaptureHash
          };

          signerStateHash = await sha256Hex(canonicalize(signerState));
          const committedAt = new Date().toISOString();

          await supabase
            .from('workflow_signers')
            .update({
              signer_state_hash: signerStateHash,
              signer_state_version: 1,
              signer_state_committed_at: committedAt,
              signature_capture_hash: signatureCaptureHash
            })
            .eq('id', signer.id);

          await appendCanonicalEvent(
            supabase as any,
            {
              event_type: 'signature.state.committed',
              workflow_id: signer.workflow_id,
              signer_id: signer.id,
              payload: {
              signer_state_hash: signerStateHash,
              schema_hash: (workflow as any)?.fields_schema_hash ?? null,
              schema_version: (workflow as any)?.fields_schema_version ?? 1
            }
          },
            'apply-signer-signature'
          );
        }
      } catch (stateErr) {
        console.warn('signer_state_hash: compute failed (best-effort)', stateErr)
      }

      // ECO snapshot (immediate) + proofs rápidas (best-effort, never block)
      try {
        const witnessHash = witnessHashForEvent || null
        let sourceHash: string | null = null
        let witnessCurrent: string | null = witnessHash
        if (workflow.document_entity_id) {
          const { data: entityRow } = await supabase
            .from('document_entities')
            .select('source_hash, witness_hash, witness_current_hash')
            .eq('id', workflow.document_entity_id)
            .single()
          sourceHash = (entityRow as any)?.source_hash ?? null
          witnessCurrent = (entityRow as any)?.witness_current_hash ?? (entityRow as any)?.witness_hash ?? witnessHash
        }

        const canonicalWitnessHash = witnessHashForEvent || witnessCurrent || null
        const proofs = await Promise.all([
          attemptTsaProof({ witness_hash: canonicalWitnessHash || '', timeout_ms: 3000 }),
          attemptRekorProof({
            witness_hash: canonicalWitnessHash || '',
            workflow_id: signer.workflow_id,
            signer_id: signer.id,
            timeout_ms: 3000
          })
        ])

        const normalizedProofs = proofs.map((proof: any) => ({
          ...proof,
          witness_hash: canonicalWitnessHash || null
        }))

        // CAI-INV-001 / CAI-INV-002: ECO witness integrity + proofs seal same artifact.
        if (!canonicalWitnessHash) {
          throw new Error('cai_invariant_failed:missing_witness_hash')
        }
        const mismatch = normalizedProofs.find((p: any) => p?.witness_hash && p.witness_hash !== canonicalWitnessHash)
        if (mismatch) {
          throw new Error('cai_invariant_failed:proof_witness_mismatch')
        }

        const issuedAt = new Date().toISOString()
        let stepTotal: number | null = null
        try {
          const { count } = await supabase
            .from('workflow_signers')
            .select('id', { count: 'exact', head: true })
            .eq('workflow_id', signer.workflow_id)
          stepTotal = typeof count === 'number' ? count : null
        } catch (countErr) {
          console.warn('apply-signer-signature: failed to count workflow signers', countErr)
        }

        let signatureCaptureKind: string | null = null
        let signatureRenderHash: string | null = null
        if (signatureData && typeof signatureData === 'object') {
          signatureCaptureKind = typeof signatureData.type === 'string' ? signatureData.type : null
          if (typeof signatureData.dataUrl === 'string') {
            signatureRenderHash = await sha256Hex(signatureData.dataUrl)
          }
        } else if (typeof signatureData === 'string') {
          signatureCaptureKind = 'typed'
          signatureRenderHash = await sha256Hex(signatureData)
        }

        const ecoSnapshot = {
          format: 'eco',
          format_version: '2.0',
          version: 'eco.v2',
          issued_at: issuedAt,
          evidence_declaration: {
            type: 'digital_signature_evidence',
            document_name: workflow.original_filename || null,
            signer_email: signer.email ?? null,
            signer_name: signer.name ?? null,
            signing_step: signer.signing_order ?? null,
            total_steps: stepTotal,
            signed_at: issuedAt,
            identity_assurance_level: identity_level || null,
            summary: [
              'Document integrity preserved',
              'Signature recorded',
              'Evidence is self-contained',
              'Independent verification possible'
            ]
          },
          trust_summary: {
            checks: [
              'Document integrity preserved',
              'Signature recorded',
              'Timestamped (TSA) when available',
              'Evidence is self-contained'
            ]
          },
          document: {
            id: workflow.document_entity_id ?? null,
            name: workflow.original_filename || null,
            mime: 'application/pdf',
            source_hash: sourceHash,
            witness_hash: canonicalWitnessHash
          },
          signing_act: {
            signer_id: signer.id,
            signer_email: signer.email ?? null,
            signer_display_name: signer.name ?? null,
            step_index: signer.signing_order ?? null,
            step_total: stepTotal,
            signed_at: issuedAt
          },
          signer: {
            id: signer.id,
            email: signer.email ?? null,
            name: signer.name ?? null
          },
          fields: {
            schema_hash: (workflow as any)?.fields_schema_hash ?? null,
            schema_version: (workflow as any)?.fields_schema_version ?? 1,
            signer_state_hash: signerStateHash,
            signer_state_version: 1
          },
          signature_capture: {
            present: Boolean(signatureData),
            stored: false,
            consent: true,
            capture_kind: signatureCaptureKind,
            render_hash: signatureRenderHash,
            strokes_hash: null,
            ciphertext_hash: null
          },
          proofs: normalizedProofs,
          system: {
            signature_capture_hash: signatureCaptureHash
          }
        }

        const ecoJson = JSON.stringify(ecoSnapshot, null, 2)
        const witnessKey = canonicalWitnessHash || witnessHash || 'unknown'
        ecoSnapshotPath = `evidence/${workflow.id}/${signer.id}/${witnessKey}.eco.json`

        const { error: ecoUploadErr } = await supabase.storage
          .from('artifacts')
          .upload(ecoSnapshotPath, new Blob([ecoJson], { type: 'application/json' }), {
            upsert: true,
            contentType: 'application/json'
          })

        if (ecoUploadErr) {
          console.warn('ECO snapshot upload failed', ecoUploadErr)
          ecoSnapshotPath = null
        } else {
          const { data: signedEco } = await supabase.storage
            .from('artifacts')
            .createSignedUrl(ecoSnapshotPath, 60 * 60)
          ecoSnapshotUrl = signedEco?.signedUrl ?? null

          await appendCanonicalEvent(
            supabase as any,
            {
              event_type: 'eco.snapshot.issued',
              workflow_id: signer.workflow_id,
              signer_id: signer.id,
              payload: {
                eco_path: ecoSnapshotPath,
                witness_hash: canonicalWitnessHash || null
              }
            },
            'apply-signer-signature'
          )
        }
      } catch (ecoErr) {
        console.warn('ECO snapshot generation failed (best-effort)', ecoErr)
      }

      // Ensure document.protected.requested exists for TSA pipeline (idempotent).
      if (workflow.document_entity_id) {
        try {
          const { data: existingEntity } = await supabase
            .from('document_entities')
            .select('events')
            .eq('id', workflow.document_entity_id)
            .single()

          const eventsArr = Array.isArray((existingEntity as any)?.events) ? (existingEntity as any).events : []
          const alreadyRequested = eventsArr.some((e: any) => e?.kind === 'document.protected.requested')
          if (!alreadyRequested) {
            const cfg = (workflow as any)?.forensic_config ?? {}
            await appendEvent(
              supabase as any,
              workflow.document_entity_id,
              {
                kind: 'document.protected.requested',
                at: new Date().toISOString(),
                payload: {
                  document_entity_id: workflow.document_entity_id,
                  workflow_id: workflow.id,
                  protection: [
                    'tsa',
                    ...(cfg?.polygon ? ['polygon'] : []),
                    ...(cfg?.bitcoin ? ['bitcoin'] : []),
                  ],
                  protection_details: {
                    signature_type: 'legal',
                    forensic_enabled: true,
                    tsa_requested: true,
                    polygon_requested: Boolean(cfg?.polygon),
                    bitcoin_requested: Boolean(cfg?.bitcoin)
                  }
                }
              },
              'apply-signer-signature'
            )
          }
        } catch (protectErr) {
          console.warn('apply-signer-signature: document.protected.requested append failed', protectErr)
        }
      }

      // Enqueue TSA job for this witness hash (always, per signer).
      if (workflow.document_entity_id) {
        try {
          await supabase
            .from('executor_jobs')
            .insert({
              type: 'run_tsa',
              entity_type: 'document',
              entity_id: workflow.document_entity_id,
              correlation_id: workflow.document_entity_id,
              dedupe_key: `${workflow.document_entity_id}:run_tsa:${hashHex}`,
              payload: {
                document_entity_id: workflow.document_entity_id,
                witness_hash: hashHex,
                workflow_id: workflow.id,
                signer_id: signer.id
              },
              status: 'queued',
              run_at: new Date().toISOString()
            })
        } catch (tsaErr) {
          console.warn('apply-signer-signature: failed to enqueue run_tsa', tsaErr)
        }
      }

      // Override witness hash for downstream events.
      witnessHashForEvent = hashHex
    }

    // Insert canonical event: use existing event_type allowed by DB
    const eventPayload = {
      witness_pdf_hash: witnessHashForEvent,
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
            witness_pdf_hash: eventPayload.witness_pdf_hash || null,
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

    let nextSignerRecord: any | null = null
    let isLastSigner = false
    // Determine if this was the last signer (independent of delivery mode).
    try {
      const { data: remainingSigners } = await supabase
        .from('workflow_signers')
        .select('id')
        .eq('workflow_id', signer.workflow_id)
        .in('status', ['created', 'invited', 'accessed', 'verified', 'ready_to_sign'])
      isLastSigner = !remainingSigners || remainingSigners.length === 0
    } catch (lastErr) {
      console.warn('apply-signer-signature: failed to resolve last signer flag', lastErr)
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
          nextSignerRecord = nextSigner
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

    // If there is no next signer, enqueue workflow_completed_simple for owner + signers.
    if (!nextSignerRecord) {
      isLastSigner = true
      try {
        const workflowTitle = workflow.original_filename || 'Documento'
        const { data: owner } = await supabase
          .from('auth.users')
          .select('email')
          .eq('id', workflow.owner_id)
          .maybeSingle()

        const { data: allSigners } = await supabase
          .from('workflow_signers')
          .select('id, email')
          .eq('workflow_id', signer.workflow_id)

        const recipients = new Map<string, { email: string; signer_id?: string | null; recipient_type: 'owner' | 'signer' }>()
        if (owner?.email) {
          recipients.set(owner.email, { email: owner.email, recipient_type: 'owner' })
        }
        for (const s of allSigners ?? []) {
          if (!s?.email) continue
          if (!recipients.has(s.email)) {
            recipients.set(s.email, { email: s.email, recipient_type: 'signer', signer_id: s.id })
          }
        }

        const notifications = Array.from(recipients.values()).map((r) => ({
          workflow_id: signer.workflow_id,
          recipient_email: r.email,
          recipient_type: r.recipient_type,
          signer_id: r.signer_id ?? null,
          notification_type: 'workflow_completed_simple',
          step: 'completion_notice',
          subject: '✅ Proceso de firmas completado',
          body_html: `
            <h2 style="font-family:Arial,sans-serif;color:#0f172a;margin:0 0 12px;">Proceso completado</h2>
            <p style="font-family:Arial,sans-serif;color:#334155;margin:0 0 12px;">
              El documento <strong>${workflowTitle}</strong> ha sido firmado por todos los participantes.
            </p>
            <p style="font-family:Arial,sans-serif;color:#0f172a;font-weight:600;margin:16px 0 0;">EcoSign. Transparencia que acompaña.</p>
          `,
          delivery_status: 'pending'
        }))

        if (notifications.length > 0) {
          await supabase.from('workflow_notifications').insert(notifications)
        }
      } catch (completionErr) {
        console.warn('apply-signer-signature: workflow_completed_simple enqueue failed (best-effort)', completionErr)
      }
    }

    // Trigger email delivery for any newly created pending notifications (best-effort).
    await triggerEmailDelivery(supabase as any)

    // Signed PDF download URL (best-effort)
    let pdfUrl: string | null = null
    try {
      const pdfPath = signedPdfPath || workflow.document_path
      if (pdfPath) {
        if (/^https?:\/\//i.test(pdfPath)) {
          pdfUrl = pdfPath
        } else {
          const { data: signedPdf } = await supabase.storage
            .from('user-documents')
            .createSignedUrl(pdfPath, 60 * 60)
          pdfUrl = signedPdf?.signedUrl ?? null
        }
      }
    } catch (pdfUrlErr) {
      console.warn('apply-signer-signature: failed to create PDF signed url', pdfUrlErr)
    }

    return json({
      success: true,
      pdf_url: pdfUrl,
      eco_url: ecoSnapshotUrl,
      eco_path: ecoSnapshotPath,
      is_last_signer: isLastSigner
    })

  } catch (err: any) {
    console.error('apply-signer-signature error', err)
    return json({ error: err?.message || 'Unexpected error' }, 500)
  }
})
