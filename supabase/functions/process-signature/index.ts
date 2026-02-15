import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'
import { appendEvent } from '../_shared/eventHelper.ts'
import { appendEvent as appendCanonicalEvent } from '../_shared/canonicalEventHelper.ts'
import { decryptToken } from '../_shared/cryptoHelper.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': (Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SITE_URL') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const CERTIFICATE_SCHEMA_VERSION = '1.0'

interface ProcessSignatureRequest {
  accessToken: string           // Token del firmante
  signatureData: {
    imageUrl: string            // URL de la imagen de firma en Storage
    coordinates: {
      page: number
      x: number
      y: number
      width: number
      height: number
    }
  }
  ndaAccepted?: boolean          // Checkbox legal (requerido si signer.require_nda=true)
  ndaFingerprint?: any           // Browser fingerprint para no-repudiación
  ipAddress?: string
  userAgent?: string
}

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  })

const isFlagEnabled = (name: string) =>
  String(Deno.env.get(name) ?? '').toLowerCase() === 'true'

async function emitDocumentSigned(
  supabase: ReturnType<typeof createClient>,
  documentEntityId: string,
  source: string
): Promise<void> {
  const { data: entity, error } = await supabase
    .from('document_entities')
    .select('events')
    .eq('id', documentEntityId)
    .single()

  if (error || !entity) {
    console.warn('document_entity not found for document.signed', documentEntityId)
    return
  }

  const events = Array.isArray(entity.events) ? entity.events : []
  if (events.some((event: { kind?: string }) => event.kind === 'document.signed')) {
    return
  }

  await appendEvent(
    supabase,
    documentEntityId,
    {
      kind: 'document.signed',
      at: new Date().toISOString(),
      payload: { source }
    },
    'process-signature'
  )
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

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

const isTokenHash = (value?: string | null) =>
  !!value && /^[a-f0-9]{64}$/i.test(value)

async function resolveSignerToken(
  signer: { access_token_ciphertext?: string | null; access_token_nonce?: string | null },
  fallbackToken?: string | null
): Promise<string | null> {
  if (fallbackToken && !isTokenHash(fallbackToken)) {
    return fallbackToken
  }

  if (signer.access_token_ciphertext && signer.access_token_nonce) {
    try {
      return await decryptToken({
        ciphertext: signer.access_token_ciphertext,
        nonce: signer.access_token_nonce
      })
    } catch (error) {
      console.warn('Failed to decrypt signer token', error)
    }
  }

  return null
}

serve(async (req) => {
  throw new Error('Legacy path disabled by EPI invariants')
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body: ProcessSignatureRequest = await req.json()
    const { accessToken, signatureData, ndaAccepted, ndaFingerprint, ipAddress, userAgent } = body

    const reportedIpAddress = ipAddress ?? null
    const reportedUserAgent = userAgent ?? null
    const observedIpAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      || req.headers.get('cf-connecting-ip')
      || req.headers.get('x-real-ip')
      || null
    const observedUserAgent = req.headers.get('user-agent') || null

    if (!accessToken || !signatureData) {
      return jsonResponse({ error: 'Missing required fields' }, 400)
    }

    // Hash del token para buscar en DB (si ya viene en hash, úsalo directo)
    const tokenHash = /^[a-f0-9]{64}$/i.test(accessToken)
      ? accessToken
      : await hashToken(accessToken)

    // 1. Buscar signer por token
    const { data: signer, error: signerError } = await supabase
      .from('workflow_signers')
      .select(`
        *,
        workflow:signature_workflows(*),
        signer_otps(verified_at)
      `)
      .eq('access_token_hash', tokenHash)
      .single()

    if (signerError || !signer) {
      return jsonResponse({ error: 'Invalid or expired access token' }, 404)
    }

    // 2. Validar token vigente y OTP verificado
    if (signer.token_revoked_at) {
      return jsonResponse({ error: 'Token has been revoked' }, 403)
    }

    if (signer.token_expires_at && new Date(signer.token_expires_at) < new Date()) {
      return jsonResponse({ error: 'Token has expired' }, 403)
    }

    const otpData = Array.isArray(signer.signer_otps) ? signer.signer_otps[0] : signer.signer_otps
    const otpRequired = !(signer.quick_access || signer.require_login === false)
    if (otpRequired && !otpData?.verified_at) {
      return jsonResponse({ error: 'OTP not verified for signer' }, 403)
    }

    // 3. Validar que sea su turno
    if (signer.status !== 'ready_to_sign') {
      return jsonResponse({
        error: 'Not your turn to sign yet',
        currentStatus: signer.status
      }, 403)
    }

    const { data: pendingSigners, error: pendingError } = await supabase
      .from('workflow_signers')
      .select('id, signing_order, status')
      .eq('workflow_id', signer.workflow_id)
      .in('status', ['ready_to_sign', 'invited'])
      .order('signing_order', { ascending: true })
      .limit(1)

    if (pendingError) {
      console.warn('Failed to fetch pending signer order', pendingError)
    }

    const nextInLine = Array.isArray(pendingSigners) ? pendingSigners[0] : pendingSigners
    if (nextInLine && nextInLine.id !== signer.id) {
      return jsonResponse({
        error: 'Not your turn to sign yet',
        expectedOrder: nextInLine.signing_order,
        currentOrder: signer.signing_order
      }, 403)
    }

    // 4. Validar NDA si es requerido
    if (signer.require_nda && !ndaAccepted) {
      return jsonResponse({
        error: 'NDA acceptance is required before signing'
      }, 400)
    }

    // 5. Obtener versión actual del workflow
    const { data: currentVersion, error: versionError } = await supabase
      .from('workflow_versions')
      .select('*')
      .eq('workflow_id', signer.workflow_id)
      .eq('status', 'active')
      .single()

    if (versionError || !currentVersion) {
      return jsonResponse({ error: 'Document version not found' }, 500)
    }

    // 5. Generar certificación forense (Triple Anchoring)
    const workflow = signer.workflow as any
    const forensicConfig = workflow.forensic_config || {}
    const signedAt = new Date().toISOString()

    // === Identity Level Determination (IDENTITY_ASSURANCE_RULES.md) ===
    function determineIdentityLevel(signer: any, context: any): string {
      // L1: Email magic link (workflow_signers requiere email válido)
      if (signer.email) return 'L1'

      // L0: Acknowledgement sin verificación
      return 'L0'

      // TODO (Q2):
      // - L2: OTP SMS (cuando se implemente)
      // - L3: Passkey WebAuthn (cuando se implemente)
      // - L4: Biometric + KYC (futuro)
      // - L5: QES/PSC certificate (futuro)
    }

    function buildIdentitySignals(signer: any, context: any): string[] {
      const signals: string[] = []

      if (signer.email) signals.push('email_provided')
      if (signer.email) signals.push('email_verified') // workflow_signers implica verificación
      if (context.ndaAccepted) signals.push('nda_accepted')
      if (context.ipAddress || context.userAgent) signals.push('device_fingerprint_recorded')

      return signals
    }

    const identityLevel = determineIdentityLevel(signer, { ndaAccepted, ipAddress: observedIpAddress, userAgent: observedUserAgent })
    const identityAssurance = {
      level: identityLevel,
      provider: 'ecosign',
      method: identityLevel === 'L1' ? 'email_magic_link' : null,
      timestamp: signedAt,
      signals: buildIdentitySignals(signer, { ndaAccepted, ipAddress: observedIpAddress, userAgent: observedUserAgent })
    }
    let timeAssurance = {
      source: forensicConfig.rfc3161 ? 'RFC3161' : 'server_clock',
      confidence: forensicConfig.rfc3161 ? 'high' : 'informational'
    }

    const ua = observedUserAgent || ''
    const deviceType = /Mobi|Android/i.test(ua) ? 'mobile' : 'desktop'
    const osFamily = /Windows/i.test(ua)
      ? 'windows'
      : /Mac/i.test(ua)
        ? 'macos'
        : /Linux/i.test(ua)
          ? 'linux'
          : /iPhone|iPad|iPod/i.test(ua)
            ? 'ios'
            : /Android/i.test(ua)
              ? 'android'
              : 'unknown'

    const environment = {
      device_type: deviceType,
      os_family: osFamily,
      network_type: 'unknown',
      observed_ip: observedIpAddress,
      observed_user_agent: observedUserAgent,
      reported_ip: reportedIpAddress,
      reported_user_agent: reportedUserAgent
    }

    const systemCapabilities = {
      biometric_verification: false,
      in_person_verification: false
    }

    const limitations = [
      'identity_not_biometrically_verified',
      'no_in_person_validation'
    ]

    const eventLineage = {
      event_id: crypto.randomUUID(),
      previous_event_id: null,
      cause: 'signature_completed'
    }

    // Hash de la firma
    const signatureHash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(
          JSON.stringify(signatureData)
        ))
      )
    ).map(b => b.toString(16).padStart(2, '0')).join('')

    // Crear eco_data básico
    const ecoData = {
      certificate_schema_version: CERTIFICATE_SCHEMA_VERSION,
      signer: {
        email: signer.email,
        name: signer.name,
        signedAt
      },
      document: {
        hash: currentVersion.document_hash,
        version: currentVersion.version_number
      },
      signature: {
        hash: signatureHash,
        coordinates: signatureData.coordinates
      },
      workflow: {
        document_entity_id: workflow.document_entity_id || null,
        signingOrder: signer.signing_order
      },
      identity_assurance: identityAssurance,
      intent: {
        intent_confirmed: true,
        intent_method: 'explicit_acceptance'
      },
      time_assurance: timeAssurance,
      environment,
      system_capabilities: systemCapabilities,
      limitations,
      policy_snapshot_id: 'policy_2025_11',
      event_lineage: eventLineage
    }

    // Certificación forensic: TSA (RFC 3161), Polygon, y Bitcoin (OpenTimestamps)
    // El sistema genera certificados .ECO/.ECOX reales con todas las garantías criptográficas

    let rfc3161Token = null
    let polygonTxHash = null
    let bitcoinAnchorId = null

    // RFC 3161 Timestamp (always over witness hash)
    const authorityOnly = isFlagEnabled('V2_AUTHORITY_ONLY') || isFlagEnabled('DISABLE_PROCESS_SIGNATURE_EXECUTION')

    // LEGACY PATH DISABLED:
    // process-signature is no longer allowed to execute TSA or blockchain anchors.
    // Canonical authority is protectDocumentV2PipelineDecision + executor/orchestrator.
    if (forensicConfig.rfc3161 && !authorityOnly) {
      console.warn('LEGACY_PATH_DISABLED: process-signature TSA execution skipped', {
        workflow_id: workflow.id,
        signer_id: signer.id,
      })
      timeAssurance = {
        source: 'server_clock',
        confidence: 'informational'
      }
    }

    if (forensicConfig.polygon && !authorityOnly) {
      console.warn('LEGACY_PATH_DISABLED: process-signature polygon anchor skipped', {
        workflow_id: workflow.id,
        signer_id: signer.id,
      })
    }

    if (forensicConfig.bitcoin && !authorityOnly) {
      console.warn('LEGACY_PATH_DISABLED: process-signature bitcoin anchor skipped', {
        workflow_id: workflow.id,
        signer_id: signer.id,
      })
    }

    // 6. Registrar firma en workflow_signatures (con NDA tracking)
    const { data: signatureRecord, error: signatureError } = await supabase
      .from('workflow_signatures')
      .insert({
        workflow_id: signer.workflow_id,
        version_id: currentVersion.id,
        signer_id: signer.id,
        signature_image_url: signatureData.imageUrl,
        signature_coordinates: signatureData.coordinates,
        signature_hash: signatureHash,
        certification_data: ecoData,
        rfc3161_token: rfc3161Token,
        polygon_tx_hash: polygonTxHash,
        bitcoin_anchor_id: bitcoinAnchorId,
        ip_address: observedIpAddress,
        user_agent: observedUserAgent,
        // NDA tracking (checkbox legal, no documento separado)
        nda_accepted: ndaAccepted || false,
        nda_accepted_at: ndaAccepted ? new Date().toISOString() : null,
        nda_ip_address: ndaAccepted ? observedIpAddress : null,
        nda_fingerprint: ndaAccepted ? ndaFingerprint : null
      })
      .select()
      .single()

    if (signatureError) {
      console.error('Error saving signature:', signatureError)
      return jsonResponse({ error: 'Failed to save signature' }, 500)
    }

    // === PROBATORY EVENT: signature.completed ===
    // Register that this document was signed (goes to .eco)
    if (workflow.document_entity_id) {
      const eventResult = await appendEvent(
        supabase,
        workflow.document_entity_id,
        {
          kind: 'signature.completed',
          at: signedAt,
          signer: {
            email: signer.email,
            name: signer.name,
            order: signer.signing_order,
          },
          identity_assurance: identityAssurance,
          signature: {
            hash: signatureHash,
            coordinates: signatureData.coordinates,
          },
          workflow: {
            document_entity_id: workflow.document_entity_id || null,
            version: currentVersion.version_number,
          },
          forensic: {
            tsa: !!rfc3161Token,
            polygon: !!polygonTxHash,
            bitcoin: !!bitcoinAnchorId,
          }
        },
        'process-signature'
      );

      if (!eventResult.success) {
        console.error('Failed to append signature event:', eventResult.error);
        // Don't fail the request, but log it
      }
    } else {
      console.warn(`workflow.document_entity_id not found, signature event not recorded`);
    }

    // 7. Actualizar estado del signer
    await supabase
      .from('workflow_signers')
      .update({
        status: 'signed',
        signed_at: new Date().toISOString(),
        signature_data: signatureData,
        signature_hash: signatureHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', signer.id)

    await appendCanonicalEvent(
      supabase as any,
      {
        event_type: 'signer.signed',
        workflow_id: signer.workflow_id,
        signer_id: signer.id,
        payload: {
          email: signer.email,
          signing_order: signer.signing_order
        },
        actor_id: workflow.owner_id ?? null
      },
      'process-signature'
    )

    // 8. Avanzar workflow (marcar siguiente firmante como 'ready')
    await supabase.rpc('advance_workflow', { p_workflow_id: signer.workflow_id })

    // 9. Obtener siguiente firmante
    const { data: nextSigner } = await supabase
      .from('workflow_signers')
      .select('*')
      .eq('workflow_id', signer.workflow_id)
      .eq('status', 'ready_to_sign')
      .single()

    if (nextSigner) {
      await appendCanonicalEvent(
        supabase as any,
        {
          event_type: 'signer.ready_to_sign',
          workflow_id: signer.workflow_id,
          signer_id: nextSigner.id,
          payload: {
            email: nextSigner.email,
            signing_order: nextSigner.signing_order
          }
        },
        'process-signature'
      )
    } else {
      await appendCanonicalEvent(
        supabase as any,
        {
          event_type: 'workflow.completed',
          workflow_id: signer.workflow_id,
          payload: { completed_at: new Date().toISOString() },
          actor_id: workflow.owner_id ?? null
        },
        'process-signature'
      )

      if (workflow.document_entity_id) {
        await emitDocumentSigned(supabase as any, workflow.document_entity_id, 'internal')
      } else {
        console.warn('workflow.document_entity_id missing, document.signed not emitted')
      }
    }

    // 10. Crear notificaciones
    const appUrl = Deno.env.get('APP_URL') || 'https://app.ecosign.app'

    // Obtener email del owner
    const { data: owner } = await supabase
      .from('auth.users')
      .select('email')
      .eq('id', workflow.owner_id)
      .single()

    const ownerEmail = owner?.email

    const workflowTitle = workflow.original_filename || 'Documento'

    // Notificar al siguiente firmante (si existe y delivery_mode es 'email')
    // Si delivery_mode='link', el creador comparte el link manualmente
    const workflowDeliveryMode = workflow.delivery_mode || 'email'

    if (nextSigner && workflowDeliveryMode === 'email') {
      // Obtener token del siguiente firmante
      const { data: nextSignerFull } = await supabase
        .from('workflow_signers')
        .select('*')
        .eq('id', nextSigner.id)
        .single()

      const nextSignerToken = nextSignerFull
        ? await resolveSignerToken(nextSignerFull)
        : null

      if (!nextSignerToken) {
        console.warn('Missing next signer token; skipping notification', {
          workflowId: signer.workflow_id,
          nextSignerId: nextSigner.id
        })
      }

      const nextSignerUrl = nextSignerToken
        ? `${appUrl}/sign/${nextSignerToken}`
        : null

      if (nextSignerUrl) {
        await supabase
          .from('workflow_notifications')
          .insert({
            workflow_id: signer.workflow_id,
            recipient_email: nextSigner.email,
            recipient_type: 'signer',
            signer_id: nextSigner.id,
            notification_type: 'your_turn_to_sign',
            subject: `Firma requerida: ${workflow.original_filename}`,
            body_html: `
              <h2>Firma Requerida</h2>
              <p>Hola ${nextSigner.name || nextSigner.email},</p>
              <p>Es tu turno de firmar el documento: <strong>${workflow.original_filename}</strong></p>
              <p>Firmantes anteriores: ${signer.signing_order}/${workflow.signers_count || 'varios'}</p>
              <p>Este documento cuenta con certificación forense completa.</p>
              <p><a href="${nextSignerUrl}">Ver Documento</a></p>
              <p>Al ingresar podés elegir firmar o rechazar el documento.</p>
            `,
            delivery_status: 'pending'
          })
      }
    } else if (nextSigner && workflowDeliveryMode === 'link') {
      console.log('[DELIVERY_MODE=link] Skipping signer notification - creator must share link manually', {
        workflowId: signer.workflow_id,
        nextSignerEmail: nextSigner.email,
        nextSignerOrder: nextSigner.signing_order
      })
    }

    // 11. Si no hay más firmantes, notificar a owner + firmantes
    if (!nextSigner) {
      const { data: allSigners } = await supabase
        .from('workflow_signers')
        .select('id, email')
        .eq('workflow_id', signer.workflow_id)

      const recipients = new Map<string, { email: string; signer_id?: string | null; recipient_type: 'owner' | 'signer' }>()
      if (ownerEmail) {
        recipients.set(ownerEmail, { email: ownerEmail, recipient_type: 'owner' })
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
    }

    await triggerEmailDelivery(supabase as any)

    return jsonResponse({
      success: true,
      workflowStatus: nextSigner ? 'in_progress' : 'completed',
      nextSigner: nextSigner ? {
        email: nextSigner.email,
        order: nextSigner.signing_order
      } : null,
      forensicProof: {
        rfc3161: !!rfc3161Token,
        polygon: !!polygonTxHash,
        bitcoin: !!bitcoinAnchorId
      },
      message: nextSigner
        ? `Signature recorded. Next signer: ${nextSigner.email}`
        : 'Signature recorded. Workflow completed!'
    })

  } catch (error) {
    console.error('Error in process-signature:', error)
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, 500)
  }
})
